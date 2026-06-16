import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ClipStatSchema = z.object({
  clip_id: z.string(),
  title: z.string(),
  sort_order: z.coerce.number(),
  total_viewers: z.coerce.number(),
  completed_viewers: z.coerce.number(),
  avg_score: z.string().nullable(),
  avg_focus: z.string().nullable(),
});

const ViewerStatSchema = z.object({
  viewer_id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  clips_completed: z.coerce.number(),
  avg_score: z.string().nullable(),
  last_activity: z.string().nullable(),
});

const RoleStatSchema = z.object({
  role: z.string(),
  viewer_count: z.coerce.number(),
  avg_score: z.string().nullable(),
  avg_completion: z.string().nullable(),
  avg_focus: z.string().nullable(),
});

export default api({
  name: "GetAnalyticsV2",
  description: "Gets comprehensive analytics with role-based breakdowns",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    clipStats: z.array(z.object({
      clipId: z.string(),
      title: z.string(),
      sortOrder: z.number(),
      totalViewers: z.number(),
      completedViewers: z.number(),
      avgScore: z.number().nullable(),
      avgFocus: z.number().nullable(),
    })),
    viewerStats: z.array(z.object({
      viewerId: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      clipsCompleted: z.number(),
      avgScore: z.number().nullable(),
      lastActivity: z.string().nullable(),
    })),
    roleStats: z.array(z.object({
      role: z.string(),
      viewerCount: z.number(),
      avgScore: z.number().nullable(),
      avgCompletion: z.number().nullable(),
      avgFocus: z.number().nullable(),
    })),
  }),

  async run(ctx) {
    // Per-clip stats
    const clipStats = await ctx.integrations.db.query(
      `SELECT 
        c.id as clip_id, c.title, c.sort_order,
        COUNT(DISTINCT s.viewer_id)::int as total_viewers,
        COUNT(DISTINCT s.viewer_id) FILTER (WHERE s.completed = true AND s.engagement_score >= 80)::int as completed_viewers,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true), 1)::text as avg_score,
        ROUND(AVG(s.focus_score) FILTER (WHERE s.completed = true), 1)::text as avg_focus
       FROM cliptracker_v2_clips c
       LEFT JOIN cliptracker_v2_sessions s ON s.clip_id = c.id
       WHERE c.status = 'live'
       GROUP BY c.id, c.title, c.sort_order
       ORDER BY c.sort_order ASC`,
      ClipStatSchema,
      undefined,
      { label: "Get per-clip stats" }
    );

    // Per-viewer stats
    const viewerStats = await ctx.integrations.db.query(
      `SELECT 
        v.id as viewer_id, v.name, v.email, v.role,
        COUNT(DISTINCT s.clip_id) FILTER (WHERE s.completed = true AND s.engagement_score >= 80)::int as clips_completed,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true), 1)::text as avg_score,
        MAX(s.ended_at)::text as last_activity
       FROM cliptracker_v2_viewers v
       LEFT JOIN cliptracker_v2_sessions s ON s.viewer_id = v.id
       GROUP BY v.id, v.name, v.email, v.role
       ORDER BY v.name ASC
       LIMIT 200`,
      ViewerStatSchema,
      undefined,
      { label: "Get per-viewer stats" }
    );

    // Per-role stats
    const roleStats = await ctx.integrations.db.query(
      `SELECT 
        v.role,
        COUNT(DISTINCT v.id)::int as viewer_count,
        ROUND(AVG(s.engagement_score) FILTER (WHERE s.completed = true), 1)::text as avg_score,
        ROUND(
          COUNT(DISTINCT s.clip_id) FILTER (WHERE s.completed = true AND s.engagement_score >= 80)::numeric / 
          NULLIF(COUNT(DISTINCT v.id), 0)::numeric, 1
        )::text as avg_completion,
        ROUND(AVG(s.focus_score) FILTER (WHERE s.completed = true), 1)::text as avg_focus
       FROM cliptracker_v2_viewers v
       LEFT JOIN cliptracker_v2_sessions s ON s.viewer_id = v.id
       GROUP BY v.role
       ORDER BY v.role ASC`,
      RoleStatSchema,
      undefined,
      { label: "Get per-role stats" }
    );

    return {
      clipStats: clipStats.map(c => ({
        clipId: c.clip_id,
        title: c.title,
        sortOrder: c.sort_order,
        totalViewers: c.total_viewers,
        completedViewers: c.completed_viewers,
        avgScore: c.avg_score ? parseFloat(c.avg_score) : null,
        avgFocus: c.avg_focus ? parseFloat(c.avg_focus) : null,
      })),
      viewerStats: viewerStats.map(v => ({
        viewerId: v.viewer_id,
        name: v.name,
        email: v.email,
        role: v.role,
        clipsCompleted: v.clips_completed,
        avgScore: v.avg_score ? parseFloat(v.avg_score) : null,
        lastActivity: v.last_activity,
      })),
      roleStats: roleStats.map(r => ({
        role: r.role,
        viewerCount: r.viewer_count,
        avgScore: r.avg_score ? parseFloat(r.avg_score) : null,
        avgCompletion: r.avg_completion ? parseFloat(r.avg_completion) : null,
        avgFocus: r.avg_focus ? parseFloat(r.avg_focus) : null,
      })),
    };
  },
});
