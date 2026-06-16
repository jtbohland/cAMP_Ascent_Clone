import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type ClipInfo = { id: string; title: string; sortOrder: number };

type QuestionItem = {
  questionText: string;
  options: string[];
  correctOption: number;
  triggerAtSeconds: number;
  sortOrder: number;
  isRecovery: boolean;
};

export default function QuestionEditor({ clips }: { clips: ClipInfo[] }) {
  const [selectedClipId, setSelectedClipId] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const { data: clipQuestions, loading } = useApiData("GetClipQuestions", {
    clipId: selectedClipId || "00000000-0000-0000-0000-000000000000",
  }, { enabled: !!selectedClipId });

  const { run: saveQuestions, loading: saving } = useApi("SaveQuestions");

  // Sync loaded questions to local state
  const loadExisting = useCallback(() => {
    if (clipQuestions?.questions) {
      setQuestions(clipQuestions.questions.map(q => ({
        questionText: q.questionText,
        options: q.options,
        correctOption: q.correctOption,
        triggerAtSeconds: q.triggerAtSeconds,
        sortOrder: q.sortOrder,
        isRecovery: q.isRecovery,
      })));
    }
  }, [clipQuestions]);

  const handleSave = useCallback(async () => {
    if (!selectedClipId) return;
    try {
      await saveQuestions({ clipId: selectedClipId, questions });
      toast.success(`Saved ${questions.length} questions!`);
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Save failed: " + message);
    }
  }, [selectedClipId, questions, saveQuestions]);

  const handleBulkParse = useCallback(() => {
    // Parse a simple format: Q: ... / A: opt1, opt2, opt3, opt4 / Correct: 0 / Time: 120 / Recovery: false
    try {
      const parsed: QuestionItem[] = [];
      const blocks = bulkText.split("\n\n").filter(b => b.trim());

      blocks.forEach((block, idx) => {
        const lines = block.split("\n").map(l => l.trim());
        const qLine = lines.find(l => l.startsWith("Q:"));
        const aLine = lines.find(l => l.startsWith("A:"));
        const cLine = lines.find(l => l.startsWith("Correct:"));
        const tLine = lines.find(l => l.startsWith("Time:"));
        const rLine = lines.find(l => l.startsWith("Recovery:"));

        if (qLine && aLine) {
          parsed.push({
            questionText: qLine.replace("Q:", "").trim(),
            options: aLine.replace("A:", "").trim().split(",").map(o => o.trim()),
            correctOption: cLine ? parseInt(cLine.replace("Correct:", "").trim()) : 0,
            triggerAtSeconds: tLine ? parseInt(tLine.replace("Time:", "").trim()) : 0,
            sortOrder: idx + 1,
            isRecovery: rLine ? rLine.replace("Recovery:", "").trim().toLowerCase() === "true" : false,
          });
        }
      });

      if (parsed.length > 0) {
        setQuestions(parsed);
        setShowBulkUpload(false);
        setBulkText("");
        toast.success(`Parsed ${parsed.length} questions`);
      } else {
        toast.error("No questions could be parsed. Check the format.");
      }
    } catch {
      toast.error("Failed to parse questions");
    }
  }, [bulkText]);

  const addQuestion = useCallback(() => {
    setQuestions(prev => [...prev, {
      questionText: "",
      options: ["", "", "", ""],
      correctOption: 0,
      triggerAtSeconds: 0,
      sortOrder: prev.length + 1,
      isRecovery: false,
    }]);
  }, []);

  const updateQuestion = useCallback((index: number, field: string, value: any) => {
    setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
  }, []);

  const removeQuestion = useCallback((index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="space-y-4">
      {/* Clip selector */}
      <div className="flex items-center gap-3">
        <div className="w-64">
          <Select value={selectedClipId} onValueChange={(v) => { setSelectedClipId(v); setQuestions([]); }}>
            <SelectTrigger><SelectValue placeholder="Select a clip" /></SelectTrigger>
            <SelectContent>
              {clips.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.sortOrder}. {c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedClipId && (
          <>
            <Button variant="outline" size="sm" onClick={loadExisting} disabled={loading}>
              <Icon icon="download" className="h-3 w-3 mr-1" /> Load Existing
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowBulkUpload(!showBulkUpload)}>
              <Icon icon="file-text" className="h-3 w-3 mr-1" /> Bulk Upload
            </Button>
            <Button variant="outline" size="sm" onClick={addQuestion}>
              <Icon icon="plus" className="h-3 w-3 mr-1" /> Add Question
            </Button>
          </>
        )}
      </div>

      {/* Bulk upload */}
      {showBulkUpload && (
        <Card className="p-4 border-primary/30">
          <Label className="text-xs">Paste questions in bulk format:</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Format (separate questions with blank line):<br/>
            Q: Question text<br/>
            A: Option 1, Option 2, Option 3, Option 4<br/>
            Correct: 0<br/>
            Time: 120<br/>
            Recovery: false
          </p>
          <Textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={8} placeholder="Paste here..." />
          <div className="flex gap-2 mt-2">
            <Button size="sm" onClick={handleBulkParse}>Parse</Button>
            <Button size="sm" variant="outline" onClick={() => setShowBulkUpload(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Question list */}
      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <Card key={idx} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                    {q.isRecovery && <Badge variant="secondary" className="text-[10px]">Recovery</Badge>}
                  </div>
                  <Input
                    value={q.questionText}
                    onChange={(e) => updateQuestion(idx, "questionText", e.target.value)}
                    placeholder="Question text"
                    className="text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oi) => (
                      <Input
                        key={oi}
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...q.options];
                          newOptions[oi] = e.target.value;
                          updateQuestion(idx, "options", newOptions);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        className={`text-xs ${oi === q.correctOption ? "border-[oklch(0.65_0.2_145)]" : ""}`}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <div className="w-20">
                      <Label className="text-[10px]">Correct</Label>
                      <Input type="number" min={0} max={3} value={q.correctOption}
                        onChange={(e) => updateQuestion(idx, "correctOption", parseInt(e.target.value))}
                        className="text-xs" />
                    </div>
                    <div className="w-24">
                      <Label className="text-[10px]">Time (sec)</Label>
                      <Input type="number" value={q.triggerAtSeconds}
                        onChange={(e) => updateQuestion(idx, "triggerAtSeconds", parseInt(e.target.value) || 0)}
                        className="text-xs" />
                    </div>
                    <div className="w-20">
                      <Label className="text-[10px]">Recovery?</Label>
                      <Select value={q.isRecovery ? "true" : "false"}
                        onValueChange={(v) => updateQuestion(idx, "isRecovery", v === "true")}>
                        <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeQuestion(idx)}>
                  <Icon icon="trash-2" className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : `Save ${questions.length} Questions`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ variant, className, children }: { variant?: string; className?: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground ${className}`}>{children}</span>;
}
