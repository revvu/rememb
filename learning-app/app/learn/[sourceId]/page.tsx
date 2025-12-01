"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { useViewerId } from "@/lib/useViewerId";

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
}

export default function LearningPage() {
  const params = useParams();
  const router = useRouter();
  const viewerId = useViewerId();
  const [source, setSource] = useState<Source | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [lastCheckpoint, setLastCheckpoint] = useState(0);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  // Fetch source data with retry logic for database consistency
  useEffect(() => {
    async function fetchWithRetry(url: string, retries = 3, delay = 500): Promise<Response> {
      for (let i = 0; i < retries; i++) {
        const response = await fetch(url);
        if (response.ok) return response;
        if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)));
      }
      throw new Error('Source not found');
    }

    async function fetchSource() {
      try {
        const response = await fetchWithRetry(`/api/sources/${params.sourceId}`);
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

  // Fetch last checkpoint from previous sessions
  useEffect(() => {
    async function fetchLastCheckpoint() {
      if (!viewerId || !params.sourceId) return;

      try {
        const response = await fetch(
          `/api/sessions?viewerId=${viewerId}&sourceId=${params.sourceId}`
        );
        if (response.ok) {
          const data = await response.json();
          setLastCheckpoint(data.lastCheckpoint || 0);
        }
      } catch (err) {
        console.error('Failed to fetch last checkpoint:', err);
      }
    }

    fetchLastCheckpoint();
  }, [viewerId, params.sourceId]);

  // Handle "Check me" button click
  const handleCheckMe = async () => {
    if (!viewerId || !source || isCreatingSession) return;

    // Require at least 10 seconds of new content
    if (currentTime - lastCheckpoint < 10) {
      return;
    }

    setIsCreatingSession(true);
    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewerId,
          sourceId: source.id,
          startTime: Math.floor(lastCheckpoint),
          endTime: Math.floor(currentTime),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/learn/${params.sourceId}/challenge?sessionId=${data.session.id}`);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Parse transcript into timeline notes
  const parseTranscriptNotes = (transcript: string) => {
    const lines = transcript.split('\n').slice(0, 10);
    return lines.map(line => {
      const match = line.match(/\[(\d+:\d+)\]\s*(.*)/);
      if (match) {
        return { time: match[1], text: match[2] };
      }
      return { time: '0:00', text: line };
    }).filter(note => note.text.trim());
  };

  // Extract key concepts from transcript
  const extractKeyConcepts = (transcript: string): string[] => {
    const commonWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'as', 'by', 'this', 'that', 'it', 'so', 'we', 'you', 'i', 'they', 'what', 'when', 'where', 'how', 'why', 'all', 'can', 'will', 'just', 'like', 'about', 'be', 'have', 'do', 'if', 'from', 'not', 'your', 'our', 'their', 'these', 'those', 'more', 'some', 'then', 'now', 'here', 'there', 'going', 'would', 'could', 'should', 'than', 'them', 'us', 'me', 'my', 'his', 'her', 'its', 'out', 'up', 'down', 'over', 'into', 'very', 'also', 'only', 'other', 'get', 'got', 'make', 'made', 'thing', 'things', 'way', 'because', 'think', 'know', 'see', 'look', 'want', 'give', 'take', 'come', 'say', 'said']);

    const words = transcript.toLowerCase()
      .replace(/\[\d+:\d+\]/g, '')
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4 && !commonWords.has(word));

    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  };

  // Format seconds as M:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
  const watchedSinceCheckpoint = currentTime - lastCheckpoint;
  const canCheckMe = watchedSinceCheckpoint >= 10;

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
            {/* Simple progress bar */}
            <div className="relative w-32 h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>{Math.round(progress)}%</span>
            {canCheckMe && (
              <span className="text-primary font-medium">
                {formatTime(watchedSinceCheckpoint)} ready
              </span>
            )}
          </div>
          <Button
            variant={canCheckMe ? "default" : "secondary"}
            size="sm"
            onClick={handleCheckMe}
            disabled={!canCheckMe || isCreatingSession}
            className={canCheckMe ? "shadow-[0_0_15px_rgba(var(--primary),0.3)]" : "opacity-50"}
          >
            {isCreatingSession ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            Check me
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
                setPlayerReady(true);
              }}
              onError={(e: Error) => {
                console.error('Player error:', e);
                setPlayerError('Failed to load video. Please try again.');
              }}
              onTimeUpdate={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                const target = e.target as HTMLVideoElement;
                const time = target.currentTime;
                const duration = target.duration || source.duration;
                const played = duration > 0 ? time / duration : 0;
                setProgress(played * 100);
                setCurrentTime(time);
              }}
              onPlay={() => setIsPlaying(true)}
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

                  <Separator className="bg-border/50" />

                  {/* Progress info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Progress</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last checkpoint:</span>
                        <span className="font-mono text-primary">{formatTime(lastCheckpoint)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current position:</span>
                        <span className="font-mono">{formatTime(currentTime)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">New content:</span>
                        <span className="font-mono text-primary">{formatTime(watchedSinceCheckpoint)}</span>
                      </div>
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
                      {canCheckMe
                        ? `You've watched ${formatTime(watchedSinceCheckpoint)} of new content. Click 'Check me' to test your understanding!`
                        : "Watch at least 10 seconds of new content, then click 'Check me' whenever you want to test yourself."}
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
