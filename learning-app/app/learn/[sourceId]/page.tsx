"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

// Dynamic import to avoid SSR issues with ReactPlayer
// Using react-player/youtube for YouTube-specific player
const ReactPlayer = dynamic(
  () => import("react-player/youtube"),
  { ssr: false, loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading player...</div> }
);
import { ChevronRight, ChevronLeft, Brain, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface Source {
  id: string;
  title: string;
  url: string;
  videoId: string;
  transcript: string;
  duration: number;
  thumbnail: string | null;
}

export default function LearningPage() {
  const params = useParams();
  const router = useRouter();
  const [source, setSource] = useState<Source | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [readyForChallenge, setReadyForChallenge] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Fetch source data
  useEffect(() => {
    async function fetchSource() {
      try {
        const response = await fetch(`/api/sources/${params.sourceId}`);
        if (!response.ok) {
          throw new Error('Source not found');
        }
        const data = await response.json();
        setSource(data.source);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load source');
      } finally {
        setIsLoading(false);
      }
    }

    if (params.sourceId) {
      fetchSource();
    }
  }, [params.sourceId]);

  // Enable challenge button after watching for a bit (or 10% progress)
  useEffect(() => {
    if (progress >= 10 || currentTime >= 60) {
      setReadyForChallenge(true);
    }
  }, [progress, currentTime]);

  // Parse transcript into timeline notes
  const parseTranscriptNotes = (transcript: string) => {
    const lines = transcript.split('\n').slice(0, 10); // First 10 lines for sidebar
    return lines.map(line => {
      const match = line.match(/\[(\d+:\d+)\]\s*(.*)/);
      if (match) {
        return { time: match[1], text: match[2] };
      }
      return { time: '0:00', text: line };
    }).filter(note => note.text.trim());
  };

  // Extract key concepts from transcript (simple word frequency approach)
  const extractKeyConcepts = (transcript: string): string[] => {
    const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'as', 'by', 'this', 'that', 'it', 'so', 'we', 'you', 'i', 'they', 'what', 'when', 'where', 'how', 'why', 'all', 'can', 'will', 'just', 'like', 'about', 'be', 'have', 'do', 'if', 'from', 'not', 'your', 'our', 'their', 'these', 'those', 'more', 'some', 'then', 'now', 'here', 'there', 'going', 'would', 'could', 'should', 'than', 'them', 'us', 'me', 'my', 'his', 'her', 'its', 'out', 'up', 'down', 'over', 'into', 'very', 'also', 'only', 'other', 'get', 'got', 'make', 'made', 'thing', 'things', 'way', 'because', 'think', 'know', 'see', 'look', 'want', 'give', 'take', 'come', 'say', 'said']);

    // Clean transcript and extract words
    const words = transcript.toLowerCase()
      .replace(/\[\d+:\d+\]/g, '') // Remove timestamps
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && !commonWords.has(word));

    // Count word frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Get top 6 words
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error || !source) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="w-12 h-12 text-destructive" />
          <h2 className="text-xl font-semibold">Source Not Found</h2>
          <p className="text-muted-foreground">{error || 'The requested video could not be found.'}</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const notes = parseTranscriptNotes(source.transcript);
  const keyConcepts = extractKeyConcepts(source.transcript);

  // Debug logging
  console.log('Video URL:', source.url);

  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border/40 bg-background/80 backdrop-blur-md flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="font-medium text-sm md:text-base truncate max-w-[300px] md:max-w-none">
            {source.title}
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
            onClick={() => router.push(`/learn/${params.sourceId}/challenge`)}
            className={`transition-all duration-500 ${readyForChallenge ? "animate-pulse shadow-[0_0_15px_rgba(var(--primary),0.5)]" : "opacity-50"}`}
            disabled={!readyForChallenge}
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
            <ReactPlayer
              url={source.url}
              width="100%"
              height="100%"
              playing={isPlaying}
              controls
              onProgress={(state) => {
                setProgress(state.played * 100);
                setCurrentTime(state.playedSeconds);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              config={{
                youtube: {
                  playerVars: { showinfo: 0, modestbranding: 1 }
                }
              }}
            />
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
                <Badge variant="outline" className="text-[10px] h-5">From Transcript</Badge>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Key Concepts</h3>
                    <div className="flex flex-wrap gap-2">
                      {keyConcepts.map(tag => (
                        <Badge key={tag} variant="secondary" className="hover:bg-primary/20 transition-colors cursor-pointer">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Separator className="bg-border/50" />

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Timeline</h3>
                    {notes.slice(0, 8).map((note, i) => (
                      <div key={i} className="flex gap-3 group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                        <div className="text-xs font-mono text-primary pt-1 flex-shrink-0">{note.time}</div>
                        <div className="text-sm text-foreground/80 group-hover:text-foreground line-clamp-2">{note.text}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 mt-8">
                    <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                      <Brain className="w-3 h-3" />
                      Ready to Test Your Understanding?
                    </h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {readyForChallenge
                        ? "Great progress! Click 'Start Challenge' to test your understanding with AI-generated problems."
                        : "Watch a bit more of the video to unlock challenges."}
                    </p>
                  </div>
                </div>
              </ScrollArea>

              <div className="p-4 border-t border-border/40">
                <Button className="w-full" variant="secondary" disabled>
                  Export Notes (Coming Soon)
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
