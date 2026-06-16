import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitAnswer",
  description: "Records a viewer's answer to a quiz question",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    sessionId: z.string().uuid(),
    questionId: z.string().uuid(),
    selectedOption: z.number(),
    isCorrect: z.boolean(),
    timeToAnswer: z.number().nullable(),
  }),

  output: z.object({
    success: z.boolean(),
  }),

  async run(ctx, { sessionId, questionId, selectedOption, isCorrect, timeToAnswer }) {
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_responses (session_id, question_id, selected_option, is_correct, time_to_answer_seconds)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [sessionId, questionId, selectedOption, isCorrect, timeToAnswer],
      { label: "Record quiz answer" }
    );

    return { success: true };
  },
});
