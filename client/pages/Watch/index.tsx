import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import QuizOverlayV2 from "@/components/QuizOverlayV2";
import RangerReport from "@/components/RangerReport";
import SearchRescue from "@/components/SearchRescue";
import WeatherStorm from "@/components/WeatherStorm";
import { toast } from "sonner";
import { getClipEmoji } from "@/lib/clip-emojis";

type WatchPhase =
  | "watching"
  | "trail_marker"
  | "ranger_report"
  | "search_rescue"
  | "weather_storm"
  | "complete";

export default function WatchPage() {
  const { clipId } = useParams<{ clipId: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();

  // API data
  const { data: clipData, loading: clipLoading } = useApiData(
    "GetClipForWatching",
    { clipId: clipId ?? "", viewerId: viewer?.id ?? "" },
    { enabled: !!clipId && !!viewer?.id }
  );

  const { run: startSession } = useApi("StartSession");
  const { run: submitAnswer } = useApi("SubmitAnswer");
  const { run: endSession } = useApi("EndSession");
  const { run: awardXP } = useApi("AwardXP");
  const { run: completeClipPath } = useApi("CompleteClipPath");

  // State
  const [phase, setPhase] = useState<WatchPhase>("watching");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(new Set());
  const [correctCount, setCorrectCount] = useState(0);
  const [totalTrailMarkers, setTotalTrailMarkers] = useState(0);
  const [score, setScore] = useState(0);
  const [searchRescueScore, setSearchRescueScore] = useState<number | null>(null);
  const [searchRescueTriggered, setSearchRescueTriggered] = useState(false);
  const [weatherStormTriggered, setWeatherStormTriggered] = useState(false);
  const [engagementScore, setEngagementScore] = useState<number | null>(null);
  const [incorrectQuestions, setIncorrectQuestions] = useState<Array<{ id: string; triggerAtSeconds: number; questionText: string }>>([]);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [focusSeconds, setFocusSeconds] = useState(0);
  const [blurSeconds, setBlurSeconds] = useState(0);
  const isFocusedRef = useRef(true);

  // Separate trail marker questions from recovery questions
  const trailMarkers = useMemo(
    () =>
      (clipData?.questions ?? []).filter((q: any) => !q.isRecovery)
        .sort((a: any, b: any) => a.triggerAtSeconds - b.triggerAtSeconds),
    [clipData]
  );

  const recoveryQuestions = useMemo(
    () =>
      (clipData?.questions ?? []).filter((q: any) => q.isRecovery)
        .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
    [clipData]
  );

  // Start session on mount
  useEffect(() => {
    if (!clipId || !viewer?.id) return;
    startSession({ clipId, viewerId: viewer.id })
      .then((result: any) => {
        setSessionId(result?.sessionId ?? null);
      })
      .catch(console.error);
  }, [clipId, viewer?.id, startSession]);

  // Timer for elapsed tracking + focus/blur split
  useEffect(() => {
    if (phase === "watching") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
        if (isFocusedRef.current) {
          setFocusSeconds((s) => s + 1);
        } else {
          setBlurSeconds((s) => s + 1);
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      isFocusedRef.current = document.visibilityState === "visible";
    };
    const handleFocus = () => { isFocusedRef.current = true; };
    const handleBlur = () => { isFocusedRef.current = false; };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Check if we need to show a trail marker based on elapsed time
  useEffect(() => {
    if (phase !== "watching" || trailMarkers.length === 0) return;

    const nextUnanswered = trailMarkers.find(
      (q: any) => !answeredQuestions.has(q.id) && elapsedSeconds >= q.triggerAtSeconds
    );

    if (nextUnanswered) {
      const idx = trailMarkers.indexOf(nextUnanswered);
      setCurrentQuestionIdx(idx);
      setPhase("trail_marker");
    }
  }, [elapsedSeconds, phase, trailMarkers, answeredQuestions]);

  // Handle trail marker answer
  const handleTrailMarkerAnswer = useCallback(
    (selectedOption: number) => {
      const question = trailMarkers[currentQuestionIdx];
      if (!question || !sessionId) return;

      const correct = selectedOption === question.correctOption;
      if (correct) setCorrectCount((c) => c + 1);
      if (!correct) {
        setIncorrectQuestions((prev) => [...prev, {
          id: question.id,
          triggerAtSeconds: question.triggerAtSeconds,
          questionText: question.questionText,
        }]);
      }
      setAnsweredQuestions((prev) => new Set(prev).add(question.id));
      setTotalTrailMarkers((t) => t + 1);

      // Submit to backend
      submitAnswer({
        sessionId,
        questionId: question.id,
        selectedOption,
        isCorrect: correct,
      }).catch(console.error);
    },
    [trailMarkers, currentQuestionIdx, sessionId, submitAnswer]
  );

  // Continue after trail marker feedback
  const handleTrailMarkerContinue = useCallback(() => {
    setPhase("watching");
  }, []);

  // End video (user clicks "Finish Watching")
  const handleFinishWatching = useCallback(() => {
    // Mark all unseen trail markers as missed
    const allTrailMarkerCount = trailMarkers.length;
    setTotalTrailMarkers(allTrailMarkerCount || totalTrailMarkers);

    // Calculate score based on correct / total trail markers
    const finalTotal = allTrailMarkerCount || 1;
    const pct = Math.round((correctCount / finalTotal) * 100);
    setScore(pct);

    // End session with proper params
    if (sessionId) {
      const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
      endSession({
        sessionId,
        totalFocusSeconds: focusSeconds,
        totalBlurSeconds: blurSeconds,
        totalTimeSeconds: elapsedSeconds,
        clipDurationSeconds: clipDuration,
      }).then((res: any) => {
        // Use composite engagement score from backend
        if (res?.engagementScore !== undefined) {
          setEngagementScore(res.engagementScore);
          setScore(res.engagementScore);
        }
      }).catch(console.error);
    }

    // If passed first pass (>=80%), award XP immediately
    const passedFirstPass = Math.round((correctCount / (allTrailMarkerCount || 1)) * 100) >= 80;
    if (passedFirstPass && viewer?.id && clipId && sessionId) {
      const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
      awardXP({
        viewerId: viewer.id,
        clipId,
        sessionId,
        trailMarkerCorrect: correctCount,
        trailMarkerTotal: allTrailMarkerCount,
        passedFirstPass: true,
        searchRescueTriggered: false,
        searchRescueScore: null,
        searchRescueTotal: null,
        weatherStormTriggered: false,
        totalTimeSeconds: elapsedSeconds,
        clipDurationSeconds: clipDuration,
      }).then((res: any) => {
        if (res?.badgesEarned?.length > 0) {
          res.badgesEarned.forEach((b: any) => {
            toast.success(`${b.emoji} Badge earned: ${b.name} (+${b.xp} XP)`);
          });
        }
        if (res?.newTier) {
          toast.success(`${res.newTier.emoji} Tier up! You're now a ${res.newTier.name}!`);
        }
      }).catch(console.error);
    }

    setPhase("ranger_report");
  }, [trailMarkers, totalTrailMarkers, correctCount, sessionId, endSession, elapsedSeconds, viewer, clipId, clipData, awardXP]);

  // Search & Rescue complete
  const handleSearchRescueComplete = useCallback(
    (passed: boolean, rescueScore: number) => {
      setSearchRescueTriggered(true);
      setSearchRescueScore(rescueScore);

      // Award XP for the S&R outcome
      if (viewer?.id && clipId && sessionId) {
        const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
        const srTotal = recoveryQuestions.length;
        awardXP({
          viewerId: viewer.id,
          clipId,
          sessionId,
          trailMarkerCorrect: correctCount,
          trailMarkerTotal: trailMarkers.length,
          passedFirstPass: false,
          searchRescueTriggered: true,
          searchRescueScore: rescueScore,
          searchRescueTotal: srTotal,
          weatherStormTriggered: false,
          totalTimeSeconds: elapsedSeconds,
          clipDurationSeconds: clipDuration,
        }).then((res: any) => {
          if (res?.badgesEarned?.length > 0) {
            res.badgesEarned.forEach((b: any) => {
              toast.success(`${b.emoji} Badge earned: ${b.name} (+${b.xp} XP)`);
            });
          }
          if (res?.newTier) {
            toast.success(`${res.newTier.emoji} Tier up! You're now a ${res.newTier.name}!`);
          }
        }).catch(console.error);
      }

      if (passed) {
        // Unlock next clip via recovery path
        if (viewer?.id && clipId && sessionId) {
          completeClipPath({
            viewerId: viewer.id,
            clipId,
            sessionId,
            path: "search_rescue",
          }).catch(console.error);
        }
        navigate("/library");
      } else {
        // Failed recovery — go to Weather the Storm
        setPhase("weather_storm");
      }
    },
    [navigate, viewer, clipId, sessionId, clipData, elapsedSeconds, recoveryQuestions, correctCount, trailMarkers, awardXP, completeClipPath]
  );

  // Weather the Storm timer expired
  const handleWeatherExpire = useCallback(() => {
    setWeatherStormTriggered(true);

    // Unlock next clip via Weather the Storm path
    if (viewer?.id && clipId && sessionId) {
      completeClipPath({
        viewerId: viewer.id,
        clipId,
        sessionId,
        path: "weather_storm",
      }).catch(console.error);
    }

    // Award floor XP for Weather the Storm
    if (viewer?.id && clipId && sessionId) {
      const clipDuration = clipData?.clip?.durationSeconds ?? elapsedSeconds;
      awardXP({
        viewerId: viewer.id,
        clipId,
        sessionId,
        trailMarkerCorrect: correctCount,
        trailMarkerTotal: trailMarkers.length,
        passedFirstPass: false,
        searchRescueTriggered: true,
        searchRescueScore: searchRescueScore,
        searchRescueTotal: recoveryQuestions.length,
        weatherStormTriggered: true,
        totalTimeSeconds: elapsedSeconds,
        clipDurationSeconds: clipDuration,
      }).then((res: any) => {
        if (res?.xpAwarded) {
          toast.success(`+${res.xpAwarded} XP — persistence pays off!`);
        }
      }).catch(console.error);
    }

    navigate("/library");
  }, [navigate, viewer, clipId, sessionId, clipData, elapsedSeconds, correctCount, trailMarkers, searchRescueScore, recoveryQuestions, awardXP, completeClipPath]);

  // Loading state
  if (clipLoading || !clipData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading clip…</p>
        </div>
      </div>
    );
  }

  const clip = clipData.clip;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Video header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/library")}>
            <Icon icon="arrow-left" /> Back
          </Button>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {getClipEmoji(clip.sortOrder)} Clip {clip.sortOrder}: {clip.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {clip.durationSeconds && `Duration: ${Math.floor(clip.durationSeconds / 60)}:${String(clip.durationSeconds % 60).padStart(2, '0')}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            ⏱ {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, "0")}
          </span>
          {phase === "watching" && (
            <Button size="sm" variant="default" onClick={handleFinishWatching}>
              <Icon icon="check" /> Finish Watching
            </Button>
          )}
        </div>
      </div>

      {/* Video embed area */}
      <div className="flex-1 flex items-center justify-center bg-black relative">
          {clip.videoUrl ? (
          <iframe
            ref={videoRef}
            src={convertToEmbedUrl(clip.videoUrl)}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
            title={clip.title}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/70">
            <Icon icon="video" />
            <p className="text-sm">Video URL not yet configured</p>
            <p className="text-xs text-white/40">Clip will be available once the admin adds the video link</p>
          </div>
        )}
      </div>

      {/* Trail Marker Overlay */}
      {phase === "trail_marker" && trailMarkers[currentQuestionIdx] && (
        <QuizOverlayV2
          question={trailMarkers[currentQuestionIdx]}
          onAnswer={handleTrailMarkerAnswer}
          onContinue={handleTrailMarkerContinue}
        />
      )}

      {/* Ranger Report */}
      {phase === "ranger_report" && (
        <RangerReport
          clipTitle={`${getClipEmoji(clip.sortOrder)} ${clip.title}`}
          totalQuestions={trailMarkers.length || 1}
          correctAnswers={correctCount}
          score={score}
          needsRecovery={score < 80 && recoveryQuestions.length > 0}
          onContinue={() => navigate("/library")}
          onSearchRescue={() => setPhase("search_rescue")}
          incorrectQuestions={incorrectQuestions}
          onTimestampClick={(seconds) => {
            // Navigate back to video timestamp (resume watching)
            setPhase("watching");
            setElapsedSeconds(seconds);
          }}
        />
      )}

      {/* Search & Rescue */}
      {phase === "search_rescue" && (
        <SearchRescue
          questions={recoveryQuestions}
          onComplete={handleSearchRescueComplete}
        />
      )}

      {/* Weather the Storm */}
      {phase === "weather_storm" && clipData.weatherStorm && (
        <WeatherStorm
          overview={clipData.weatherStorm.overview}
          takeaways={clipData.weatherStorm.takeaways}
          timerMinutes={clipData.weatherStorm.timerMinutes}
          clipTitle={clip.title}
          onTimerExpire={handleWeatherExpire}
        />
      )}
    </div>
  );
}

/** Convert a Google Drive share link to embeddable preview URL */
function convertToEmbedUrl(url: string): string {
  // Google Drive links: https://drive.google.com/file/d/{FILE_ID}/view?usp=...
  const match = url.match(/\/file\/d\/([^/]+)/);
  if (match) {
    return `https://drive.google.com/file/d/${match[1]}/preview`;
  }
  return url;
}
