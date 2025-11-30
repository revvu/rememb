"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Send, CheckCircle, XCircle, Lightbulb, Code, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function ChallengePage() {
  const router = useRouter();
  const [answer, setAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<null | "correct" | "incorrect">(null);

  const handleSubmit = () => {
    if (!answer.trim()) return;

    setIsSubmitting(true);
    // Simulate AI grading
    setTimeout(() => {
      setIsSubmitting(false);
      setFeedback("correct"); // Mock success
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
        <Button variant="ghost" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Lesson
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Problem 1 of 3</Badge>
          <div className="text-sm text-muted-foreground">Neural Network Architecture</div>
        </div>
        <div className="w-24" /> {/* Spacer */}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Problem Statement */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <Card className="p-8 glass-card border-primary/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-transparent" />

            <h2 className="text-2xl font-bold mb-6 font-heading">Design a Perceptron</h2>

            <div className="prose prose-invert max-w-none text-muted-foreground">
              <p className="text-lg leading-relaxed">
                Construct a single perceptron (with weights and bias) that implements the logical <strong>NAND</strong> gate.
              </p>

              <div className="my-6 p-4 bg-black/20 rounded-lg border border-white/5 font-mono text-sm">
                Inputs: x₁, x₂ ∈ {0, 1}<br />
                Output: 1 if NOT (x₁ AND x₂), else 0
              </div>

              <p>
                Specify the weights (w₁, w₂) and bias (b) such that:
                <br />
                <code className="text-primary">output = step(w₁x₁ + w₂x₂ + b)</code>
              </p>

              <div className="mt-8 flex gap-2">
                <Badge variant="secondary">Logic Gates</Badge>
                <Badge variant="secondary">Linear Separability</Badge>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-blue-500/5 border-blue-500/10">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-400 mt-1 shrink-0" />
              <div>
                <h4 className="font-medium text-blue-400 text-sm">Hint</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Think about the decision boundary. You need a line that separates (1,1) from the other three points (0,0), (0,1), (1,0).
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Right: Answer Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col h-full"
        >
          <div className="flex-1 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium flex items-center gap-2">
                <Code className="w-4 h-4 text-primary" />
                Your Solution
              </h3>
              <span className="text-xs text-muted-foreground">Markdown supported</span>
            </div>

            <Textarea
              placeholder="Explain your reasoning and provide the values for w₁, w₂, and b..."
              className="flex-1 min-h-[300px] font-mono text-sm bg-card/50 resize-none focus-visible:ring-primary/50 p-6 leading-relaxed"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />

            <div className="flex justify-end pt-4">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting || !answer.trim() || feedback === "correct"}
                className={`w-full md:w-auto px-8 transition-all duration-300 ${feedback === "correct" ? "bg-green-500 hover:bg-green-600" : ""}`}
              >
                {isSubmitting ? (
                  "Evaluating..."
                ) : feedback === "correct" ? (
                  <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Correct</span>
                ) : (
                  <span className="flex items-center gap-2">Submit Answer <Send className="w-4 h-4" /></span>
                )}
              </Button>
            </div>
          </div>

          {/* Feedback Overlay */}
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-6 p-6 rounded-xl border ${feedback === "correct" ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
            >
              <div className="flex items-start gap-4">
                {feedback === "correct" ? (
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                )}

                <div className="space-y-2">
                  <h4 className={`font-bold ${feedback === "correct" ? "text-green-500" : "text-red-500"}`}>
                    {feedback === "correct" ? "Excellent Work!" : "Not quite right"}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feedback === "correct"
                      ? "You correctly identified that w₁ = -2, w₂ = -2, and b = 3 works perfectly. This creates a decision boundary that separates (1,1) from the rest."
                      : "Check your weights again. Remember that for NAND, only (1,1) should output 0."}
                  </p>

                  {feedback === "correct" && (
                    <Button variant="outline" size="sm" className="mt-4 group">
                      Next Problem <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
