import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type ClipInfo = { id: string; title: string; sortOrder: number };

export default function UnlockOverridePanel({ clips }: { clips: ClipInfo[] }) {
  const [selectedViewerId, setSelectedViewerId] = useState("");
  const [selectedClipId, setSelectedClipId] = useState("");
  const [reason, setReason] = useState("");

  const { data: viewersData, loading: loadingViewers } = useApiData("GetViewers", {});
  const { run: unlockClip, loading: unlocking } = useApi("UnlockClipForViewer");

  const handleUnlock = useCallback(async () => {
    if (!selectedViewerId || !selectedClipId) {
      toast.error("Select both a viewer and a clip");
      return;
    }
    try {
      await unlockClip({
        viewerId: selectedViewerId,
        clipId: selectedClipId,
        reason: reason.trim() || null,
      });
      toast.success("Clip unlocked for viewer!");
      setReason("");
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Unlock failed: " + message);
    }
  }, [selectedViewerId, selectedClipId, reason, unlockClip]);

  const viewers = viewersData?.viewers ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Icon icon="unlock" className="h-4 w-4" />
          Manual Unlock Override
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Unlock a specific clip for a viewer regardless of their current progress.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Viewer</Label>
            <Select value={selectedViewerId} onValueChange={setSelectedViewerId}>
              <SelectTrigger>
                <SelectValue placeholder={loadingViewers ? "Loading..." : "Select viewer"} />
              </SelectTrigger>
              <SelectContent>
                {viewers.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name} ({v.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Clip to Unlock</Label>
            <Select value={selectedClipId} onValueChange={setSelectedClipId}>
              <SelectTrigger><SelectValue placeholder="Select clip" /></SelectTrigger>
              <SelectContent>
                {clips.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.sortOrder}. {c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 space-y-1">
          <Label className="text-xs">Reason (optional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being unlocked?" />
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleUnlock} disabled={unlocking || !selectedViewerId || !selectedClipId}>
            {unlocking ? "Unlocking..." : "Unlock Clip"}
          </Button>
        </div>
      </Card>

      {/* Viewer list */}
      {viewers.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3">Registered Viewers ({viewers.length})</h3>
          <div className="space-y-1 max-h-64 overflow-auto">
            {viewers.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted text-xs">
                <span>{v.name}</span>
                <span className="text-muted-foreground">{v.email} • {v.role}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
