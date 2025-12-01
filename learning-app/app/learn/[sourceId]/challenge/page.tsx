"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle, Brain, Sparkles, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  QuestionRenderer,
  Problem,
  formatAnswerForSubmission,
  isAnswerValid,
} from "@/components/questions/QuestionRenderer";

interface EvaluationResult {
  isCorrect: boolean;
  feedback: string;
  nextStep?: string;
}

type AnswerType = string | number | number[] | boolean | Record<number, number>;

export default function ChallengePage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const sourceId = params.sourceId as string;
  const sessionId = searchParams.get("sessionId");

  const [step, setStep] = useState<"loading" | "problem" | "evaluating" | "feedback" | "complete" | "error">("loading");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answer, setAnswer] = useState<AnswerType>("");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize answer based on problem type
  const initializeAnswer = (problem: Problem): AnswerType => {
    switch (problem.type) {
      case "multiple_choice":
        return -1; // No selection
      case "multi_select":
        return []; // No selections
      case "true_false":
        return "" as unknown as boolean; // Unset
      case "matching":
        return {}; // No matches
      case "ordering":
        return problem.options?.map((_, i) => i) || []; // Initial order
      default:
        return ""; // Text input
    }
  };

  useEffect(() => {
    const fetchProblems = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setStep("error");
        return;
      }

      try {
        const res = await fetch("/api/challenge/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to generate challenges");
        }

        const data = await res.json();
        if (!data.problems || data.problems.length === 0) {
          throw new Error("No problems were generated");
        }
        setProblems(data.problems);
        // Initialize answer for first problem
        setAnswer(initializeAnswer(data.problems[0]));
        setStep("problem");
      } catch (err) {
        console.error("Failed to load problems", err);
        setError(err instanceof Error ? err.message : "Failed to load problems");
        setStep("error");
      }
    };

    if (sessionId) {
      fetchProblems();
    }
  }, [sessionId]);

  const handleSubmit = async () => {
    const currentProblem = problems[currentProblemIndex];
    if (!isAnswerValid(currentProblem, answer)) return;

    setStep("evaluating");

    try {
      // Format answer for the API
      const formattedAnswer = formatAnswerForSubmission(currentProblem, answer);

      const res = await fetch("/api/challenge/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: currentProblem.id,
          question: currentProblem.text,
          answer: formattedAnswer,
          problemType: currentProblem.type,
          options: currentProblem.options,
          correctAnswer: currentProblem.correctAnswer
        }),
      });

      if (!res.ok) {
        throw new Error("Evaluation failed");
      }

      const data = await res.json();
      setEvaluation({
        isCorrect: data.isCorrect,
        feedback: data.feedback,
        nextStep: data.nextStep
      });
      setStep("feedback");
    } catch (err) {
      console.error("Evaluation failed", err);
      setError("Failed to evaluate your answer. Please try again.");
      setStep("problem");
    }
  };

  const handleNext = async () => {
    if (currentProblemIndex < problems.length - 1) {
      const nextIndex = currentProblemIndex + 1;
      setCurrentProblemIndex(nextIndex);
      setAnswer(initializeAnswer(problems[nextIndex]));
      setEvaluation(null);
      setStep("problem");
    } else {
      // Mark session as completed
      if (sessionId) {
        try {
          await fetch("/api/sessions", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId, status: "completed" })
          });
        } catch (err) {
          console.error("Failed to update session status:", err);
        }
      }
      setStep("complete");
    }
  };

  const progressValue = ((currentProblemIndex + (step === "complete" ? 1 : 0)) / Math.max(problems.length, 1)) * 100;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-3xl w-full space-y-8">
        {/* Header Progress */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-background/50 backdrop-blur-md border-primary/20">
              <Brain className="w-3 h-3 mr-2 text-primary" />
              Challenge Phase
            </Badge>
          </div>
          {problems.length > 0 && (
            <div className="flex items-center gap-4 w-1/3">
              <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                {currentProblemIndex + 1} / {problems.length}
              </span>
              <Progress value={progressValue} className="h-2" />
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {step === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center space-y-6 py-20"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <Brain className="w-16 h-16 text-primary animate-bounce relative z-10" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Generating Challenges...</h2>
              <p className="text-muted-foreground text-center max-w-md">
                Analyzing the transcript to create deep, insightful problems based on what you watched.
              </p>
            </motion.div>
          )}

          {step === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center space-y-6 py-20"
            >
              <div className="p-4 rounded-full bg-destructive/20">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Something went wrong</h2>
              <p className="text-muted-foreground text-center max-w-md">
                {error}
              </p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => router.push(`/learn/${sourceId}`)}>
                  Back to Video
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Try Again
                </Button>
              </div>
            </motion.div>
          )}

          {step === "problem" && problems.length > 0 && (
            <motion.div
              key="problem"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-6"
            >
              <Card className="glass-card p-8 border-primary/10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-blue-600" />
                <div className="mb-6">
                  <Badge variant="secondary" className="mb-4">
                    {problems[currentProblemIndex].type} • {problems[currentProblemIndex].difficulty}
                  </Badge>
                  <h3 className="text-2xl font-medium leading-relaxed">
                    {problems[currentProblemIndex].text}
                  </h3>
                </div>

                <div className="space-y-4">
                  <QuestionRenderer
                    problem={problems[currentProblemIndex]}
                    answer={answer}
                    onAnswerChange={setAnswer}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={handleSubmit}
                      disabled={!isAnswerValid(problems[currentProblemIndex], answer)}
                      className="px-8"
                    >
                      Submit Answer <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {step === "evaluating" && (
            <motion.div
              key="evaluating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-20 space-y-4"
            >
              <Sparkles className="w-12 h-12 text-primary animate-spin" />
              <p className="text-lg font-medium">Analyzing your reasoning...</p>
            </motion.div>
          )}

          {step === "feedback" && evaluation && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className={`glass-card p-8 shadow-2xl ${
                evaluation.isCorrect
                  ? "border-green-500/20 bg-green-500/5"
                  : "border-yellow-500/20 bg-yellow-500/5"
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full mt-1 ${
                    evaluation.isCorrect
                      ? "bg-green-500/20 text-green-500"
                      : "bg-yellow-500/20 text-yellow-500"
                  }`}>
                    {evaluation.isCorrect ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div className="space-y-4 flex-1">
                    <h3 className={`text-xl font-semibold ${
                      evaluation.isCorrect ? "text-green-500" : "text-yellow-500"
                    }`}>
                      {evaluation.isCorrect ? "Great thinking!" : "Good effort, but let's dig deeper"}
                    </h3>
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {evaluation.feedback}
                    </p>
                    {evaluation.nextStep && (
                      <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                        <h4 className="text-sm font-semibold text-primary mb-2">Next Step:</h4>
                        <p className="text-sm text-muted-foreground">{evaluation.nextStep}</p>
                      </div>
                    )}
                    <div className="pt-4 flex justify-end">
                      <Button
                        onClick={handleNext}
                        size="lg"
                        variant="outline"
                        className={
                          evaluation.isCorrect
                            ? "border-green-500/30 hover:bg-green-500/10 hover:text-green-500"
                            : "border-yellow-500/30 hover:bg-yellow-500/10 hover:text-yellow-500"
                        }
                      >
                        {currentProblemIndex < problems.length - 1 ? (
                          <>Next Challenge <ChevronRight className="w-4 h-4 ml-2" /></>
                        ) : (
                          <>Complete Session <CheckCircle className="w-4 h-4 ml-2" /></>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="opacity-50 pointer-events-none">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Your Answer:</h4>
                <p className="text-muted-foreground text-sm line-clamp-3">
                  {formatAnswerForSubmission(problems[currentProblemIndex], answer)}
                </p>
              </div>
            </motion.div>
          )}

          {step === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-10"
            >
              <div className="inline-flex p-6 rounded-full bg-primary/10 mb-4">
                <Sparkles className="w-16 h-16 text-primary" />
              </div>
              <h2 className="text-4xl font-bold">Session Complete!</h2>
              <p className="text-xl text-muted-foreground max-w-xl mx-auto">
                You've successfully tackled all the challenges. Great job engaging deeply with the content!
              </p>
              <div className="flex justify-center gap-4">
                <Button size="lg" variant="outline" onClick={() => router.push("/")}>
                  Return Home
                </Button>
                <Button size="lg" onClick={() => router.push(`/learn/${sourceId}`)}>
                  Back to Video <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
