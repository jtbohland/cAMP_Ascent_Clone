import { useState, useCallback } from "react";
import PasswordGate from "@/components/PasswordGate";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import QuestionEditor from "@/components/QuestionEditor";
import UnlockOverridePanel from "@/components/UnlockOverridePanel";

export default function AdminPage() {
  return (
    <PasswordGate>
      <AdminContent />
    </PasswordGate>
  );
}

function AdminContent() {
  const [activeTab, setActiveTab] = useState<"clips" | "questions" | "unlock">("clips");
  const [editingClipId, setEditingClipId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, loading, fetching, refetch } = useApiData("GetAdminClips", {});

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <div className="flex gap-1">
          {(["clips", "questions", "unlock"] as const).map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
            >
              {tab === "clips" ? "Clips" : tab === "questions" ? "Questions" : "Unlock Override"}
            </Button>
          ))}
        </div>
      </div>

      {activeTab === "clips" && (
        <ClipManagement
          data={data}
          loading={loading}
          fetching={fetching}
          refetch={refetch}
          showAddForm={showAddForm}
          setShowAddForm={setShowAddForm}
          editingClipId={editingClipId}
          setEditingClipId={setEditingClipId}
        />
      )}

      {activeTab === "questions" && (
        <QuestionEditor clips={data?.clips ?? []} />
      )}

      {activeTab === "unlock" && (
        <UnlockOverridePanel clips={data?.clips ?? []} />
      )}
    </div>
  );
}

type ClipManagementProps = {
  data: any;
  loading: boolean;
  fetching: boolean;
  refetch: () => void;
  showAddForm: boolean;
  setShowAddForm: (v: boolean) => void;
  editingClipId: string | null;
  setEditingClipId: (v: string | null) => void;
};

function ClipManagement({ data, loading, fetching, refetch, showAddForm, setShowAddForm, editingClipId, setEditingClipId }: ClipManagementProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
      </div>
    );
  }

  const clips = data?.clips ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{clips.length} clips</p>
        <Button onClick={() => { setShowAddForm(true); setEditingClipId(null); }}>
          <Icon icon="plus" className="h-4 w-4 mr-1" /> Add Clip
        </Button>
      </div>

      {fetching && !loading && <div className="text-xs text-muted-foreground">Updating…</div>}

      {(showAddForm || editingClipId) && (
        <ClipForm
          clipId={editingClipId}
          clips={clips}
          onSaved={() => { setShowAddForm(false); setEditingClipId(null); refetch(); }}
          onCancel={() => { setShowAddForm(false); setEditingClipId(null); }}
        />
      )}

      <div className={`space-y-2 ${fetching && !loading ? "opacity-70" : ""}`}>
        {clips.map((clip: any) => (
          <Card key={clip.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-xs font-bold">
                {clip.sortOrder}
              </div>
              <div>
                <p className="font-medium text-sm">{clip.title}</p>
                <p className="text-xs text-muted-foreground">
                  {clip.questionCount} questions • {clip.durationSeconds ? `${Math.floor(clip.durationSeconds / 60)}m` : "No duration"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={clip.status === "live" ? "default" : clip.status === "draft" ? "secondary" : "outline"}>
                {clip.status}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setEditingClipId(clip.id)}>
                <Icon icon="pencil" className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ClipForm({ clipId, clips, onSaved, onCancel }: { clipId: string | null; clips: any[]; onSaved: () => void; onCancel: () => void }) {
  const existing = clipId ? clips.find((c: any) => c.id === clipId) : null;

  const [title, setTitle] = useState(existing?.title ?? "");
  const [videoUrl, setVideoUrl] = useState(existing?.videoUrl ?? "");
  const [duration, setDuration] = useState(existing?.durationSeconds?.toString() ?? "");
  const [sortOrder, setSortOrder] = useState(existing?.sortOrder?.toString() ?? String(clips.length + 1));
  const [status, setStatus] = useState(existing?.status ?? "draft");
  const [transcript, setTranscript] = useState("");

  const { run: saveClip, loading } = useApi("SaveClip");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveClip({
        id: clipId,
        title: title.trim(),
        videoUrl: videoUrl.trim() || null,
        durationSeconds: duration ? parseInt(duration) : null,
        transcript: transcript.trim() || null,
        sortOrder: parseInt(sortOrder) || 1,
        status: status as "draft" | "live" | "archived",
      });
      toast.success(clipId ? "Clip updated!" : "Clip created!");
      onSaved();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Save failed: " + message);
    }
  }, [clipId, title, videoUrl, duration, sortOrder, status, transcript, saveClip, onSaved]);

  return (
    <Card className="p-4 border-primary/30">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">{clipId ? "Edit Clip" : "New Clip"}</h3>
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            <Icon icon="x" className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Day 1: Introduction" required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Video URL (Google Drive MP4)</Label>
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://drive.google.com/..." />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Duration (seconds)</Label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="3600" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Sort Order</Label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Transcript (optional)</Label>
          <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={3} placeholder="Paste transcript here..." />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Saving..." : "Save Clip"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
