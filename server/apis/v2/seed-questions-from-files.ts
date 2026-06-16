import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ClipIdSchema = z.object({ id: z.string(), sort_order: z.coerce.number() });

export default api({
  name: "SeedQuestionsFromFiles",
  description: "Inserts questions and weather cards from JSON content strings",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    trailMarkersJson: z.string().nullable(),
    searchRescueJson: z.string().nullable(),
    weatherJson: z.string().nullable(),
  }),

  output: z.object({
    trailMarkersInserted: z.number(),
    searchRescueInserted: z.number(),
    weatherCardsInserted: z.number(),
  }),

  async run(ctx, { trailMarkersJson, searchRescueJson, weatherJson }) {
    // Get clip IDs by sort_order
    const clips = await ctx.integrations.db.query(
      "SELECT id, sort_order FROM cliptracker_v2_clips ORDER BY sort_order",
      ClipIdSchema,
      undefined,
      { label: "Get clip IDs" }
    );

    const clipMap: Record<number, string> = {};
    for (const clip of clips) {
      clipMap[clip.sort_order] = clip.id;
    }

    let trailMarkersInserted = 0;
    let searchRescueInserted = 0;
    let weatherCardsInserted = 0;

    // Process trail markers
    if (trailMarkersJson) {
      const trailMarkers = JSON.parse(trailMarkersJson);
      for (const clipData of trailMarkers.clips) {
        const clipId = clipMap[clipData.clip_id];
        if (!clipId) continue;

        for (const q of clipData.trail_markers) {
          const correctFeedback = JSON.stringify(q.correct_feedback);
          const incorrectFeedback = JSON.stringify(q.incorrect_feedback);

          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_questions 
             (clip_id, question_text, options, correct_option, trigger_at_seconds, sort_order, is_recovery, correct_feedback, incorrect_feedback)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [clipId, q.text, JSON.stringify(q.options), q.correct, q.triggerAtSeconds, q.question_number, false, correctFeedback, incorrectFeedback],
            { label: `TM clip ${clipData.clip_id} Q${q.question_number}` }
          );
          trailMarkersInserted++;
        }
      }
    }

    // Process search & rescue
    if (searchRescueJson) {
      const searchRescue = JSON.parse(searchRescueJson);
      for (const clipData of searchRescue.clips) {
        const clipId = clipMap[clipData.clip_id];
        if (!clipId) continue;

        for (const q of clipData.search_and_rescue_questions) {
          const correctFeedback = JSON.stringify(q.correct_feedback);
          const incorrectFeedback = JSON.stringify(q.incorrect_feedback);

          await ctx.integrations.db.execute(
            `INSERT INTO cliptracker_v2_questions 
             (clip_id, question_text, options, correct_option, trigger_at_seconds, sort_order, is_recovery, correct_feedback, incorrect_feedback)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [clipId, q.text, JSON.stringify(q.options), q.correct, 0, q.question_number, true, correctFeedback, incorrectFeedback],
            { label: `SR clip ${clipData.clip_id} Q${q.question_number}` }
          );
          searchRescueInserted++;
        }
      }
    }

    // Process weather cards
    if (weatherJson) {
      const weather = JSON.parse(weatherJson);
      for (const clipData of weather.clips) {
        const clipId = clipMap[clipData.clip_id];
        if (!clipId) continue;

        await ctx.integrations.db.execute(
          `INSERT INTO cliptracker_v2_weather_storm (clip_id, overview, takeaways, timer_minutes, on_timer_expire)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (clip_id) DO UPDATE SET overview = $2, takeaways = $3, timer_minutes = $4, on_timer_expire = $5`,
          [clipId, clipData.overview, JSON.stringify(clipData.takeaways), clipData.timer_minutes, clipData.on_timer_expire],
          { label: `Weather clip ${clipData.clip_id}` }
        );
        weatherCardsInserted++;
      }
    }

    return { trailMarkersInserted, searchRescueInserted, weatherCardsInserted };
  },
});
