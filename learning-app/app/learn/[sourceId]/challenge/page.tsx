"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle, Brain, Sparkles, AlertCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Problem {
  id: string;
  type: string;
  text: string;
  difficulty: string;
}

export default function ChallengePage() {
  const router = useRouter();
  const params = useParams();
  const [step, setStep] = useState<"loading" | "problem" | "evaluating" | "feedback" | "complete">("loading");
  const [problems, setProblems] = useState<Problem[]>([]);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    // Simulate fetching problems
    const fetchProblems = async () => {
      try {
        const res = await fetch("/api/challenge/generate", { method: "POST" });
        const data = await res.json();
        setProblems(data.problems);
        setStep("problem");
      } catch (error) {
        console.error("Failed to load problems", error);
      }
    };

    fetchProblems();
  }, []);

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    setStep("evaluating");

    try {
      const res = await fetch("/api/challenge/evaluate", {
        method: "POST",
        body: JSON.stringify({
          answer,
          question: problems[currentProblemIndex].text
        }),
      });
      const data = await res.json();
      setFeedback(data.feedback);
      // You might want to store isCorrect to change UI state, but for now we just show feedback
      setStep("feedback");
    } catch (error) {
      console.error("Evaluation failed", error);
      setStep("problem"); // Retry
    }
  };

  const handleNext = () => {
    if (currentProblemIndex < problems.length - 1) {
      setCurrentProblemIndex((prev) => prev + 1);
      setAnswer("");
      setFeedback("");
      setStep("problem");
    } else {
      setStep("complete");
    }
  };

  const progressValue = ((currentProblemIndex + (step === "complete" ? 1 : 0)) / problems.length) * 100;

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
          <div className="flex items-center gap-4 w-1/3">
            <span className="text-xs text-muted-foreground font-mono">
              {currentProblemIndex + 1} / {problems.length}
            </span>
            <Progress value={progressValue} className="h-2" />
          </div>
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
                Analyzing the content to create deep, insightful problems just for you.
              </p>
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
                  <Textarea
                    placeholder="Type your answer here..."
                    className="min-h-[200px] bg-black/20 border-white/10 focus:border-primary/50 text-lg resize-none p-4"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="lg"
                      onClick={handleSubmit}
                      disabled={!answer.trim()}
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
              <Sparkles className="w-12 h-12 text-primary animate-spin-slow" />
              <p className="text-lg font-medium">Analyzing your reasoning...</p>
            </motion.div>
          )}

          {step === "feedback" && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="glass-card p-8 border-green-500/20 bg-green-500/5 shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-green-500/20 text-green-500 mt-1">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div className="space-y-4 flex-1">
                    <h3 className="text-xl font-semibold text-green-500">Correct Approach!</h3>
                    <p className="text-foreground/90 leading-relaxed">
                      {feedback}
                    </p>
                    <div className="pt-4 flex justify-end">
                      <Button onClick={handleNext} size="lg" variant="outline" className="border-green-500/30 hover:bg-green-500/10 hover:text-green-500">
                        Next Challenge <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="opacity-50 pointer-events-none grayscale blur-[1px]">
                {/* Show previous problem context faintly */}
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Problem Context:</h4>
                <p className="text-muted-foreground">{problems[currentProblemIndex].text}</p>
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
                You've successfully tackled the core concepts. We've generated a comprehensive set of notes based on your answers.
              </p>
              <div className="flex justify-center gap-4">
                <Button size="lg" variant="outline" onClick={() => router.push("/")}>
                  Return Home
                </Button>
                <Button size="lg" onClick={() => router.push(`/learn/${(params as any).sourceId}`)}>
                  View Notes <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
