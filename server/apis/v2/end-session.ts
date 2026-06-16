import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "EndSession",
  description: "Ends a viewing session and calculates engagement score",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({
    sessionId: z.string().uuid(),
    totalFocusSeconds: z.number(),
    totalBlurSeconds: z.number(),
    totalTimeSeconds: z.number(),
    clipDurationSeconds: z.number(),
  }),

  output: z.object({
    engagementScore: z.number(),
    questionScore: z.number(),
    focusScore: z.number(),
    timeScore: z.number(),
    passed: z.boolean(),
    correctAnswers: z.number(),
    totalQuestions: z.number(),
  }),

  async run(ctx, { sessionId, totalFocusSeconds, totalBlurSeconds, totalTimeSeconds, clipDurationSeconds }) {
    // Get all responses for this session
    const ResponseCountSchema = z.object({
      total: z.coerce.number(),
      correct: z.coerce.number(),
    });
    
    const responseStats = await ctx.integrations.db.query(
      `SELECT 
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE is_correct = true)::int as correct
       FROM cliptracker_v2_responses
       WHERE session_id = $1`,
      ResponseCountSchema,
      [sessionId],
      { label: "Get response stats" }
    );

    const { total: totalQuestions, correct: correctAnswers } = responseStats[0];

    // Calculate scores (0-100 each)
    // Question score: percentage of correct answers (50% weight)
    const questionScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

    // Focus score: percentage of time focused vs total time (30% weight)
    const totalActiveTime = totalFocusSeconds + totalBlurSeconds;
    const focusScore = totalActiveTime > 0 ? (totalFocusSeconds / totalActiveTime) * 100 : 100;

    // Time score: how much of the video's duration was spent watching (20% weight)
    // Cap at 100 (viewer can spend more time than video duration due to pauses)
    const timeScore = clipDurationSeconds > 0 
      ? Math.min((totalTimeSeconds / clipDurationSeconds) * 100, 100) 
      : 100;

    // Weighted engagement score
    const engagementScore = Math.round(
      (questionScore * 0.5) + (focusScore * 0.3) + (timeScore * 0.2)
    );

    const passed = engagementScore >= 80;

    // Update the session
    await ctx.integrations.db.execute(
      `UPDATE cliptracker_v2_sessions 
       SET ended_at = NOW(),
           total_focus_seconds = $2,
           total_blur_seconds = $3,
           total_time_seconds = $4,
           engagement_score = $5,
           question_score = $6,
           focus_score = $7,
           time_score = $8,
           completed = true
       WHERE id = $1`,
      [sessionId, totalFocusSeconds, totalBlurSeconds, totalTimeSeconds, 
       engagementScore, questionScore, focusScore, timeScore],
      { label: "Update session with scores" }
    );

    return {
      engagementScore,
      questionScore: Math.round(questionScore),
      focusScore: Math.round(focusScore),
      timeScore: Math.round(timeScore),
      passed,
      correctAnswers,
      totalQuestions,
    };
  },
});
