import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ViewerSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  isAdmin: z.boolean(),
});

export default api({
  name: "AutoLookupViewer",
  description: "Auto-recognizes returning viewer using Superblocks session email",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    viewer: ViewerSchema.nullable(),
  }),

  async run(ctx) {
    const email = ctx.user.email;
    if (!email) {
      return { viewer: null };
    }

    const viewers = await ctx.integrations.db.query(
      "SELECT id, email, name, role, COALESCE(is_admin, false) as \"isAdmin\" FROM cliptracker_v2_viewers WHERE email = $1",
      ViewerSchema,
      [email.toLowerCase()],
      { label: "Auto-lookup viewer by session email" }
    );

    return { viewer: viewers.length > 0 ? viewers[0] : null };
  },
});
