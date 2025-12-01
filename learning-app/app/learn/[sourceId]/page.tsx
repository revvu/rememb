"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";

// Dynamic import to avoid SSR issues with ReactPlayer
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ReactPlayer = dynamic<any>(
  () => import("react-player").then((mod) => mod.default),
  { ssr: false, loading: () => <div className="w-full h-full bg-black flex items-center justify-center text-white">Loading player...</div> }
);
import { ChevronRight, ChevronLeft, Brain, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface Source {
  id: string;
  title: string;
  url: string;
  videoId: string;
  transcript: string;
  duration: number;
  thumbnail: string | null;
  breakpoints: string | null;
}

interface Breakpoint {
  timestamp: number;
  reason: string;
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
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint | null>(null);

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

  // Parse breakpoints from source
  const breakpoints: Breakpoint[] = source?.breakpoints
    ? JSON.parse(source.breakpoints)
    : [];

  // Enable challenge button when user reaches a breakpoint
  useEffect(() => {
    if (breakpoints.length === 0) {
      // Fallback: enable after 10% or 60 seconds if no breakpoints
      if (progress >= 10 || currentTime >= 60) {
        setReadyForChallenge(true);
      }
      return;
    }

    // Find the first breakpoint we've passed
    const passedBreakpoint = breakpoints.find(bp => currentTime >= bp.timestamp);
    if (passedBreakpoint && !readyForChallenge) {
      setReadyForChallenge(true);
      setCurrentBreakpoint(passedBreakpoint);
    }
  }, [currentTime, breakpoints.length, progress, readyForChallenge]);

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

  // Calculate next breakpoint and time remaining
  const nextUpcomingBreakpoint = breakpoints.find(bp => currentTime < bp.timestamp);
  const timeToNext = nextUpcomingBreakpoint ? nextUpcomingBreakpoint.timestamp - currentTime : null;

  // Format seconds as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-2">
            {/* Custom progress bar with breakpoint markers */}
            <div className="relative w-32 h-2 bg-secondary rounded-full overflow-visible">
              {/* Progress fill */}
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
              {/* Breakpoint markers */}
              {breakpoints.map((bp, i) => {
                const position = (bp.timestamp / source.duration) * 100;
                const isPassed = currentTime >= bp.timestamp;
                return (
                  <div
                    key={i}
                    className={`absolute top-1/2 w-2.5 h-2.5 rounded-full border-2 border-background ${
                      isPassed ? 'bg-primary' : 'bg-muted-foreground'
                    }`}
                    style={{ left: `${position}%`, transform: 'translate(-50%, -50%)' }}
                    title={bp.reason}
                  />
                );
              })}
            </div>
            <span>{Math.round(progress)}%</span>
            {timeToNext !== null && timeToNext > 0 && (
              <span className="text-primary font-medium">
                Challenge in {formatTime(timeToNext)}
              </span>
            )}
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
        <div className="flex-1 min-w-0 flex items-center justify-center bg-black relative group p-4">
          <div className="h-full max-w-full aspect-video shadow-2xl rounded-lg overflow-hidden border border-white/10 relative">
            <ReactPlayer
              src={source.url}
              width="100%"
              height="100%"
              playing={isPlaying}
              controls
              onReady={() => {
                console.log('Player ready');
                setPlayerReady(true);
              }}
              onError={(e: Error) => {
                console.error('Player error:', e);
                setPlayerError('Failed to load video. Please try again.');
              }}
              onTimeUpdate={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                const target = e.target as HTMLVideoElement;
                const currentTime = target.currentTime;
                const duration = target.duration || source.duration;
                const played = duration > 0 ? currentTime / duration : 0;
                console.log('TimeUpdate:', { currentTime, duration, played });
                setProgress(played * 100);
                setCurrentTime(currentTime);
              }}
              onPlay={() => {
                console.log('Play event');
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              config={{
                youtube: {
                  playerVars: {
                    showinfo: 0,
                    modestbranding: 1,
                    origin: typeof window !== 'undefined' ? window.location.origin : ''
                  }
                }
              }}
            />
            {/* Loading state */}
            {!playerReady && !playerError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                <Loader2 className="w-8 h-8 animate-spin text-white" />
              </div>
            )}
            {/* Error state */}
            {playerError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black text-white z-10">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
                  <p className="mb-4">{playerError}</p>
                  <Button onClick={() => { setPlayerError(null); setPlayerReady(false); }}>
                    Retry
                  </Button>
                </div>
              </div>
            )}
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
              className="h-full border-l border-border/40 bg-card/50 backdrop-blur-sm flex flex-col flex-shrink-0"
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

                  {breakpoints.length > 0 && (
                    <>
                      <Separator className="bg-border/50" />
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Challenge Points</h3>
                        {breakpoints.map((bp, i) => {
                          const isPassed = currentTime >= bp.timestamp;
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                                isPassed ? 'bg-primary/10' : 'hover:bg-white/5'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isPassed ? 'bg-primary' : 'bg-muted-foreground'}`} />
                              <span className="text-xs font-mono text-primary flex-shrink-0">{formatTime(bp.timestamp)}</span>
                              <span className="text-sm text-foreground/80 line-clamp-1">{bp.reason}</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

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
                        ? currentBreakpoint
                          ? `Good stopping point: ${currentBreakpoint.reason}. Click 'Start Challenge' to test your understanding.`
                          : "Great progress! Click 'Start Challenge' to test your understanding with AI-generated problems."
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
