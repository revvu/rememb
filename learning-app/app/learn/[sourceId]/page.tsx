"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactPlayer from "react-player";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Brain, FileText, Play, Pause, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function LearningPage() {
  const params = useParams();
  const router = useRouter();
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [readyForChallenge, setReadyForChallenge] = useState(false);

  // Mock data
  const videoUrl = "https://www.youtube.com/watch?v=aircAruvnKk"; // 3Blue1Brown Neural Networks
  const notes = [
    { time: "0:00", text: "Introduction to Neural Networks" },
    { time: "2:15", text: "The structure of a neuron" },
    { time: "5:30", text: "Weights and Biases explained" },
    { time: "8:45", text: "Activation functions (Sigmoid)" },
  ];

  // Simulate "ready for challenge" after 5 seconds for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setReadyForChallenge(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="font-medium text-sm md:text-base truncate max-w-[300px] md:max-w-none">
            But what is a Neural Network? | Chapter 1, Deep Learning
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground mr-2">
            <Progress value={progress} className="w-24 h-2" />
            <span>{Math.round(progress)}%</span>
          </div>
          <Button
            variant={readyForChallenge ? "default" : "secondary"}
            size="sm"
            onClick={() => router.push(`/learn/${(params as any).sourceId}/challenge`)}
            className={`transition-all duration-500 ${readyForChallenge ? "animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.5)]" : "opacity-50"}`}
          >
            <Brain className="w-4 h-4 mr-2" />
            Start Challenge
          </Button>
          <Button variant="outline" size="icon" onClick={() => setIsNotesOpen(!isNotesOpen)}>
            {isNotesOpen ? <ChevronRight className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex items-center justify-center bg-black relative group">
          <div className="w-full h-full max-w-6xl max-h-[80vh] aspect-video shadow-2xl rounded-lg overflow-hidden border border-white/10">
            {(() => {
              const ReactPlayerAny = ReactPlayer as any;
              return <ReactPlayerAny
                url={videoUrl}
                width="100%"
                height="100%"
                playing={isPlaying}
                controls
                onProgress={(state: any) => setProgress(state.played * 100)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                config={{
                  youtube: {
                    playerVars: { showinfo: 0, modestbranding: 1 }
                  } as any
                }}
              />
            })()}
          </div>

          {/* Ambient Glow */}
          <div className="absolute inset-0 bg-primary/5 pointer-events-none z-0" />
        </div>

        {/* Notes Sidebar */}
        <AnimatePresence>
          {isNotesOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 350, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full border-l border-border/40 bg-card/50 backdrop-blur-sm flex flex-col"
            >
              <div className="p-4 border-b border-border/40 flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Smart Notes
                </h2>
                <Badge variant="outline" className="text-[10px] h-5">Auto-Generated</Badge>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key Concepts</h3>
                    <div className="flex flex-wrap gap-2">
                      {["Neuron", "Perceptron", "Sigmoid", "Weights", "Biases"].map(tag => (
                        <Badge key={tag} variant="secondary" className="hover:bg-primary/20 transition-colors cursor-pointer">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border/50" />

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Timeline</h3>
                    {notes.map((note, i) => (
                      <div key={i} className="flex gap-3 group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                        <div className="text-xs font-mono text-primary pt-1">{note.time}</div>
                        <div className="text-sm text-foreground/80 group-hover:text-foreground">{note.text}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mt-8">
                    <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                      <Brain className="w-3 h-3" />
                      Insight
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      The "learning" in deep learning refers to the automatic adjustment of weights and biases to minimize the cost function.
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border/40">
                <Button className="w-full" variant="secondary">
                  Export Notes
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
