import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupClipsSchemaV2",
  description: "Creates v2 database tables for the Clip Tracker",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    // Viewers table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_viewers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('SDR', 'Velocity AE', 'Emerging AE', 'Majors AE', 'Strategic AEs', 'PSM', 'Renewals')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create viewers table" }
    );

    // Clips table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_clips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        video_url TEXT,
        duration_seconds INTEGER,
        transcript TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
        created_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create clips table" }
    );

    // Questions table (with feedback columns)
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clip_id UUID NOT NULL REFERENCES cliptracker_v2_clips(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        options JSONB NOT NULL DEFAULT '[]',
        correct_option INTEGER NOT NULL,
        trigger_at_seconds INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_recovery BOOLEAN NOT NULL DEFAULT FALSE,
        correct_feedback TEXT,
        incorrect_feedback TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create questions table" }
    );

    // Add feedback columns if they don't exist (migration for existing tables)
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_questions ADD COLUMN IF NOT EXISTS correct_feedback TEXT`,
      undefined,
      { label: "Add correct_feedback column" }
    );
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_questions ADD COLUMN IF NOT EXISTS incorrect_feedback TEXT`,
      undefined,
      { label: "Add incorrect_feedback column" }
    );

    // Sessions table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clip_id UUID NOT NULL REFERENCES cliptracker_v2_clips(id) ON DELETE CASCADE,
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMPTZ,
        total_focus_seconds INTEGER DEFAULT 0,
        total_blur_seconds INTEGER DEFAULT 0,
        total_time_seconds INTEGER DEFAULT 0,
        engagement_score NUMERIC(5,2),
        question_score NUMERIC(5,2),
        focus_score NUMERIC(5,2),
        time_score NUMERIC(5,2),
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        is_recovery_attempt BOOLEAN NOT NULL DEFAULT FALSE,
        attempt_number INTEGER NOT NULL DEFAULT 1
      )`,
      undefined,
      { label: "Create sessions table" }
    );

    // Responses table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID NOT NULL REFERENCES cliptracker_v2_sessions(id) ON DELETE CASCADE,
        question_id UUID NOT NULL REFERENCES cliptracker_v2_questions(id) ON DELETE CASCADE,
        selected_option INTEGER NOT NULL,
        is_correct BOOLEAN NOT NULL,
        time_to_answer_seconds NUMERIC(6,2),
        answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create responses table" }
    );

    // Unlock overrides
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_unlock_overrides (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id) ON DELETE CASCADE,
        clip_id UUID NOT NULL REFERENCES cliptracker_v2_clips(id) ON DELETE CASCADE,
        unlocked_by TEXT NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(viewer_id, clip_id)
      )`,
      undefined,
      { label: "Create unlock overrides table" }
    );

    // Audit log
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id UUID,
        actor TEXT NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create audit log table" }
    );

    // Weather the Storm table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_weather_storm (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clip_id UUID NOT NULL REFERENCES cliptracker_v2_clips(id) ON DELETE CASCADE,
        overview TEXT NOT NULL,
        takeaways JSONB NOT NULL DEFAULT '[]',
        timer_minutes INTEGER NOT NULL DEFAULT 5,
        on_timer_expire TEXT NOT NULL DEFAULT 'unlock_next_video',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(clip_id)
      )`,
      undefined,
      { label: "Create weather storm table" }
    );

    ctx.log.info("V2 schema created successfully");
    return { success: true, message: "All v2 tables created successfully (including feedback + weather_storm)" };
  },
});
