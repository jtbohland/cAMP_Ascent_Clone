import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const QuestionInput = z.object({
  clipId: z.number(),
  questionNumber: z.number(),
  text: z.string(),
  options: z.array(z.string()),
  correct: z.number(),
  triggerAtSeconds: z.number(),
  isRecovery: z.boolean(),
  correctFeedback: z.string(), // JSON string
  incorrectFeedback: z.string(), // JSON string
});

export default api({
  name: "SeedQuestionsBatch",
  description: "Inserts a batch of questions into cliptracker_v2_questions",
  integrations: {
    db: postgres(APPS_DB),
  },
  input: z.object({
    questions: z.array(QuestionInput),
  }),
  output: z.object({
    inserted: z.number(),
  }),
  async run(ctx, { questions }) {
    if (!questions || questions.length === 0) {
      return { inserted: 0 };
    }

    // Get clip ID mapping (sort_order -> actual id)
    const clipRows = await ctx.integrations.db.query(
      "SELECT id, sort_order FROM cliptracker_v2_clips ORDER BY sort_order",
      z.object({ id: z.string(), sort_order: z.number() }),
      [],
      { label: "Get clip ID mapping" }
    );

    const clipMap = new Map<number, string>();
    for (const row of clipRows) {
      clipMap.set(row.sort_order, row.id);
    }

    let inserted = 0;
    for (const q of questions) {
      const clipUuid = clipMap.get(q.clipId);
      if (!clipUuid) continue;

      await ctx.integrations.db.query(
        `INSERT INTO cliptracker_v2_questions 
          (clip_id, question_text, options, correct_option, trigger_at_seconds, sort_order, is_recovery, correct_feedback, incorrect_feedback)
         VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8::jsonb, $9::jsonb)
         ON CONFLICT DO NOTHING`,
        z.object({}),
        [
          clipUuid,
          q.text,
          JSON.stringify(q.options),
          q.correct,
          q.triggerAtSeconds,
          q.questionNumber,
          q.isRecovery,
          q.correctFeedback,
          q.incorrectFeedback,
        ],
        { label: `Insert Q${q.questionNumber} for clip ${q.clipId}` }
      );
      inserted++;
    }

    return { inserted };
  },
});
