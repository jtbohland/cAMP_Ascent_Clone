import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const WeatherStormSchema = z.object({
  id: z.string(),
  clip_id: z.string(),
  overview: z.string(),
  takeaways: z.any(),
  timer_minutes: z.coerce.number(),
  on_timer_expire: z.string(),
});

export default api({
  name: "GetWeatherStorm",
  description: "Gets the Weather the Storm card for a clip",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    clipId: z.string().uuid(),
  }),

  output: z.object({
    card: z.object({
      id: z.string(),
      clipId: z.string(),
      overview: z.string(),
      takeaways: z.array(z.string()),
      timerMinutes: z.number(),
      onTimerExpire: z.string(),
    }).nullable(),
  }),

  async run(ctx, { clipId }) {
    const cards = await ctx.integrations.db.query(
      `SELECT id, clip_id, overview, takeaways, timer_minutes, on_timer_expire
       FROM cliptracker_v2_weather_storm
       WHERE clip_id = $1`,
      WeatherStormSchema,
      [clipId],
      { label: "Get weather storm card" }
    );

    if (cards.length === 0) {
      return { card: null };
    }

    const card = cards[0];
    const takeaways = Array.isArray(card.takeaways) ? card.takeaways : JSON.parse(card.takeaways);

    return {
      card: {
        id: card.id,
        clipId: card.clip_id,
        overview: card.overview,
        takeaways,
        timerMinutes: card.timer_minutes,
        onTimerExpire: card.on_timer_expire,
      },
    };
  },
});
