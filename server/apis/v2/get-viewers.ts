import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ViewerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.string(),
  created_at: z.string(),
});

export default api({
  name: "GetViewers",
  description: "Gets all registered viewers for admin management",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    viewers: z.array(z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string(),
      createdAt: z.string(),
    })),
  }),

  async run(ctx) {
    const viewers = await ctx.integrations.db.query(
      `SELECT id, name, email, role, created_at::text
       FROM cliptracker_v2_viewers
       ORDER BY name ASC
       LIMIT 500`,
      ViewerRowSchema,
      undefined,
      { label: "Get all viewers" }
    );

    return {
      viewers: viewers.map(v => ({
        id: v.id,
        name: v.name,
        email: v.email,
        role: v.role,
        createdAt: v.created_at,
      })),
    };
  },
});
