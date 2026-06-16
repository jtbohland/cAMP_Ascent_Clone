import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TIERS = [
  { tier: 1, name: "Base Camper", emoji: "🏕️", xpMin: 0, xpMax: 149 },
  { tier: 2, name: "Trailblazer", emoji: "🥾", xpMin: 150, xpMax: 324 },
  { tier: 3, name: "Summit Seeker", emoji: "🏔️", xpMin: 325, xpMax: 499 },
  { tier: 4, name: "Pinnacle Achiever", emoji: "🏔️✨", xpMin: 500, xpMax: null },
];

const BadgeSchema = z.object({
  badgeId: z.string(),
  clipId: z.string().nullable(),
  earnedAt: z.string(),
});

export default api({
  name: "GetLearnerProgress",
  description: "Gets a learner's total XP, tier, and earned badges",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
  }),

  output: z.object({
    totalXp: z.number(),
    tier: z.object({
      tier: z.number(),
      name: z.string(),
      emoji: z.string(),
      xpMin: z.number(),
      xpMax: z.number().nullable(),
    }),
    nextTier: z.object({
      tier: z.number(),
      name: z.string(),
      emoji: z.string(),
      xpMin: z.number(),
      xpMax: z.number().nullable(),
    }).nullable(),
    progressPercent: z.number(),
    badges: z.array(BadgeSchema),
    clipsCompleted: z.number(),
    ascentDay1: z.string().nullable(),
  }),

  async run(ctx, { viewerId }) {
    // Get total XP
    const XpSumSchema = z.object({ total_xp: z.coerce.number() });
    const xpResult = await ctx.integrations.db.query(
      `SELECT COALESCE(SUM(xp_amount), 0)::int as total_xp 
       FROM cliptracker_v2_xp_events 
       WHERE viewer_id = $1`,
      XpSumSchema,
      [viewerId],
      { label: "Get total XP" }
    );
    const totalXp = xpResult[0]?.total_xp ?? 0;

    // Get badges
    const BadgeRowSchema = z.object({
      badge_id: z.string(),
      clip_id: z.string().nullable(),
      earned_at: z.string(),
    });
    const badgeRows = await ctx.integrations.db.query(
      `SELECT badge_id, clip_id::text, earned_at::text 
       FROM cliptracker_v2_badges 
       WHERE viewer_id = $1 
       ORDER BY earned_at`,
      BadgeRowSchema,
      [viewerId],
      { label: "Get earned badges" }
    );

    // Get clips completed count
    const CompletedSchema = z.object({ count: z.coerce.number() });
    const completedResult = await ctx.integrations.db.query(
      `SELECT COUNT(DISTINCT clip_id)::int as count
       FROM cliptracker_v2_sessions
       WHERE viewer_id = $1 AND completed = true`,
      CompletedSchema,
      [viewerId],
      { label: "Count completed clips" }
    );
    const clipsCompleted = completedResult[0]?.count ?? 0;

    // Get ascent_day_1
    const ViewerDateSchema = z.object({ ascent_day_1: z.string().nullable() });
    const viewerDate = await ctx.integrations.db.query(
      `SELECT ascent_day_1::text FROM cliptracker_v2_viewers WHERE id = $1`,
      ViewerDateSchema,
      [viewerId],
      { label: "Get ascent day 1" }
    );

    // Determine tier
    const currentTier = TIERS.reduce((acc, t) => {
      if (totalXp >= t.xpMin) return t;
      return acc;
    }, TIERS[0]);

    const currentIdx = TIERS.findIndex(t => t.tier === currentTier.tier);
    const nextTier = currentIdx < TIERS.length - 1 ? TIERS[currentIdx + 1] : null;

    // Calculate progress within current tier
    let progressPercent = 100;
    if (nextTier) {
      const tierRange = nextTier.xpMin - currentTier.xpMin;
      const tierProgress = totalXp - currentTier.xpMin;
      progressPercent = Math.min(Math.round((tierProgress / tierRange) * 100), 100);
    }

    return {
      totalXp,
      tier: currentTier,
      nextTier,
      progressPercent,
      badges: badgeRows.map(b => ({
        badgeId: b.badge_id,
        clipId: b.clip_id,
        earnedAt: b.earned_at,
      })),
      clipsCompleted,
      ascentDay1: viewerDate[0]?.ascent_day_1 ?? null,
    };
  },
});
