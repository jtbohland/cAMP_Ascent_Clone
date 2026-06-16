import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const CreatedClipSchema = z.object({ id: z.string() });

export default api({
  name: "SaveClip",
  description: "Creates or updates a clip in admin",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    id: z.string().uuid().nullable(),
    title: z.string().min(1),
    videoUrl: z.string().nullable(),
    durationSeconds: z.number().nullable(),
    transcript: z.string().nullable(),
    sortOrder: z.number(),
    status: z.enum(['draft', 'live', 'archived']),
  }),

  output: z.object({
    clipId: z.string(),
    isNew: z.boolean(),
  }),

  async run(ctx, { id, title, videoUrl, durationSeconds, transcript, sortOrder, status }) {
    if (id) {
      // Update existing clip
      await ctx.integrations.db.execute(
        `UPDATE cliptracker_v2_clips 
         SET title = $2, video_url = $3, duration_seconds = $4, transcript = $5, 
             sort_order = $6, status = $7, updated_at = NOW()
         WHERE id = $1`,
        [id, title, videoUrl, durationSeconds, transcript, sortOrder, status],
        { label: "Update clip" }
      );

      // Audit log
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
         VALUES ('update_clip', 'clip', $1, $2, $3)`,
        [id, ctx.user.email ?? 'admin', JSON.stringify({ title, status })],
        { label: "Log clip update" }
      );

      return { clipId: id, isNew: false };
    } else {
      // Create new clip
      const result = await ctx.integrations.db.query(
        `INSERT INTO cliptracker_v2_clips (title, video_url, duration_seconds, transcript, sort_order, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        CreatedClipSchema,
        [title, videoUrl, durationSeconds, transcript, sortOrder, status, ctx.user.email ?? 'admin'],
        { label: "Create clip" }
      );

      const clipId = result[0].id;

      // Audit log
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
         VALUES ('create_clip', 'clip', $1, $2, $3)`,
        [clipId, ctx.user.email ?? 'admin', JSON.stringify({ title, status })],
        { label: "Log clip creation" }
      );

      return { clipId, isNew: true };
    }
  },
});
