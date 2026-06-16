import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getClipEmoji } from "@/lib/clip-emojis";

type ClipLibraryCardProps = {
  clip: {
    id: string;
    title: string;
    sortOrder: number;
    videoUrl: string | null;
    durationSeconds: number | null;
  };
  isLocked: boolean;
  isCompleted: boolean;
  score: number | null;
  onWatch: () => void;
};

export default function ClipLibraryCard({
  clip,
  isLocked,
  isCompleted,
  score,
  onWatch,
}: ClipLibraryCardProps) {
  const statusBadge = () => {
    if (isCompleted) {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          <Icon icon="check-circle" /> Completed
          {score !== null && <span className="ml-1">({score}%)</span>}
        </span>
      );
    }
    if (isLocked) {
      return (
        <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
          <Icon icon="lock" /> Locked
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground">
        <Icon icon="play" /> Ready
      </span>
    );
  };

  return (
    <Card
      className={`p-4 transition-all duration-200 ${
        isLocked
          ? "opacity-60 border-border"
          : "hover:shadow-md hover:border-primary/30 cursor-pointer border-border"
      }`}
      onClick={!isLocked ? onWatch : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Day emoji badge */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-lg">
              {getClipEmoji(clip.sortOrder)}
            </span>
          </div>

          <div className="flex flex-col gap-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground leading-tight truncate">
              {clip.title}
            </h3>
            {clip.durationSeconds && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Icon icon="clock" /> {Math.floor(clip.durationSeconds / 60)}:{String(clip.durationSeconds % 60).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {statusBadge()}
          {!isLocked && (
            <Button size="sm" variant={isCompleted ? "outline" : "default"} onClick={(e) => {
              e.stopPropagation();
              onWatch();
            }}>
              <Icon icon={isCompleted ? "rotate-ccw" : "play"} />
              {isCompleted ? "Rewatch" : "Watch"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
