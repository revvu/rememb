"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Play, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    // Simulate processing delay for "wow" effect
    setTimeout(() => {
      // Mock ID for now
      const mockId = "video-123";
      router.push(`/learn/${mockId}`);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] opacity-50" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-3xl w-full text-center space-y-8"
      >
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Badge variant="outline" className="px-4 py-1.5 rounded-full border-primary/30 bg-primary/10 text-primary-foreground text-sm backdrop-blur-md">
              <Sparkles className="w-3 h-3 mr-2 inline-block" />
              Deep Learning System v1.0
            </Badge>
          </motion.div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            Master complex topics <br />
            <span className="text-gradient-primary">without distraction.</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Transform passive watching into deep understanding.
            AI-generated challenges, Socratic discussions, and beautiful notes.
          </p>
        </div>

        <motion.form
          onSubmit={handleStart}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="max-w-xl mx-auto w-full relative group"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-xl opacity-30 group-hover:opacity-60 transition duration-500 blur"></div>
          <div className="relative flex items-center bg-card/80 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl">
            <Input
              type="text"
              placeholder="Paste a YouTube URL to begin..."
              className="border-none bg-transparent shadow-none focus-visible:ring-0 text-lg h-12 placeholder:text-muted-foreground/50"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button
              size="lg"
              type="submit"
              disabled={isLoading}
              className="h-12 px-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-300 shadow-lg shadow-primary/25"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">Processing...</span>
              ) : (
                <span className="flex items-center gap-2">Start <ArrowRight className="w-4 h-4" /></span>
              )}
            </Button>
          </div>
        </motion.form>

        {/* Mock Recent Sessions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="pt-16 w-full"
        >
          <p className="text-sm text-muted-foreground mb-6 uppercase tracking-widest font-medium">Recent Sessions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Neural Networks from Scratch", progress: 85, time: "2h 15m" },
              { title: "The Riemann Hypothesis", progress: 30, time: "45m" }
            ].map((session, i) => (
              <Card key={i} className="glass-card p-4 hover:bg-white/5 transition-colors cursor-pointer group border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{session.title}</h3>
                      <p className="text-xs text-muted-foreground">Last active: {session.time} ago</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-white/5 hover:bg-white/10">{session.progress}%</Badge>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
