import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Awards XP and badges after a clip session completes.
 * Called from the frontend after EndSession returns scores.
 * Handles: base XP, performance bonuses, streak bonuses, milestone bonuses.
 * Pace bonuses are checked separately via CheckPaceBonus.
 */
export default api({
  name: "AwardXP",
  description: "Awards XP and badges based on clip session results",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    clipId: z.string().uuid(),
    sessionId: z.string().uuid(),
    trailMarkerCorrect: z.number().int().min(0).max(5),
    trailMarkerTotal: z.number().int().min(0).max(5),
    passedFirstPass: z.boolean(),
    searchRescueTriggered: z.boolean(),
    searchRescueScore: z.number().int().nullable(),
    searchRescueTotal: z.number().int().nullable(),
    weatherStormTriggered: z.boolean(),
    totalTimeSeconds: z.number(),
    clipDurationSeconds: z.number(),
  }),

  output: z.object({
    xpAwarded: z.number(),
    badgesEarned: z.array(z.object({
      badgeId: z.string(),
      name: z.string(),
      emoji: z.string(),
      xp: z.number(),
    })),
    totalXp: z.number(),
    newTier: z.object({
      tier: z.number(),
      name: z.string(),
      emoji: z.string(),
    }).nullable(),
  }),

  async run(ctx, input) {
    const { viewerId, clipId, trailMarkerCorrect, trailMarkerTotal, passedFirstPass,
      searchRescueTriggered, searchRescueScore, searchRescueTotal,
      weatherStormTriggered, totalTimeSeconds, clipDurationSeconds } = input;

    // Check if viewer is admin — admins don't earn XP
    const AdminCheckSchema = z.object({ is_admin: z.boolean() });
    const adminCheck = await ctx.integrations.db.query(
      "SELECT COALESCE(is_admin, false) as is_admin FROM cliptracker_v2_viewers WHERE id = $1",
      AdminCheckSchema,
      [viewerId],
      { label: "Check if viewer is admin" }
    );
    if (adminCheck[0]?.is_admin) {
      ctx.log.info("Admin viewer — skipping XP award", { viewerId });
      return { xpAwarded: 0, badgesEarned: [], totalXp: 0, newTier: null };
    }

    const xpEvents: Array<{ sourceId: string; eventType: string; xp: number }> = [];
    const badgesEarned: Array<{ badgeId: string; name: string; emoji: string; xp: number }> = [];

    // === BASE XP ===
    // Watch clip (always 3 XP if session completed)
    xpEvents.push({ sourceId: "watch", eventType: "base", xp: 3 });

    // Trail Markers score
    if (trailMarkerCorrect === 5) {
      xpEvents.push({ sourceId: "trail_markers_5", eventType: "base", xp: 5 });
    } else if (trailMarkerCorrect === 4) {
      xpEvents.push({ sourceId: "trail_markers_4", eventType: "base", xp: 3 });
    } else if (trailMarkerCorrect === 3) {
      xpEvents.push({ sourceId: "trail_markers_3", eventType: "base", xp: 1 });
    }

    // First pass unlock (no S&R triggered)
    if (passedFirstPass && !searchRescueTriggered) {
      xpEvents.push({ sourceId: "first_pass_unlock", eventType: "base", xp: 4 });
    }

    // Pass Search & Rescue
    if (searchRescueTriggered && searchRescueScore !== null && searchRescueTotal !== null) {
      const srPercent = searchRescueTotal > 0 ? (searchRescueScore / searchRescueTotal) * 100 : 0;
      if (srPercent >= 80) {
        xpEvents.push({ sourceId: "pass_search_rescue", eventType: "base", xp: 2 });
      }
    }

    // Complete Weather the Storm timer
    if (weatherStormTriggered) {
      xpEvents.push({ sourceId: "weather_storm_complete", eventType: "base", xp: 1 });
    }

    // === PERFORMANCE BONUSES ===
    // Perfect Hiker: 5/5 Trail Markers + no S&R
    if (trailMarkerCorrect === 5 && !searchRescueTriggered) {
      xpEvents.push({ sourceId: "perfect_hiker", eventType: "performance", xp: 8 });
      badgesEarned.push({ badgeId: "perfect_hiker", name: "Perfect Hiker", emoji: "🌲", xp: 8 });
    }

    // Speed Hiker: completed in under video length + 5 minutes
    if (totalTimeSeconds < clipDurationSeconds + 300 && passedFirstPass) {
      xpEvents.push({ sourceId: "speed_hiker", eventType: "performance", xp: 5 });
      badgesEarned.push({ badgeId: "speed_hiker", name: "Speed Hiker", emoji: "🥾", xp: 5 });
    }

    // Search & Rescue Hero: Failed Trail Markers then scored 5/5 on S&R
    if (searchRescueTriggered && searchRescueScore === searchRescueTotal && searchRescueTotal !== null && searchRescueTotal > 0) {
      xpEvents.push({ sourceId: "search_and_rescue_hero", eventType: "performance", xp: 8 });
      badgesEarned.push({ badgeId: "search_and_rescue_hero", name: "Search & Rescue Hero", emoji: "🚁", xp: 8 });
    }

    // Storm Chaser: previously hit Weather the Storm, now passed first try
    if (passedFirstPass && !searchRescueTriggered) {
      const StormCheckSchema = z.object({ count: z.coerce.number() });
      const prevStorm = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_xp_events
         WHERE viewer_id = $1 AND source_id = 'weather_storm_complete'`,
        StormCheckSchema,
        [viewerId],
        { label: "Check previous weather storm" }
      );
      if (prevStorm[0]?.count > 0) {
        // Check that the immediately preceding clip had weather storm
        const PrevClipSchema = z.object({ clip_id: z.string() });
        const prevClips = await ctx.integrations.db.query(
          `SELECT clip_id::text FROM cliptracker_v2_xp_events
           WHERE viewer_id = $1 AND source_id = 'weather_storm_complete'
           ORDER BY created_at DESC LIMIT 1`,
          PrevClipSchema,
          [viewerId],
          { label: "Get last storm clip" }
        );
        if (prevClips.length > 0) {
          // Check if that clip is the previous clip by sort_order
          const SortOrderSchema = z.object({ sort_order: z.coerce.number() });
          const currentSort = await ctx.integrations.db.query(
            `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
            SortOrderSchema, [clipId], { label: "Current clip sort" }
          );
          const prevSort = await ctx.integrations.db.query(
            `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
            SortOrderSchema, [prevClips[0].clip_id], { label: "Prev storm clip sort" }
          );
          if (currentSort[0] && prevSort[0] && currentSort[0].sort_order === prevSort[0].sort_order + 1) {
            xpEvents.push({ sourceId: "storm_chaser", eventType: "performance", xp: 3 });
            badgesEarned.push({ badgeId: "storm_chaser", name: "Storm Chaser", emoji: "⛈️", xp: 3 });
          }
        }
      }
    }

    // === STREAK BONUSES (non-overlapping windows) ===
    // No Detours: 5 clips without S&R — max 3 awards
    // Windows: clips 1-5, 6-10, 11-15
    if (!searchRescueTriggered) {
      const StreakSchema = z.object({ sort_order: z.coerce.number() });
      const currentSort = await ctx.integrations.db.query(
        `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
        StreakSchema, [clipId], { label: "Streak - current sort" }
      );
      if (currentSort[0]) {
        const currentSortOrder = currentSort[0].sort_order;
        // Non-overlapping windows: award only at the END of each window (clip 5, 10, 15)
        const noDetourWindows = [5, 10, 15];
        if (noDetourWindows.includes(currentSortOrder)) {
          const windowStart = currentSortOrder - 4;
          // Check no S&R in this window
          const SrCheckSchema = z.object({ count: z.coerce.number() });
          const srClips = await ctx.integrations.db.query(
            `SELECT COUNT(*)::int as count
             FROM cliptracker_v2_xp_events xe
             JOIN cliptracker_v2_clips c ON c.id = xe.clip_id
             WHERE xe.viewer_id = $1 AND xe.source_id = 'pass_search_rescue'
             AND c.sort_order BETWEEN $2 AND $3`,
            SrCheckSchema,
            [viewerId, windowStart, currentSortOrder],
            { label: "Check No Detours window" }
          );
          // Also verify all 5 clips in window are completed
          const CompletedSchema = z.object({ count: z.coerce.number() });
          const completedInWindow = await ctx.integrations.db.query(
            `SELECT COUNT(DISTINCT c.id)::int as count
             FROM cliptracker_v2_xp_events xe
             JOIN cliptracker_v2_clips c ON c.id = xe.clip_id
             WHERE xe.viewer_id = $1 AND xe.source_id = 'watch'
             AND c.sort_order BETWEEN $2 AND $3`,
            CompletedSchema,
            [viewerId, windowStart, currentSortOrder - 1],
            { label: "Check completed in No Detours window" }
          );
          if (srClips[0]?.count === 0 && completedInWindow[0]?.count === 4) {
            const ExistingBadgeSchema = z.object({ count: z.coerce.number() });
            const existing = await ctx.integrations.db.query(
              `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
               WHERE viewer_id = $1 AND badge_id = 'no_detours' AND clip_id = $2`,
              ExistingBadgeSchema, [viewerId, clipId], { label: "Check existing no_detours" }
            );
            if (existing[0]?.count === 0) {
              xpEvents.push({ sourceId: "no_detours", eventType: "streak", xp: 10 });
              badgesEarned.push({ badgeId: "no_detours", name: "No Detours", emoji: "🧭", xp: 10 });
            }
          }
        }
      }
    }

    // Leave No Trace: 5/5 Trail Markers on 3 consecutive clips — max 5 awards
    // Windows: clips 1-3, 4-6, 7-9, 10-12, 13-15
    if (trailMarkerCorrect === 5) {
      const SortSchema = z.object({ sort_order: z.coerce.number() });
      const currentSort = await ctx.integrations.db.query(
        `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
        SortSchema, [clipId], { label: "LNT - current sort" }
      );
      if (currentSort[0]) {
        const cs = currentSort[0].sort_order;
        // Non-overlapping windows: award only at the END of each window (clip 3, 6, 9, 12, 15)
        const lntWindows = [3, 6, 9, 12, 15];
        if (lntWindows.includes(cs)) {
          const windowStart = cs - 2;
          // Check all 3 clips in window got 5/5
          const PerfectSchema = z.object({ count: z.coerce.number() });
          const perfectInWindow = await ctx.integrations.db.query(
            `SELECT COUNT(DISTINCT xe.clip_id)::int as count
             FROM cliptracker_v2_xp_events xe
             JOIN cliptracker_v2_clips c ON c.id = xe.clip_id
             WHERE xe.viewer_id = $1 AND xe.source_id = 'trail_markers_5'
             AND c.sort_order BETWEEN $2 AND $3`,
            PerfectSchema,
            [viewerId, windowStart, cs - 1],
            { label: "Check LNT window" }
          );
          if (perfectInWindow[0]?.count === 2) {
            const ExBadgeSchema = z.object({ count: z.coerce.number() });
            const ex = await ctx.integrations.db.query(
              `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
               WHERE viewer_id = $1 AND badge_id = 'leave_no_trace' AND clip_id = $2`,
              ExBadgeSchema, [viewerId, clipId], { label: "Check existing LNT" }
            );
            if (ex[0]?.count === 0) {
              xpEvents.push({ sourceId: "leave_no_trace", eventType: "streak", xp: 15 });
              badgesEarned.push({ badgeId: "leave_no_trace", name: "Leave No Trace", emoji: "🌱", xp: 15 });
            }
          }
        }
      }
    }

    // === MILESTONE BONUSES ===
    const ClipSortSchema = z.object({ sort_order: z.coerce.number() });
    const clipSort = await ctx.integrations.db.query(
      `SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1`,
      ClipSortSchema, [clipId], { label: "Get clip sort for milestones" }
    );
    const sortOrder = clipSort[0]?.sort_order ?? 0;

    // First Step: Complete Clip 1
    if (sortOrder === 1) {
      xpEvents.push({ sourceId: "first_step", eventType: "milestone", xp: 5 });
      badgesEarned.push({ badgeId: "first_step", name: "First Step", emoji: "🎬", xp: 5 });
    }

    // Halfway Up: Complete Clip 9
    if (sortOrder === 9) {
      xpEvents.push({ sourceId: "halfway", eventType: "milestone", xp: 15 });
      badgesEarned.push({ badgeId: "halfway", name: "Halfway Up", emoji: "🏔️", xp: 15 });
    }

    // Into the Summit Push: Clip 10 gets unlocked (completing clip 9 triggers this)
    if (sortOrder === 9) {
      xpEvents.push({ sourceId: "week_4_entry", eventType: "milestone", xp: 10 });
      badgesEarned.push({ badgeId: "week_4_entry", name: "Into the Summit Push", emoji: "🩢", xp: 10 });
    }

    // Summit Reached: Complete clip 17
    if (sortOrder === 17) {
      xpEvents.push({ sourceId: "summit", eventType: "milestone", xp: 25 });
      badgesEarned.push({ badgeId: "summit", name: "Summit Reached", emoji: "🏔️✨", xp: 25 });

      // Check for Ranger's Secret: never triggered Weather the Storm
      const StormSchema = z.object({ count: z.coerce.number() });
      const stormCheck = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_xp_events
         WHERE viewer_id = $1 AND source_id = 'weather_storm_complete'`,
        StormSchema, [viewerId], { label: "Check ranger secret" }
      );
      if (stormCheck[0]?.count === 0 && !weatherStormTriggered) {
        xpEvents.push({ sourceId: "mystery", eventType: "milestone", xp: 20 });
        badgesEarned.push({ badgeId: "mystery", name: "The Ranger's Secret", emoji: "🌲", xp: 20 });
      }
    }

    // === Double Summit: 2 clips in one calendar day ===
    const TodayCountSchema = z.object({ count: z.coerce.number() });
    const todayClips = await ctx.integrations.db.query(
      `SELECT COUNT(DISTINCT clip_id)::int as count
       FROM cliptracker_v2_xp_events
       WHERE viewer_id = $1 AND source_id = 'watch'
       AND created_at::date = CURRENT_DATE`,
      TodayCountSchema, [viewerId], { label: "Count today clips" }
    );
    // We already counted this clip's watch event above but it's not inserted yet
    // So if there's already >= 1 clip completed today, this makes it the 2nd
    if (todayClips[0]?.count >= 1) {
      // Cap at 8 total Double Summit awards across the program
      const TotalDsSchema = z.object({ count: z.coerce.number() });
      const totalDs = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
         WHERE viewer_id = $1 AND badge_id = 'double_summit'`,
        TotalDsSchema, [viewerId], { label: "Check total double summits" }
      );
      const ExDsSchema = z.object({ count: z.coerce.number() });
      const exDs = await ctx.integrations.db.query(
        `SELECT COUNT(*)::int as count FROM cliptracker_v2_badges
         WHERE viewer_id = $1 AND badge_id = 'double_summit'
         AND earned_at::date = CURRENT_DATE`,
        ExDsSchema, [viewerId, clipId], { label: "Check double summit today" }
      );
      if (exDs[0]?.count === 0 && (totalDs[0]?.count ?? 0) < 8) {
        xpEvents.push({ sourceId: "double_summit", eventType: "performance", xp: 5 });
        badgesEarned.push({ badgeId: "double_summit", name: "Double Summit", emoji: "⛰️", xp: 5 });
      }
    }

    // === INSERT XP EVENTS ===
    // But first — PACE BONUSES (requires knowing sort_order and ascent_day_1)
    const PaceSchema = z.object({ ascent_day_1: z.string().nullable() });
    const paceData = await ctx.integrations.db.query(
      `SELECT ascent_day_1::text FROM cliptracker_v2_viewers WHERE id = $1`,
      PaceSchema, [viewerId], { label: "Get ascent day 1 for pace" }
    );
    const ascentDay1 = paceData[0]?.ascent_day_1 ? new Date(paceData[0].ascent_day_1) : null;

    if (ascentDay1) {
      const now = new Date();
      const daysSinceStart = Math.floor((now.getTime() - ascentDay1.getTime()) / (1000 * 60 * 60 * 24));

      // On the Trail: +10 per pacing window completed on time
      // Week 2 (Clips 1-4 by day 7), Week 3 (Clips 5-9 by day 14), Week 4 (Clips 10-17 by day 28)
      const paceWindows = [
        { clips: [1, 2, 3, 4], deadline: 7, bonusId: "on_the_trail_week2" },
        { clips: [5, 6, 7, 8, 9], deadline: 14, bonusId: "on_the_trail_week3" },
        { clips: [10, 11, 12, 13, 14, 15, 16, 17], deadline: 28, bonusId: "on_the_trail_week4" },
      ];

      for (const window of paceWindows) {
        // Check if this clip is the LAST clip in a pacing window
        const lastInWindow = window.clips[window.clips.length - 1];
        if (sortOrder === lastInWindow && daysSinceStart <= window.deadline) {
          const ExPaceSchema = z.object({ count: z.coerce.number() });
          const existingPace = await ctx.integrations.db.query(
            `SELECT COUNT(*)::int as count FROM cliptracker_v2_xp_events
             WHERE viewer_id = $1 AND source_id = $2`,
            ExPaceSchema, [viewerId, window.bonusId], { label: `Check pace: ${window.bonusId}` }
          );
          if (existingPace[0]?.count === 0) {
            xpEvents.push({ sourceId: window.bonusId, eventType: "pace", xp: 10 });
            badgesEarned.push({ badgeId: "on_the_trail", name: "On the Trail", emoji: "🗓️", xp: 10 });
          }
        }
      }

      // The Ascent: Complete all 17 clips within 28 days
      if (sortOrder === 17 && daysSinceStart <= 28) {
        const ExAscentSchema = z.object({ count: z.coerce.number() });
        const existingAscent = await ctx.integrations.db.query(
          `SELECT COUNT(*)::int as count FROM cliptracker_v2_xp_events
           WHERE viewer_id = $1 AND source_id = 'the_ascent'`,
          ExAscentSchema, [viewerId], { label: "Check existing ascent bonus" }
        );
        if (existingAscent[0]?.count === 0) {
          xpEvents.push({ sourceId: "the_ascent", eventType: "pace", xp: 25 });
          badgesEarned.push({ badgeId: "the_ascent", name: "The Ascent", emoji: "🧗", xp: 25 });
        }
      }
    }

    // === NOW INSERT XP EVENTS ===
    let totalAwarded = 0;
    for (const event of xpEvents) {
      try {
        await ctx.integrations.db.execute(
          `INSERT INTO cliptracker_v2_xp_events (viewer_id, clip_id, event_type, source_id, xp_amount)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (viewer_id, source_id, clip_id) DO NOTHING`,
          [viewerId, clipId, event.eventType, event.sourceId, event.xp],
          { label: `Award XP: ${event.sourceId}` }
        );
        totalAwarded += event.xp;
      } catch (e) {
        // Duplicate — skip
        ctx.log.info(`XP event already exists: ${event.sourceId}`, { clipId });
      }
    }

    // === INSERT BADGES ===
    for (const badge of badgesEarned) {
      try {
        await ctx.integrations.db.execute(
          `INSERT INTO cliptracker_v2_badges (viewer_id, badge_id, clip_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (viewer_id, badge_id, clip_id) DO NOTHING`,
          [viewerId, badge.badgeId, clipId],
          { label: `Award badge: ${badge.badgeId}` }
        );
      } catch (e) {
        ctx.log.info(`Badge already earned: ${badge.badgeId}`, { clipId });
      }
    }

    // Get new total XP
    const NewTotalSchema = z.object({ total_xp: z.coerce.number() });
    const newTotal = await ctx.integrations.db.query(
      `SELECT COALESCE(SUM(xp_amount), 0)::int as total_xp
       FROM cliptracker_v2_xp_events WHERE viewer_id = $1`,
      NewTotalSchema, [viewerId], { label: "Get new total XP" }
    );
    const totalXp = newTotal[0]?.total_xp ?? 0;

    // Determine if tier changed
    const TIERS = [
      { tier: 1, name: "Base Camper", emoji: "🏕️" },
      { tier: 2, name: "Trailblazer", emoji: "🥾" },
      { tier: 3, name: "Summit Seeker", emoji: "🏔️" },
      { tier: 4, name: "Pinnacle Achiever", emoji: "🏔️✨" },
    ];
    const TIER_THRESHOLDS = [0, 150, 325, 500];
    const prevXp = totalXp - totalAwarded;
    const prevTierIdx = TIER_THRESHOLDS.reduce((acc, t, i) => prevXp >= t ? i : acc, 0);
    const newTierIdx = TIER_THRESHOLDS.reduce((acc, t, i) => totalXp >= t ? i : acc, 0);
    const newTier = newTierIdx > prevTierIdx ? TIERS[newTierIdx] : null;

    return {
      xpAwarded: totalAwarded,
      badgesEarned,
      totalXp,
      newTier,
    };
  },
});
