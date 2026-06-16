import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const AdminClipSchema = z.object({
  id: z.string(),
  title: z.string(),
  video_url: z.string().nullable(),
  duration_seconds: z.coerce.number().nullable(),
  sort_order: z.coerce.number(),
  status: z.string(),
  question_count: z.coerce.number(),
  created_at: z.string(),
});

export default api({
  name: "GetAdminClips",
  description: "Gets all clips for admin management with question counts",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    clips: z.array(z.object({
      id: z.string(),
      title: z.string(),
      videoUrl: z.string().nullable(),
      durationSeconds: z.number().nullable(),
      sortOrder: z.number(),
      status: z.string(),
      questionCount: z.number(),
      createdAt: z.string(),
    })),
  }),

  async run(ctx) {
    const clips = await ctx.integrations.db.query(
      `SELECT c.id, c.title, c.video_url, c.duration_seconds, c.sort_order, c.status,
              (SELECT COUNT(*)::int FROM cliptracker_v2_questions q WHERE q.clip_id = c.id) as question_count,
              c.created_at::text
       FROM cliptracker_v2_clips c
       ORDER BY c.sort_order ASC, c.created_at ASC`,
      AdminClipSchema,
      undefined,
      { label: "Get all clips for admin" }
    );

    return {
      clips: clips.map(c => ({
        id: c.id,
        title: c.title,
        videoUrl: c.video_url,
        durationSeconds: c.duration_seconds,
        sortOrder: c.sort_order,
        status: c.status,
        questionCount: c.question_count,
        createdAt: c.created_at,
      })),
    };
  },
});
