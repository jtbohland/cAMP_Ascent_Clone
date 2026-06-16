import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type IncorrectQuestion = {
  id: string;
  triggerAtSeconds: number;
  questionText: string;
};

type RangerReportProps = {
  clipTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  onContinue: () => void;
  onSearchRescue: () => void;
  needsRecovery: boolean;
  incorrectQuestions?: IncorrectQuestion[];
  onTimestampClick?: (seconds: number) => void;
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RangerReport({
  clipTitle,
  totalQuestions,
  correctAnswers,
  score,
  onContinue,
  onSearchRescue,
  needsRecovery,
  incorrectQuestions = [],
  onTimestampClick,
}: RangerReportProps) {
  const missedCount = totalQuestions - correctAnswers;
  const isPerfect = missedCount === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="w-full max-w-lg p-6 bg-card shadow-xl border-2 border-primary/20 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-3xl">✨</span>
          <h2 className="text-xl font-bold text-primary">Ranger Report</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{clipTitle}</p>

        {/* Score display */}
        <div className="flex items-center justify-center gap-6 mb-5">
          <div className="text-center">
            <div className={`text-4xl font-bold ${score >= 80 ? 'text-primary' : 'text-destructive'}`}>
              {score}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Engagement</p>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {correctAnswers}/{totalQuestions}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Trail Markers</p>
          </div>
        </div>

        {/* Smokey Says — only if missed ≥ 1 question */}
        {!isPerfect && (
          <div className="rounded-lg bg-accent/10 border border-accent/30 p-4 mb-5">
            <div className="flex items-start gap-3">
              <span className="text-3xl flex-shrink-0">🐻</span>
              <div>
                <p className="font-bold text-sm text-foreground">
                  Smokey Says — Only YOU Can Prevent Knowledge Gaps!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {missedCount === 1
                    ? "You missed 1 Trail Marker. Review the moment below to solidify that concept."
                    : `You missed ${missedCount} Trail Markers. Review the moments below — these concepts will come up in the field.`}
                </p>
              </div>
            </div>

            {/* Timestamp links for incorrect Trail Markers */}
            {incorrectQuestions.length > 0 && (
              <div className="mt-3 pl-12 space-y-1.5">
                {incorrectQuestions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => onTimestampClick?.(q.triggerAtSeconds)}
                    className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer w-full text-left"
                  >
                    <span className="font-mono bg-primary/10 px-1.5 py-0.5 rounded text-xs">
                      {formatTimestamp(q.triggerAtSeconds)}
                    </span>
                    <span className="text-muted-foreground truncate">
                      {q.questionText}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Perfect score celebration */}
        {isPerfect && (
          <div className="rounded-lg bg-primary/10 border border-primary/30 p-4 mb-5 text-center">
            <span className="text-2xl">🌲</span>
            <p className="font-bold text-sm text-primary mt-1">
              Perfect run! Forest fully preserved.
            </p>
          </div>
        )}

        {/* Action */}
        <div className="flex justify-end gap-3">
          {needsRecovery ? (
            <Button onClick={onSearchRescue} variant="default">
              Continue to Search & Rescue 🚁
            </Button>
          ) : (
            <Button onClick={onContinue} variant="default">
              <Icon icon="arrow-right" />
              Continue to Next Clip
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
