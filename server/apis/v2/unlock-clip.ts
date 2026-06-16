import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UnlockClipForViewer",
  description: "Admin manually unlocks a clip for a specific viewer",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string().uuid(),
    clipId: z.string().uuid(),
    reason: z.string().nullable(),
  }),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx, { viewerId, clipId, reason }) {
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_unlock_overrides (viewer_id, clip_id, unlocked_by, reason)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (viewer_id, clip_id) DO UPDATE SET unlocked_by = $3, reason = $4`,
      [viewerId, clipId, ctx.user.email ?? 'admin', reason],
      { label: "Create unlock override" }
    );

    // Audit log
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
       VALUES ('unlock_override', 'viewer', $1, $2, $3)`,
      [viewerId, ctx.user.email ?? 'admin', JSON.stringify({ clipId, reason })],
      { label: "Log unlock override" }
    );

    return { success: true };
  },
});
