import { useApiData } from "@/hooks/useApiData";
import { useViewer } from "@/components/ViewerContext";

const BADGE_META: Record<string, { name: string; emoji: string }> = {
  perfect_hiker: { name: "Perfect Hiker", emoji: "🌲" },
  speed_hiker: { name: "Speed Hiker", emoji: "🥾" },
  search_and_rescue_hero: { name: "Search & Rescue Hero", emoji: "🚁" },
  double_summit: { name: "Double Summit", emoji: "⛰️" },
  storm_chaser: { name: "Storm Chaser", emoji: "⛈️" },
  no_detours: { name: "No Detours", emoji: "🧭" },
  leave_no_trace: { name: "Leave No Trace", emoji: "🌱" },
  on_the_trail: { name: "On the Trail", emoji: "📅" },
  the_ascent: { name: "The Ascent", emoji: "🧗" },
  first_step: { name: "First Step", emoji: "🎬" },
  halfway: { name: "Halfway Up", emoji: "🏔️" },
  week_4_entry: { name: "Into the Summit Push", emoji: "🩢" },
  summit: { name: "Summit Reached", emoji: "🏔️✨" },
  mystery: { name: "The Ranger's Secret", emoji: "🌲" },
};

export default function XpProgressBar() {
  const { viewer } = useViewer();
  const { data, loading } = useApiData(
    "GetLearnerProgress",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  if (loading || !data) {
    return (
      <div className="w-full rounded-xl border bg-card p-4 animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-3" />
        <div className="h-4 bg-muted rounded-full w-full mb-2" />
        <div className="h-4 bg-muted rounded w-1/4" />
      </div>
    );
  }

  const { totalXp, tier, nextTier, progressPercent, badges, clipsCompleted } = data;

  return (
    <div className="w-full rounded-xl border bg-card p-4 shadow-sm">
      {/* Tier & XP Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{tier.emoji}</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{tier.name}</h3>
            <p className="text-xs text-muted-foreground">
              {clipsCompleted}/17 clips completed
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-primary">{totalXp} XP</span>
          {nextTier && (
            <p className="text-xs text-muted-foreground">
              {nextTier.xpMin - totalXp} XP to {nextTier.name}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 w-full rounded-full bg-muted overflow-hidden mb-3">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Tier labels */}
      {nextTier && (
        <div className="flex justify-between text-xs text-muted-foreground mb-3">
          <span>{tier.emoji} {tier.name}</span>
          <span>{nextTier.emoji} {nextTier.name}</span>
        </div>
      )}
      {!nextTier && (
        <p className="text-xs text-center text-green-600 font-medium mb-3">
          ✨ Max tier reached! You've conquered the Ascent.
        </p>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">Badges Earned</p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => {
              const meta = BADGE_META[b.badgeId];
              return (
                <span
                  key={`${b.badgeId}-${b.clipId ?? 'global'}`}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                  title={meta?.name ?? b.badgeId}
                >
                  {meta?.emoji ?? "🏅"} {meta?.name ?? b.badgeId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Mystery badge teaser — only show if they haven't earned it yet */}
      {badges.length > 0 && !badges.some(b => b.badgeId === "mystery") && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground italic">
            🌲 ???
          </span>
        </div>
      )}
    </div>
  );
}
