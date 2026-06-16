import { useViewer } from "@/components/ViewerContext";
import { useApiData } from "@/hooks/useApiData.js";
import TopNav from "@/components/TopNav";

const TIERS = [
  { tier: 1, name: "Base Camper", emoji: "🏕️", xpMin: 0, description: "Just getting started" },
  { tier: 2, name: "Trailblazer", emoji: "🥾", xpMin: 150, description: "Finding your rhythm" },
  { tier: 3, name: "Summit Seeker", emoji: "🏔️", xpMin: 325, description: "Serious momentum" },
  { tier: 4, name: "Pinnacle Achiever", emoji: "🏔️✨", xpMin: 500, description: "Legendary status" },
];

const BASE_XP = [
  { action: "Watch a clip", xp: 3, emoji: "🎬", description: "Complete any clip session" },
  { action: "Trail Markers: 5/5", xp: 5, emoji: "🪧", description: "Perfect score on in-video questions" },
  { action: "Trail Markers: 4/5", xp: 3, emoji: "🪧", description: "Strong performance on questions" },
  { action: "Trail Markers: 3/5", xp: 1, emoji: "🪧", description: "Passing on questions" },
  { action: "First-pass unlock", xp: 4, emoji: "✅", description: "Pass engagement without S&R" },
  { action: "Pass Search & Rescue", xp: 2, emoji: "🚁", description: "Score ≥80% on recovery questions" },
  { action: "Complete Weather the Storm", xp: 1, emoji: "⛈️", description: "Wait out the 5-min review" },
];

const PERFORMANCE_BONUSES = [
  { badge: "Perfect Hiker", xp: 8, emoji: "🌲", condition: "5/5 Trail Markers + pass without Search & Rescue" },
  { badge: "Speed Hiker", xp: 5, emoji: "🥾", condition: "Complete clip in under video length + 5 min (first pass)" },
  { badge: "Search & Rescue Hero", xp: 8, emoji: "🚁", condition: "Perfect score on Search & Rescue questions" },
  { badge: "Storm Chaser", xp: 3, emoji: "⛈️", condition: "Hit Weather Storm on previous clip, then pass the next clip first try" },
  { badge: "Double Summit", xp: 5, emoji: "⛰️", condition: "Complete 2 clips in one calendar day" },
];

const STREAK_BONUSES = [
  { badge: "No Detours", xp: 10, emoji: "🧭", condition: "Complete a 5-clip window without triggering S&R (×3 max: clips 1–5, 6–10, 11–15)" },
  { badge: "Leave No Trace", xp: 15, emoji: "🌱", condition: "5/5 Trail Markers on a 3-clip window (×5 max: clips 1–3, 4–6, 7–9, 10–12, 13–15)" },
];

const MILESTONE_BONUSES = [
  { badge: "First Step", xp: 5, emoji: "🎬", condition: "Complete Clip 1" },
  { badge: "Halfway Up", xp: 15, emoji: "🏔️", condition: "Complete Clip 9" },
  { badge: "Into the Summit Push", xp: 10, emoji: "🩢", condition: "Unlock Week 4 (complete Clip 9)" },
  { badge: "Summit Reached", xp: 25, emoji: "🏔️✨", condition: "Complete all 17 clips" },
  { badge: "The Ranger's Secret", xp: 20, emoji: "🌲", condition: "Complete all 17 clips without EVER triggering Weather the Storm" },
];

