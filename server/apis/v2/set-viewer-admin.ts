import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetViewerAdmin",
  description: "Toggles admin status for a viewer by email",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    email: z.string().email(),
    isAdmin: z.boolean(),
  }),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx, { email, isAdmin }) {
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_viewers SET is_admin = $2 WHERE email = $1`,
      [email, isAdmin],
      { label: "Set admin status" }
    );

    ctx.log.info(`Admin status set to ${isAdmin} for ${email}`);
    return { success: true, message: `${email} is ${isAdmin ? 'now an admin' : 'no longer an admin'}` };
  },
});
