import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type RecoveryQuestion = {
  id: string;
  questionText: string;
  options: string[];
  correctOption: number;
  sortOrder: number;
  correctFeedback: { emoji: string; label: string; explanation: string } | null;
  incorrectFeedback: { emoji: string; label: string; explanation: string } | null;
};

type SearchRescueProps = {
  questions: RecoveryQuestion[];
  onComplete: (passed: boolean, score: number) => void;
};

export default function SearchRescue({ questions, onComplete }: SearchRescueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const question = questions[currentIndex];
  const total = questions.length;

  const handleSelect = useCallback(
    (optIndex: number) => {
      if (showFeedback) return;
      setSelectedOption(optIndex);
      const correct = optIndex === question.correctOption;
      setIsCorrect(correct);
      if (correct) setCorrectCount((c) => c + 1);
      setShowFeedback(true);
    },
    [showFeedback, question]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= total) {
      // Finished all recovery questions
      const finalCorrect = correctCount + (isCorrect && !showFeedback ? 0 : 0);
      // correctCount already updated via setCorrectCount above
      const pct = Math.round((correctCount / total) * 100);
      onComplete(pct >= 80, pct);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setIsCorrect(false);
    }
  }, [currentIndex, total, correctCount, isCorrect, showFeedback, onComplete]);

  const feedback = isCorrect
    ? question?.correctFeedback
    : question?.incorrectFeedback;

  if (!question) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl p-6 bg-card shadow-xl border-2 border-accent/30">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚁</span>
            <h2 className="text-lg font-bold text-accent-foreground">Search & Rescue</h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {currentIndex + 1} / {total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-muted rounded-full mb-5">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
          />
        </div>

        {/* Question text */}
        <p className="text-foreground font-medium mb-5 leading-relaxed">
          {question.questionText}
        </p>

        {/* Options */}
        <div className="flex flex-col gap-2 mb-4">
          {question.options.map((option, idx) => {
            let optionStyle =
              "border border-border bg-background hover:border-accent/50 hover:bg-accent/5";

            if (showFeedback) {
              if (idx === question.correctOption) {
                optionStyle = "border-2 border-green-600 bg-green-50 text-green-900";
              } else if (idx === selectedOption && !isCorrect) {
                optionStyle = "border-2 border-red-500 bg-red-50 text-red-900";
              } else {
                optionStyle = "border border-border bg-muted/50 opacity-50";
              }
            } else if (idx === selectedOption) {
              optionStyle = "border-2 border-accent bg-accent/10";
            }

            return (
              <button
                key={idx}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all text-sm font-medium cursor-pointer ${optionStyle}`}
                onClick={() => handleSelect(idx)}
                disabled={showFeedback}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full border border-current/20 flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {option}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {showFeedback && feedback && (
          <div
            className={`rounded-lg p-4 mb-4 border ${
              isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-2xl">{feedback.emoji}</span>
              <div>
                <p className={`font-bold text-sm ${isCorrect ? "text-green-800" : "text-red-800"}`}>
                  {feedback.label}
                </p>
                <p className={`text-sm mt-1 leading-relaxed ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                  {feedback.explanation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Next button */}
        {showFeedback && (
          <div className="flex justify-end">
            <Button onClick={handleNext}>
              {currentIndex + 1 >= total ? (
                <><Icon icon="flag" /> Finish</>
              ) : (
                <><Icon icon="arrow-right" /> Next Question</>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
