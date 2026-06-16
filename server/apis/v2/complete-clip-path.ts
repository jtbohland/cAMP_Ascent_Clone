import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Marks a clip as "completed" via the alternative paths:
 * - Search & Rescue pass (≥80%)
 * - Weather the Storm timer expiry
 *
 * Inserts an unlock override for the NEXT clip so GetClipLibrary unlocks it.
 */
export default api({
  name: "CompleteClipPath",
  description: "Unlocks next clip after S&R pass or Weather Storm completion",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    clipId: z.string().uuid(),
    path: z.enum(["search_rescue", "weather_storm"]),
  }),

  output: z.object({
    success: z.boolean(),
    nextClipUnlocked: z.boolean(),
  }),

  async run(ctx, { viewerId, clipId, path }) {
    // Get the sort_order of this clip to find the next one
    const SortSchema = z.object({ sort_order: z.coerce.number() });
    const currentClips = await ctx.integrations.db.query(
      "SELECT sort_order FROM cliptracker_v2_clips WHERE id = $1",
      SortSchema,
      [clipId],
      { label: "Get current clip sort order" }
    );

    if (currentClips.length === 0) {
      throw new Error("Clip not found");
    }

    const currentSort = currentClips[0].sort_order;

    // Find the next clip
    const NextClipSchema = z.object({ id: z.string() });
    const nextClips = await ctx.integrations.db.query(
      "SELECT id FROM cliptracker_v2_clips WHERE sort_order = $1 AND status = 'live'",
      NextClipSchema,
      [currentSort + 1],
      { label: "Find next clip" }
    );

    let nextClipUnlocked = false;

    if (nextClips.length > 0) {
      // Insert unlock override for the next clip
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_unlock_overrides (viewer_id, clip_id, unlocked_by, reason)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (viewer_id, clip_id) DO NOTHING`,
        [viewerId, nextClips[0].id, "system", `Completed via ${path}`],
        { label: "Insert unlock override for next clip" }
      );
      nextClipUnlocked = true;
    }

    // Also mark the current session as completed (so it shows as completed in library)
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions 
       SET completed = true
       WHERE clip_id = $1 AND viewer_id = $2 AND completed = false
       AND id = (
         SELECT id FROM cliptracker_v2_sessions
         WHERE clip_id = $1 AND viewer_id = $2
         ORDER BY started_at DESC LIMIT 1
       )`,
      [clipId, viewerId],
      { label: "Mark session completed via alternative path" }
    );

    ctx.log.info(`Clip completed via ${path}`, { viewerId, clipId, nextClipUnlocked });

    return { success: true, nextClipUnlocked };
  },
});
