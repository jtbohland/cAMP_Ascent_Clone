import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const QuestionRow = z.object({
  id: z.string(),
  question_text: z.string(),
  options: z.any(),
  correct_option: z.coerce.number(),
  trigger_at_seconds: z.coerce.number(),
  sort_order: z.coerce.number(),
  is_recovery: z.any(),
  correct_feedback: z.string().nullable(),
  incorrect_feedback: z.string().nullable(),
});

const ClipRow = z.object({
  id: z.string(),
  title: z.string(),
  video_url: z.string().nullable(),
  duration_seconds: z.coerce.number().nullable(),
  sort_order: z.coerce.number(),
});

const WeatherRow = z.object({
  id: z.string(),
  overview: z.string(),
  takeaways: z.any(),
  timer_minutes: z.coerce.number(),
});

export default api({
  name: "GetClipForWatching",
  description: "Gets clip details, all questions, and weather storm card for the player",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string(),
    viewerId: z.string(),
  }),

  output: z.object({
    clip: z.object({
      id: z.string(),
      title: z.string(),
      videoUrl: z.string().nullable(),
      durationSeconds: z.number().nullable(),
      sortOrder: z.number(),
    }),
    questions: z.array(
      z.object({
        id: z.string(),
        questionText: z.string(),
        options: z.array(z.string()),
        correctOption: z.number(),
        triggerAtSeconds: z.number(),
        sortOrder: z.number(),
        isRecovery: z.boolean(),
        correctFeedback: z.any().nullable(),
        incorrectFeedback: z.any().nullable(),
      })
    ),
    weatherStorm: z
      .object({
        overview: z.string(),
        takeaways: z.array(z.string()),
        timerMinutes: z.number(),
      })
      .nullable(),
  }),

  async run(ctx, { clipId }) {
    const clips = await ctx.integrations.db.query(
      "SELECT id, title, video_url, duration_seconds, sort_order FROM cliptracker_v2_clips WHERE id = $1",
      ClipRow,
      [clipId],
      { label: "Get clip details" }
    );

    if (clips.length === 0) {
      throw new Error("Clip not found");
    }
    const clip = clips[0];

    const questions = await ctx.integrations.db.query(
      `SELECT id, question_text, options, correct_option, trigger_at_seconds, sort_order, is_recovery, correct_feedback, incorrect_feedback
       FROM cliptracker_v2_questions
       WHERE clip_id = $1
       ORDER BY is_recovery ASC, trigger_at_seconds ASC, sort_order ASC`,
      QuestionRow,
      [clipId],
      { label: "Get all questions for clip" }
    );

    const weatherCards = await ctx.integrations.db.query(
      "SELECT id, overview, takeaways, timer_minutes FROM cliptracker_v2_weather_storm WHERE clip_id = $1 LIMIT 1",
      WeatherRow,
      [clipId],
      { label: "Get weather storm card" }
    );

    return {
      clip: {
        id: clip.id,
        title: clip.title,
        videoUrl: clip.video_url,
        durationSeconds: clip.duration_seconds,
        sortOrder: clip.sort_order,
      },
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.question_text,
        options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
        correctOption: q.correct_option,
        triggerAtSeconds: q.trigger_at_seconds,
        sortOrder: q.sort_order,
        isRecovery: q.is_recovery === true || q.is_recovery === "t" || q.is_recovery === 1,
        correctFeedback: q.correct_feedback ? (typeof q.correct_feedback === "string" ? JSON.parse(q.correct_feedback) : q.correct_feedback) : null,
        incorrectFeedback: q.incorrect_feedback ? (typeof q.incorrect_feedback === "string" ? JSON.parse(q.incorrect_feedback) : q.incorrect_feedback) : null,
      })),
      weatherStorm: weatherCards.length > 0
        ? {
            overview: weatherCards[0].overview,
            takeaways: Array.isArray(weatherCards[0].takeaways)
              ? weatherCards[0].takeaways
              : JSON.parse(weatherCards[0].takeaways),
            timerMinutes: weatherCards[0].timer_minutes,
          }
        : null,
    };
  },
});
