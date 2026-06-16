import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ClipWithProgressSchema = z.object({
  id: z.string(),
  title: z.string(),
  video_url: z.string().nullable(),
  duration_seconds: z.coerce.number().nullable(),
  sort_order: z.coerce.number(),
  status: z.string(),
  best_score: z.string().nullable(),
  attempts: z.string().nullable(),
  completed: z.coerce.number(),
});

export default api({
  name: "GetClipLibrary",
  description: "Gets all live clips with viewer progress for sequential unlock",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    viewerId: z.string(),
  }),

  output: z.object({
    clips: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        videoUrl: z.string().nullable(),
        durationSeconds: z.number().nullable(),
        sortOrder: z.number(),
        bestScore: z.number().nullable(),
        attempts: z.number(),
        completed: z.boolean(),
        unlocked: z.boolean(),
      })
    ),
  }),

  async run(ctx, { viewerId }) {
    // Check if viewer is admin
    const AdminCheckSchema = z.object({ is_admin: z.boolean() });
    const adminCheck = await ctx.integrations.db.query(
      "SELECT COALESCE(is_admin, false) as is_admin FROM cliptracker_v2_viewers WHERE id = $1",
      AdminCheckSchema,
      [viewerId],
      { label: "Check if viewer is admin" }
    );
    const isAdmin = adminCheck[0]?.is_admin ?? false;

    const clips = await ctx.integrations.db.query(
      `SELECT 
        c.id, c.title, c.video_url, c.duration_seconds, c.sort_order, c.status,
        (
          SELECT MAX(s.engagement_score)::text 
          FROM cliptracker_v2_sessions s 
          WHERE s.clip_id = c.id AND s.viewer_id = $1 AND s.completed = true
        ) as best_score,
        (
          SELECT COUNT(*)::text 
          FROM cliptracker_v2_sessions s 
          WHERE s.clip_id = c.id AND s.viewer_id = $1
        ) as attempts,
        (
          SELECT COUNT(*)::int 
          FROM cliptracker_v2_sessions s 
          WHERE s.clip_id = c.id AND s.viewer_id = $1 AND s.completed = true AND s.engagement_score >= 80
        ) as completed
      FROM cliptracker_v2_clips c
      WHERE c.status = 'live'
      ORDER BY c.sort_order ASC`,
      ClipWithProgressSchema,
      [viewerId],
      { label: "Get clip library with progress" }
    );

    // Check for unlock overrides
    const OverrideSchema = z.object({ clip_id: z.string() });
    const overrides = await ctx.integrations.db.query(
      "SELECT clip_id FROM cliptracker_v2_unlock_overrides WHERE viewer_id = $1",
      OverrideSchema,
      [viewerId],
      { label: "Check unlock overrides" }
    );
    const overrideSet = new Set(overrides.map((o) => o.clip_id));

    const result = clips.map((clip, index) => {
      const bestScore = clip.best_score ? parseFloat(clip.best_score) : null;
      const isCompleted = clip.completed > 0;

      // Admins get all clips unlocked
      let isLocked = true;
      if (isAdmin) {
        isLocked = false;
      } else if (index === 0) {
        isLocked = false;
      } else if (overrideSet.has(clip.id)) {
        isLocked = false;
      } else {
        const prevClip = clips[index - 1];
        isLocked = !(prevClip.completed > 0);
      }

      return {
        id: clip.id,
        title: clip.title,
        videoUrl: clip.video_url,
        durationSeconds: clip.duration_seconds,
        sortOrder: clip.sort_order,
        bestScore: bestScore,
        attempts: clip.attempts ? parseInt(clip.attempts) : 0,
        completed: isCompleted,
        unlocked: !isLocked,
      };
    });

    return { clips: result };
  },
});
