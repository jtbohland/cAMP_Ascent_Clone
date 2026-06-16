import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const QuestionRowSchema = z.object({
  id: z.string(),
  question_text: z.string(),
  options: z.any(),
  correct_option: z.coerce.number(),
  trigger_at_seconds: z.coerce.number(),
  sort_order: z.coerce.number(),
  is_recovery: z.boolean(),
});

export default api({
  name: "GetClipQuestions",
  description: "Gets all questions for a clip (admin use)",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string().uuid(),
  }),

  output: z.object({
    questions: z.array(z.object({
      id: z.string(),
      questionText: z.string(),
      options: z.array(z.string()),
      correctOption: z.number(),
      triggerAtSeconds: z.number(),
      sortOrder: z.number(),
      isRecovery: z.boolean(),
    })),
  }),

  async run(ctx, { clipId }) {
    const questions = await ctx.integrations.db.query(
      `SELECT id, question_text, options, correct_option, trigger_at_seconds, sort_order, is_recovery
       FROM cliptracker_v2_questions
       WHERE clip_id = $1
       ORDER BY sort_order ASC, trigger_at_seconds ASC`,
      QuestionRowSchema,
      [clipId],
      { label: "Get questions for clip" }
    );

    return {
      questions: questions.map(q => ({
        id: q.id,
        questionText: q.question_text,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
        correctOption: q.correct_option,
        triggerAtSeconds: q.trigger_at_seconds,
        sortOrder: q.sort_order,
        isRecovery: q.is_recovery,
      })),
    };
  },
});
