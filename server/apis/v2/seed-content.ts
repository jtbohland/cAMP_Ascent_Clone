import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SeedContentV2",
  description: "Wipes test data and bulk inserts clips, questions, and weather cards",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    wipeFirst: z.boolean().default(true),
    clips: z.array(z.object({
      title: z.string(),
      videoUrl: z.string().nullable(),
      sortOrder: z.number(),
      status: z.string().default("live"),
    })),
    questions: z.array(z.object({
      clipSortOrder: z.number(),
      questionText: z.string(),
      options: z.array(z.string()),
      correctOption: z.number(),
      triggerAtSeconds: z.number(),
      sortOrder: z.number(),
      isRecovery: z.boolean(),
      correctFeedback: z.string().nullable(),
      incorrectFeedback: z.string().nullable(),
    })),
    weatherCards: z.array(z.object({
      clipSortOrder: z.number(),
      overview: z.string(),
      takeaways: z.array(z.string()),
      timerMinutes: z.number().default(5),
      onTimerExpire: z.string().default("unlock_next_video"),
    })),
  }),

  output: z.object({
    clipsInserted: z.number(),
    questionsInserted: z.number(),
    weatherCardsInserted: z.number(),
  }),

  async run(ctx, { wipeFirst, clips, questions, weatherCards }) {
    if (wipeFirst) {
      await ctx.integrations.db.execute("DELETE FROM cliptracker_v2_responses", undefined, { label: "Wipe responses" });
      await ctx.integrations.db.execute("DELETE FROM cliptracker_v2_sessions", undefined, { label: "Wipe sessions" });
      await ctx.integrations.db.execute("DELETE FROM cliptracker_v2_unlock_overrides", undefined, { label: "Wipe overrides" });
      await ctx.integrations.db.execute("DELETE FROM cliptracker_v2_questions", undefined, { label: "Wipe questions" });
      await ctx.integrations.db.execute("DELETE FROM cliptracker_v2_weather_storm", undefined, { label: "Wipe weather" });
      await ctx.integrations.db.execute("DELETE FROM cliptracker_v2_clips", undefined, { label: "Wipe clips" });
      await ctx.integrations.db.execute("DELETE FROM cliptracker_v2_viewers", undefined, { label: "Wipe viewers" });
      await ctx.integrations.db.execute("DELETE FROM cliptracker_v2_audit_log", undefined, { label: "Wipe audit" });
      ctx.log.info("Wiped all test data");
    }

    // Insert clips
    const ClipIdSchema = z.object({ id: z.string() });
    const clipIdMap: Record<number, string> = {};

    for (const clip of clips) {
      const result = await ctx.integrations.db.query(
        `INSERT INTO cliptracker_v2_clips (title, video_url, sort_order, status)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        ClipIdSchema,
        [clip.title, clip.videoUrl, clip.sortOrder, clip.status],
        { label: `Insert clip ${clip.sortOrder}` }
      );
      clipIdMap[clip.sortOrder] = result[0].id;
    }

    ctx.log.info(`Inserted ${clips.length} clips`);

    // Insert questions
    let questionsInserted = 0;
    for (const q of questions) {
      const clipId = clipIdMap[q.clipSortOrder];
      if (!clipId) {
        ctx.log.warn(`No clip found for sort_order ${q.clipSortOrder}, skipping question`);
        continue;
      }
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_questions (clip_id, question_text, options, correct_option, trigger_at_seconds, sort_order, is_recovery, correct_feedback, incorrect_feedback)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [clipId, q.questionText, JSON.stringify(q.options), q.correctOption, q.triggerAtSeconds, q.sortOrder, q.isRecovery, q.correctFeedback, q.incorrectFeedback],
        { label: `Insert Q${q.sortOrder} for clip ${q.clipSortOrder}` }
      );
      questionsInserted++;
    }

    ctx.log.info(`Inserted ${questionsInserted} questions`);

    // Insert weather cards
    let weatherInserted = 0;
    for (const w of weatherCards) {
      const clipId = clipIdMap[w.clipSortOrder];
      if (!clipId) {
        ctx.log.warn(`No clip found for sort_order ${w.clipSortOrder}, skipping weather card`);
        continue;
      }
      await ctx.integrations.db.execute(
        `INSERT INTO cliptracker_v2_weather_storm (clip_id, overview, takeaways, timer_minutes, on_timer_expire)
         VALUES ($1, $2, $3, $4, $5)`,
        [clipId, w.overview, JSON.stringify(w.takeaways), w.timerMinutes, w.onTimerExpire],
        { label: `Insert weather card for clip ${w.clipSortOrder}` }
      );
      weatherInserted++;
    }

    ctx.log.info(`Inserted ${weatherInserted} weather cards`);

    return {
      clipsInserted: clips.length,
      questionsInserted,
      weatherCardsInserted: weatherInserted,
    };
  },
});
