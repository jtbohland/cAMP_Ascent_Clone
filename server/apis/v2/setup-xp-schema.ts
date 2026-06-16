import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupXpSchema",
  description: "Creates XP system tables and adds ascent_day_1 to viewers",

  integrations: {
    db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),

  async run(ctx) {
    // Add ascent_day_1 column to viewers table
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_viewers 
       ADD COLUMN IF NOT EXISTS ascent_day_1 DATE`,
      [],
      { label: "Add ascent_day_1 to viewers" }
    );

    // Add is_admin column to viewers table
    await ctx.integrations.db.execute(
      `ALTER TABLE cliptracker_v2_viewers 
       ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false`,
      [],
      { label: "Add is_admin to viewers" }
    );

    // Create XP events table — stores every XP-earning event
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_xp_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        clip_id UUID REFERENCES cliptracker_v2_clips(id),
        event_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        xp_amount INTEGER NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(viewer_id, source_id, clip_id)
      )`,
      [],
      { label: "Create xp_events table" }
    );

    // Create badges earned table
    await ctx.integrations.db.execute(
      `CREATE TABLE IF NOT EXISTS cliptracker_v2_badges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        viewer_id UUID NOT NULL REFERENCES cliptracker_v2_viewers(id),
        badge_id TEXT NOT NULL,
        clip_id UUID REFERENCES cliptracker_v2_clips(id),
        earned_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(viewer_id, badge_id, clip_id)
      )`,
      [],
      { label: "Create badges table" }
    );

    // Create index for quick lookups
    await ctx.integrations.db.execute(
      `CREATE INDEX IF NOT EXISTS idx_xp_events_viewer ON cliptracker_v2_xp_events(viewer_id);
       CREATE INDEX IF NOT EXISTS idx_badges_viewer ON cliptracker_v2_badges(viewer_id);`,
      [],
      { label: "Create indexes" }
    );

    ctx.log.info("XP schema setup complete");
    return { success: true, message: "XP schema created: xp_events, badges, ascent_day_1 column" };
  },
});
