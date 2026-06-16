import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { useViewer } from "@/components/ViewerContext";
import ClipLibraryCard from "@/components/ClipLibraryCard";
import RegistrationForm from "@/components/RegistrationForm";
import XpProgressBar from "@/components/XpProgressBar";

export default function LibraryPage() {
  const navigate = useNavigate();
  const { viewer, isLoading: viewerLoading } = useViewer();

  const { data, loading } = useApiData(
    "GetClipLibrary",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  const clips = useMemo(() => data?.clips ?? [], [data]);

  // Show registration if no viewer
  if (!viewerLoading && !viewer) {
    return <RegistrationForm />;
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🎬</span>
          <div>
            <h1 className="text-2xl font-bold text-foreground">cAMP Clips</h1>
            <p className="text-sm text-muted-foreground">
              Your training journey awaits. Watch each clip, answer Trail Markers, and earn your Ranger Report.
            </p>
          </div>
        </div>
        {/* Skeleton */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-20 bg-muted rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full overflow-auto">
      {/* XP Progress Bar */}
      <XpProgressBar />

      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">🎬</span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">cAMP Clips</h1>
          <p className="text-sm text-muted-foreground">
            Watch each clip, answer Trail Markers 🪧, and earn your Ranger Report ✨
          </p>
        </div>
      </div>

      {/* Clip list */}
      <div className="flex flex-col gap-3">
        {clips.map((clip: any) => (
          <ClipLibraryCard
            key={clip.id}
            clip={clip}
            isLocked={!clip.unlocked}
            isCompleted={clip.completed}
            score={clip.bestScore}
            onWatch={() => navigate(`/watch/${clip.id}`)}
          />
        ))}
      </div>

      {clips.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <span className="text-4xl block mb-3">🌲</span>
          <p className="text-sm">No clips available yet. Check back soon!</p>
        </div>
      )}
    </div>
  );
}
