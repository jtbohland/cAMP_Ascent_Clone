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
  name: "LookupViewer",
  description: "Looks up an existing viewer by email for returning visitors",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    email: z.string().email(),
  }),

  output: z.object({
    viewer: ViewerSchema.nullable(),
  }),

  async run(ctx, { email }) {
    const viewers = await ctx.integrations.db.query(
      "SELECT id, email, name, role, COALESCE(is_admin, false) as \"isAdmin\" FROM cliptracker_v2_viewers WHERE email = $1",
      ViewerSchema,
      [email],
      { label: "Lookup viewer by email" }
    );

    return { viewer: viewers.length > 0 ? viewers[0] : null };
  },
});
