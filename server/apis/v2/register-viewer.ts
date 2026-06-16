import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ROLES = ['SDR', 'Velocity AE', 'Emerging AE', 'Majors AE', 'Strategic AEs', 'PSM', 'Renewals'] as const;

const ViewerSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  ascentDay1: z.string().nullable(),
  isAdmin: z.boolean(),
});

export default api({
  name: "RegisterViewer",
  description: "Registers a new viewer or returns existing viewer by email",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(ROLES),
    ascentDay1: z.string(),
  }),

  output: z.object({
    viewer: ViewerSchema,
    isNew: z.boolean(),
  }),

  async run(ctx, { email, name, role, ascentDay1 }) {
    // Check if viewer already exists
    const existing = await ctx.integrations.db.query(
      "SELECT id, email, name, role, ascent_day_1::text as \"ascentDay1\", COALESCE(is_admin, false) as \"isAdmin\" FROM cliptracker_v2_viewers WHERE email = $1",
      ViewerSchema,
      [email],
      { label: "Check existing viewer" }
    );

    if (existing.length > 0) {
      return { viewer: existing[0], isNew: false };
    }

    // Create new viewer
    const created = await ctx.integrations.db.query(
      `INSERT INTO cliptracker_v2_viewers (email, name, role, ascent_day_1)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, ascent_day_1::text as "ascentDay1", COALESCE(is_admin, false) as "isAdmin"`,
      ViewerSchema,
      [email, name, role, ascentDay1],
      { label: "Register new viewer" }
    );

    ctx.log.info("New viewer registered", { email, role });
    return { viewer: created[0], isNew: true };
  },
});
