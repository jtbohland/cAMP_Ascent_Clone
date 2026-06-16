import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type WeatherStormProps = {
  overview: string;
  takeaways: string[];
  timerMinutes: number;
  clipTitle: string;
  onTimerExpire: () => void;
};

export default function WeatherStorm({
  overview,
  takeaways,
  timerMinutes,
  clipTitle,
  onTimerExpire,
}: WeatherStormProps) {
  const [secondsLeft, setSecondsLeft] = useState(timerMinutes * 60);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (secondsLeft === 0) {
      onTimerExpire();
    }
  }, [secondsLeft, onTimerExpire]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = 1 - secondsLeft / (timerMinutes * 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl p-6 bg-card shadow-xl border-2 border-destructive/20">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⛈️</span>
            <h2 className="text-lg font-bold text-foreground">Weather the Storm</h2>
          </div>
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
            <Icon icon="clock" />
            <span className="text-sm font-mono font-bold text-foreground">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Timer progress bar */}
        <div className="w-full h-2 bg-muted rounded-full mb-5 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground mb-3">{clipTitle}</p>

        {/* Overview */}
        <div className="bg-muted/50 rounded-lg p-4 mb-5">
          <p className="text-sm text-foreground leading-relaxed">{overview}</p>
        </div>

        {/* Key Takeaways */}
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Icon icon="list" /> Key Takeaways
        </h3>
        <ul className="space-y-2 mb-5">
          {takeaways.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-foreground">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>

        {/* Auto-unlock notice */}
        <div className="rounded-lg bg-accent/10 border border-accent/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            🔓 Next clip will unlock automatically when the timer completes.
            Use this time to review the material above.
          </p>
        </div>

        {secondsLeft === 0 && (
          <div className="flex justify-center mt-4">
            <Button onClick={onTimerExpire}>
              <Icon icon="arrow-right" /> Continue
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
