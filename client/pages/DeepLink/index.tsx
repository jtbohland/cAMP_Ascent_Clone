import { useParams, useNavigate, Link } from "react-router";
import { useViewer } from "@/components/ViewerContext";
import { useApiData } from "@/hooks/useApiData.js";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClipEmoji } from "@/lib/clip-emojis";

/**
 * Deep link route: /clip/:sortOrder
 * Routes learners based on their state:
 * - Not registered → Registration form (handled by App/Library) → then starts at Clip 1
 * - Registered, clip not unlocked → Message + link back to library
 * - Registered, clip unlocked → Straight into the video
 */
export default function DeepLinkPage() {
  const { sortOrder } = useParams<{ sortOrder: string }>();
  const navigate = useNavigate();
  const { viewer } = useViewer();

  const sortNum = parseInt(sortOrder ?? "1", 10);

  // If not registered, redirect to library (which shows registration form)
  // After registration, they’ll start at Clip 1 per spec
  useEffect(() => {
    if (!viewer) {
      navigate("/", { replace: true });
    }
  }, [viewer, navigate]);

  // Fetch the clip library to check unlock status
  const { data, loading } = useApiData(
    "GetClipLibrary",
    { viewerId: viewer?.id ?? "" },
    { enabled: !!viewer?.id }
  );

  // Loading state
  if (!viewer || loading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  const clips = data.clips ?? [];
  const targetClip = clips.find((c: any) => c.sortOrder === sortNum);

  if (!targetClip) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md p-6 text-center">
          <span className="text-4xl mb-3 block">❌</span>
          <h2 className="text-lg font-bold mb-2">Clip Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">
            There is no clip #{sortNum} in the program.
          </p>
          <Link to="/library">
            <Button variant="default">Back to Library</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Check if this clip is unlocked
  const isUnlocked = (targetClip as any)?.unlocked === true;
  const isAdmin = viewer?.isAdmin === true;

  // If unlocked or admin, go straight to video
  useEffect(() => {
    if (isUnlocked || isAdmin) {
      navigate(`/watch/${targetClip.id}`, { replace: true });
    }
  }, [isUnlocked, isAdmin, targetClip, navigate]);

  // If we're still here, clip is locked
  if (!isUnlocked && !isAdmin) {
    // Find the previous clip the learner needs to complete
    const prevClip = clips.find((c: any) => c.sortOrder === sortNum - 1);
    const prevTitle = prevClip ? `${getClipEmoji(prevClip.sortOrder)} Day ${prevClip.sortOrder}: ${prevClip.title}` : "the previous clip";

    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md p-6 text-center">
          <span className="text-4xl mb-3 block">🔒</span>
          <h2 className="text-lg font-bold mb-2">Clip Locked</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Complete <strong>{prevTitle}</strong> first to unlock this clip.
          </p>
          <Link to="/library">
            <Button variant="default">🎬 Back to cAMP Clips</Button>
          </Link>
        </Card>
      </div>
    );
  }

  // Fallback loading while redirect happens
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}