export default function XPlanationPage() {
  const { viewer } = useViewer();
  const { data } = useApiData(
    "GetLearnerProgress",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  const totalXp = data?.totalXp ?? 0;
  const currentTier = data?.tier ?? TIERS[0];
  const badges = data?.badges ?? [];
  const earnedBadgeIds = new Set(badges.map((b: any) => b.badgeId));

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="max-w-3xl mx-auto w-full p-6 space-y-8">
        {/* Page Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">🏔️ XP-lanation</h1>
          <p className="text-muted-foreground">
            How to earn XP, unlock badges, and ascend the ranks
          </p>
          {viewer && (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              {currentTier.emoji} {currentTier.name} • {totalXp} XP
            </div>
          )}
        </div>

        {/* How Engagement Scoring Works */}
        <Section title="📊 How Engagement Scoring Works" description="Your clip score is a composite of three factors:">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <ScoreCard weight="50%" label="Trail Markers" emoji="🪧" description="In-video checkpoint questions answered correctly" />
            <ScoreCard weight="30%" label="Focus Score" emoji="👁️" description="Time actively focused on the clip (not tabbed away)" />
            <ScoreCard weight="20%" label="Time Score" emoji="⏱" description="How much of the video you actually watched" />
          </div>
          <div className="mt-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 p-3">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              ⚡ You need an engagement score of <span className="font-bold">80+</span> to pass and unlock the next clip.
              Below 80? Search & Rescue kicks in. Fail that? Weather the Storm gives you a study break.
            </p>
          </div>
        </Section>

        {/* The 5 Phases */}
        <Section title="🗺️ The 5 Phases" description="Each clip takes you through this journey:">
          <div className="space-y-2">
            <PhaseStep number={1} emoji="🎬" title="cAMP Clips" description="Watch the Zoom recording" />
            <PhaseStep number={2} emoji="🪧" title="Trail Markers" description="Answer 5 questions that pop up during the video" />
            <PhaseStep number={3} emoji="📋" title="Ranger Report" description="See your scorecard (questions + focus + time)" />
            <PhaseStep number={4} emoji="🚁" title="Search & Rescue" description="If score <80: additional questions to demonstrate understanding" isConditional />
            <PhaseStep number={5} emoji="⛈️" title="Weather the Storm" description="If S&R fails: 5-min study review before retrying" isConditional />
          </div>
        </Section>

        {/* Base XP */}
        <Section title="⭐ Base XP" description="Earned every time you complete a clip:">
          <div className="space-y-1">
            {BASE_XP.map((item) => (
              <XpRow key={item.action} emoji={item.emoji} label={item.action} xp={item.xp} description={item.description} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">
            Max base XP per clip: 12 (watch + 5/5 trail markers + first-pass unlock)
          </p>
        </Section>

        {/* Performance Bonuses */}
        <Section title="🏅 Performance Bonuses" description="Extra XP for exceptional runs:">
          <div className="space-y-2">
            {PERFORMANCE_BONUSES.map((b) => (
              <BadgeRow
                key={b.badge}
                emoji={b.emoji}
                badge={b.badge}
                xp={b.xp}
                condition={b.condition}
                earned={earnedBadgeIds.has(b.badge.toLowerCase().replace(/ /g, "_"))}
              />
            ))}
          </div>
        </Section>

        {/* Streak Bonuses */}
        <Section title="🔥 Streak Bonuses" description="Consistency pays off:">
          <div className="space-y-2">
            {STREAK_BONUSES.map((b) => (
              <BadgeRow
                key={b.badge}
                emoji={b.emoji}
                badge={b.badge}
                xp={b.xp}
                condition={b.condition}
                earned={earnedBadgeIds.has(b.badge.toLowerCase().replace(/ /g, "_"))}
              />
            ))}
          </div>
        </Section>

        {/* Milestone Bonuses */}
        <Section title="🏔️ Milestone Bonuses" description="Hit these checkpoints to earn big XP:">
          <div className="space-y-2">
            {MILESTONE_BONUSES.map((b) => (
              <BadgeRow
                key={b.badge}
                emoji={b.emoji}
                badge={b.badge}
                xp={b.xp}
                condition={b.condition}
                earned={earnedBadgeIds.has(b.badge.toLowerCase().replace(/ /g, "_"))}
              />
            ))}
          </div>
        </Section>

        {/* Tier Progression */}
        <Section title="🧗 Tier Progression" description="Climb the ranks as you earn XP:">
          <div className="space-y-2">
            {TIERS.map((t) => {
              const isActive = currentTier.emoji === t.emoji;
              const isReached = totalXp >= t.xpMin;
              return (
                <div
                  key={t.tier}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isActive
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : isReached
                      ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/10"
                      : "border-border bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{t.emoji}</span>
                    <div>
                      <p className={`font-medium ${isActive ? "text-primary" : "text-foreground"}`}>
                        {t.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold">{t.xpMin}+ XP</span>
                    {isActive && (
                      <p className="text-xs text-primary font-medium">← You are here</p>
                    )}
                    {isReached && !isActive && (
                      <p className="text-xs text-green-600">✓ Reached</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Max Possible XP */}
        <div className="rounded-xl border bg-gradient-to-r from-amber-50 to-green-50 dark:from-amber-950/20 dark:to-green-950/20 p-5 text-center space-y-2">
          <p className="text-lg font-bold text-foreground">
            🏆 Theoretical Maximum: ~725 XP
          </p>
          <p className="text-sm text-muted-foreground">
            A strong, engaged learner typically lands around <span className="font-semibold">400–450 XP</span> (Summit Seeker).
            Pinnacle Achiever (500+) requires consistent first-pass scores, staying on pace, and earning real bonuses — without demanding perfection.
          </p>
        </div>

        {/* Footer tip */}
        <div className="text-center pb-8">
          <p className="text-xs text-muted-foreground italic">
            Pro tip: Focus is 30% of your score. Stay on the tab, stay engaged. 🌲
          </p>
        </div>
      </div>
    </div>
  );
}

/* --- Helper Components --- */

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function ScoreCard({ weight, label, emoji, description }: { weight: string; label: string; emoji: string; description: string }) {
  return (
    <div className="rounded-lg border bg-card p-3 text-center space-y-1">
      <div className="text-2xl">{emoji}</div>
      <p className="text-lg font-bold text-primary">{weight}</p>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function PhaseStep({ number, emoji, title, description, isConditional }: { number: number; emoji: string; title: string; description: string; isConditional?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${isConditional ? "border-dashed border-amber-400/50 bg-amber-50/30 dark:bg-amber-950/10" : "bg-card"}`}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
        {number}
      </div>
      <span className="text-lg">{emoji}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {isConditional && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-medium">
          conditional
        </span>
      )}
    </div>
  );
}

function XpRow({ emoji, label, xp, description }: { emoji: string; label: string; xp: number; description: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <div>
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <span className="text-sm font-bold text-green-600">+{xp} XP</span>
    </div>
  );
}

function BadgeRow({ emoji, badge, xp, condition, earned }: { emoji: string; badge: string; xp: number; condition: string; earned: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${earned ? "bg-green-50/50 dark:bg-green-950/10 border-green-500/30" : "bg-card"}`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">{emoji}</span>
        <div>
          <p className="text-sm font-medium text-foreground">
            {badge}
            {earned && <span className="ml-2 text-xs text-green-600 font-medium">✓ earned</span>}
          </p>
          <p className="text-xs text-muted-foreground">{condition}</p>
        </div>
      </div>
      <span className="text-sm font-bold text-green-600">+{xp} XP</span>
    </div>
  );
}
