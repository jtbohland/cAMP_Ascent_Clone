import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SaveQuestions",
  description: "Saves (replaces) questions for a clip from admin upload",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string().uuid(),
    questions: z.array(z.object({
      questionText: z.string(),
      options: z.array(z.string()),
      correctOption: z.number(),
      triggerAtSeconds: z.number(),
      sortOrder: z.number(),
      isRecovery: z.boolean(),
    })),
  }),

  output: z.object({
    saved: z.number(),
  }),

  async run(ctx, { clipId, questions }) {
    // Delete existing questions for this clip (replace strategy)
    await ctx.integrations.db.execute(
      "DELETE FROM cliptracker_v2_questions WHERE clip_id = $1",
      [clipId],
      { label: "Clear existing questions" }
    );

    // Insert new questions
    for (const q of questions) {
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_questions (clip_id, question_text, options, correct_option, trigger_at_seconds, sort_order, is_recovery)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [clipId, q.questionText, JSON.stringify(q.options), q.correctOption, q.triggerAtSeconds, q.sortOrder, q.isRecovery],
        { label: `Insert question ${q.sortOrder}` }
      );
    }

    // Audit log
    await ctx.integrations.db.execute(
      `INSERT INTO cliptracker_v2_audit_log (action, entity_type, entity_id, actor, details)
       VALUES ('save_questions', 'clip', $1, $2, $3)`,
      [clipId, ctx.user.email ?? 'admin', JSON.stringify({ count: questions.length })],
      { label: "Log question save" }
    );

    return { saved: questions.length };
  },
});
