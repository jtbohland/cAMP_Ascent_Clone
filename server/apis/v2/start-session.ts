import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const SessionSchema = z.object({
  id: z.string(),
});

export default api({
  name: "StartSession",
  description: "Creates a new viewing session for a clip",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string().uuid(),
    viewerId: z.string().uuid(),
    isRecovery: z.boolean().default(false),
  }),

  output: z.object({
    sessionId: z.string(),
  }),

  async run(ctx, { clipId, viewerId, isRecovery }) {
    // Get the attempt number
    const CountSchema = z.object({ count: z.coerce.number() });
    const countResult = await ctx.integrations.db.query(
      "SELECT COUNT(*)::int as count FROM cliptracker_v2_sessions WHERE clip_id = $1 AND viewer_id = $2",
      CountSchema,
      [clipId, viewerId],
      { label: "Count previous attempts" }
    );
    
    const attemptNumber = (countResult[0]?.count ?? 0) + 1;

    const session = await ctx.integrations.db.query(
      `INSERT INTO cliptracker_v2_sessions (clip_id, viewer_id, is_recovery_attempt, attempt_number)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      SessionSchema,
      [clipId, viewerId, isRecovery ?? false, attemptNumber],
      { label: "Create viewing session" }
    );

    return { sessionId: session[0].id };
  },
});
