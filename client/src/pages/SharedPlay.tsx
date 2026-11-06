import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Zap } from "lucide-react";
import { AnimationControls } from "@/components/AnimationControls";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { fetchSharedPlay } from "@/lib/playStore";

const ANIMATION_DURATION = 3;

export default function SharedPlay() {
  const [, params] = useRoute("/share/:token");
  const token = params?.token ?? "";
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(1);
  const { data: play, isPending, error } = useQuery({
    queryKey: ["/api/share", token],
    queryFn: ({ signal }) => fetchSharedPlay(token, signal),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (!isPlaying) return;
    let animationFrame = 0;
    let lastTime: number | undefined;

    const animate = (time: number) => {
      if (lastTime === undefined) lastTime = time;
      const elapsedSeconds = (time - lastTime) / 1000;
      lastTime = time;
      setProgress((current) => {
        const next = current + (elapsedSeconds * speed) / ANIMATION_DURATION;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, speed]);

  const footer = (
    <footer className="border-t border-border px-4 py-4 text-center text-sm text-muted-foreground">
      <Link href="/" className="inline-flex items-center gap-1.5 hover:text-foreground">
        <Zap className="h-4 w-4 text-primary" aria-hidden="true" />
        Made with PlayOps
      </Link>
    </footer>
  );

  if (isPending) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center text-muted-foreground">
          Loading shared play…
        </div>
        {footer}
      </main>
    );
  }

  if (error || !play) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <section className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <h1 className="text-2xl font-semibold">This play is no longer shared</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            The owner may have stopped sharing this play, or the link may be invalid.
          </p>
        </section>
        {footer}
      </main>
    );
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (progress >= 1) setProgress(0);
    setIsPlaying(true);
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card px-5 py-4">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-xl font-semibold">{play.name}</h1>
          {play.description && (
            <p className="mt-1 text-sm text-muted-foreground">{play.description}</p>
          )}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-6">
        <div className="h-[65vh] min-h-[320px] max-h-[720px] overflow-hidden rounded-lg border border-border bg-card">
          <DrawingCanvas
            playData={play.data}
            activeTool="select"
            selectedColor="#FF6B00"
            routeOptions={{ hasArrow: true, isCurved: false, lineType: "solid" }}
            onPlayDataChange={() => {}}
            selectedElementId={null}
            onSelectElement={() => {}}
            animationProgress={progress}
            isAnimating={isPlaying}
            readOnly
          />
        </div>
        <div className="mx-auto mt-5 w-full max-w-3xl">
          <AnimationControls
            isPlaying={isPlaying}
            progress={progress}
            speed={speed}
            duration={ANIMATION_DURATION}
            onPlayPause={handlePlayPause}
            onReset={() => {
              setIsPlaying(false);
              setProgress(0);
            }}
            onProgressChange={setProgress}
            onSpeedChange={setSpeed}
            readOnly
          />
        </div>
      </section>
      {footer}
    </main>
  );
}
