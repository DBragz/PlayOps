import { useState, useEffect, useCallback } from "react";
import { 
  Menu, 
  Save, 
  Download,
  Settings,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { ToolPalette, type ToolType, type RouteOptions } from "@/components/ToolPalette";
import { AnimationControls } from "@/components/AnimationControls";
import { PlaybookSidebar } from "@/components/PlaybookSidebar";
import { SportSelector } from "@/components/SportSelector";
import { 
  loadPlays, 
  savePlays, 
  createPlay, 
  duplicatePlay as duplicatePlayFn,
  updatePlayData,
  teamColors,
  type ClientPlay,
} from "@/lib/playStore";
import { 
  createHistoryState, 
  pushState, 
  undo as undoHistory, 
  redo as redoHistory,
  canUndo as checkCanUndo,
  canRedo as checkCanRedo,
  type HistoryState,
} from "@/lib/undoRedo";
import type { PlayData, SportType } from "@shared/schema";

export default function Home() {
  const { toast } = useToast();
  const [plays, setPlays] = useState<ClientPlay[]>([]);
  const [currentPlayId, setCurrentPlayId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [selectedColor, setSelectedColor] = useState("#FF6B00");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [routeOptions, setRouteOptions] = useState<RouteOptions>({
    hasArrow: true,
    isCurved: false,
    lineType: "solid",
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playName, setPlayName] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const animationDuration = 3;

  useEffect(() => {
    const loadedPlays = loadPlays();
    setPlays(loadedPlays);
    
    if (loadedPlays.length > 0) {
      const firstPlay = loadedPlays[0];
      setCurrentPlayId(firstPlay.id);
      setPlayName(firstPlay.name);
      setHistory(createHistoryState(firstPlay.data as PlayData));
    } else {
      const newPlay = createPlay("My First Play", "basketball");
      setPlays([newPlay]);
      setCurrentPlayId(newPlay.id);
      setPlayName(newPlay.name);
      setHistory(createHistoryState(newPlay.data as PlayData));
      savePlays([newPlay]);
    }
  }, []);

  useEffect(() => {
    let animationFrame: number;
    let lastTime: number;

    const animate = (time: number) => {
      if (!lastTime) lastTime = time;
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      setAnimationProgress((prev) => {
        const next = prev + (deltaTime * animationSpeed) / animationDuration;
        if (next >= 1) {
          setIsAnimating(false);
          return 1;
        }
        return next;
      });

      if (isAnimating) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    if (isAnimating) {
      animationFrame = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isAnimating, animationSpeed, animationDuration]);

  const currentPlay = plays.find((p) => p.id === currentPlayId);
  const playData = history?.present;

  const handlePlayDataChange = useCallback((newData: PlayData) => {
    if (history) {
      setHistory(pushState(history, newData));
    }
  }, [history]);

  const handleUndo = useCallback(() => {
    if (history && checkCanUndo(history)) {
      setHistory(undoHistory(history));
    }
  }, [history]);

  const handleRedo = useCallback(() => {
    if (history && checkCanRedo(history)) {
      setHistory(redoHistory(history));
    }
  }, [history]);

  const handleClear = useCallback(() => {
    if (playData) {
      handlePlayDataChange({
        ...playData,
        players: [],
        routes: [],
        freehandDrawings: [],
        textAnnotations: [],
      });
      toast({
        title: "Canvas Cleared",
        description: "All elements have been removed.",
      });
    }
  }, [playData, handlePlayDataChange, toast]);

  const handleSave = useCallback(() => {
    if (currentPlayId && playData) {
      const updatedPlays = plays.map((p) =>
        p.id === currentPlayId
          ? { ...p, name: playName, data: playData, updatedAt: new Date().toISOString() }
          : p
      );
      setPlays(updatedPlays);
      savePlays(updatedPlays);
      toast({
        title: "Play Saved",
        description: `"${playName}" has been saved successfully.`,
      });
    }
  }, [currentPlayId, playData, playName, plays, toast]);

  const handleSelectPlay = useCallback((playId: string) => {
    if (currentPlayId && playData) {
      const updatedPlays = plays.map((p) =>
        p.id === currentPlayId
          ? { ...p, name: playName, data: playData, updatedAt: new Date().toISOString() }
          : p
      );
      setPlays(updatedPlays);
      savePlays(updatedPlays);
    }

    const play = plays.find((p) => p.id === playId);
    if (play) {
      setCurrentPlayId(playId);
      setPlayName(play.name);
      setHistory(createHistoryState(play.data as PlayData));
      setSelectedElementId(null);
      setSidebarOpen(false);
    }
  }, [currentPlayId, playData, playName, plays]);

  const handleCreatePlay = useCallback((name: string, sport: SportType) => {
    const newPlay = createPlay(name, sport);
    const updatedPlays = [...plays, newPlay];
    setPlays(updatedPlays);
    savePlays(updatedPlays);
    handleSelectPlay(newPlay.id);
    toast({
      title: "Play Created",
      description: `"${name}" has been created.`,
    });
  }, [plays, handleSelectPlay, toast]);

  const handleDuplicatePlay = useCallback((playId: string) => {
    const play = plays.find((p) => p.id === playId);
    if (play) {
      const duplicated = duplicatePlayFn(play);
      const updatedPlays = [...plays, duplicated];
      setPlays(updatedPlays);
      savePlays(updatedPlays);
      toast({
        title: "Play Duplicated",
        description: `"${duplicated.name}" has been created.`,
      });
    }
  }, [plays, toast]);

  const handleDeletePlay = useCallback((playId: string) => {
    const updatedPlays = plays.filter((p) => p.id !== playId);
    setPlays(updatedPlays);
    savePlays(updatedPlays);

    if (currentPlayId === playId) {
      if (updatedPlays.length > 0) {
        handleSelectPlay(updatedPlays[0].id);
      } else {
        const newPlay = createPlay("Untitled Play", "basketball");
        setPlays([newPlay]);
        savePlays([newPlay]);
        setCurrentPlayId(newPlay.id);
        setPlayName(newPlay.name);
        setHistory(createHistoryState(newPlay.data as PlayData));
      }
    }

    toast({
      title: "Play Deleted",
      description: "The play has been removed from your playbook.",
    });
  }, [plays, currentPlayId, handleSelectPlay, toast]);

  const handleRenamePlay = useCallback((playId: string, name: string) => {
    const updatedPlays = plays.map((p) =>
      p.id === playId ? { ...p, name } : p
    );
    setPlays(updatedPlays);
    savePlays(updatedPlays);
    if (playId === currentPlayId) {
      setPlayName(name);
    }
  }, [plays, currentPlayId]);

  const handleSportChange = useCallback((sport: SportType) => {
    if (playData) {
      handlePlayDataChange({ ...playData, sport });
    }
  }, [playData, handlePlayDataChange]);

  const handlePlayPause = useCallback(() => {
    if (!isAnimating && animationProgress >= 1) {
      setAnimationProgress(0);
    }
    setIsAnimating(!isAnimating);
  }, [isAnimating, animationProgress]);

  const handleResetAnimation = useCallback(() => {
    setIsAnimating(false);
    setAnimationProgress(0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "v" || e.key === "V") setActiveTool("select");
      if (e.key === "h" || e.key === "H") setActiveTool("pan");
      if (e.key === "p" || e.key === "P") setActiveTool("player");
      if (e.key === "r" || e.key === "R") setActiveTool("route");
      if (e.key === "d" || e.key === "D") setActiveTool("freehand");
      if (e.key === "t" || e.key === "T") setActiveTool("text");
      if (e.key === "e" || e.key === "E") setActiveTool("eraser");

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === " ") {
        e.preventDefault();
        handlePlayPause();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleSave, handlePlayPause]);

  if (!playData) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading PlayOps...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" data-testid="button-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-80">
              <PlaybookSidebar
                plays={plays}
                currentPlayId={currentPlayId}
                onSelectPlay={handleSelectPlay}
                onCreatePlay={handleCreatePlay}
                onDuplicatePlay={handleDuplicatePlay}
                onDeletePlay={handleDeletePlay}
                onRenamePlay={handleRenamePlay}
              />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl tracking-tight hidden sm:inline">
              <span className="text-primary">Play</span>
              <span>Ops</span>
            </span>
          </div>

          <div className="hidden md:block h-6 w-px bg-border" />

          <Input
            value={playName}
            onChange={(e) => setPlayName(e.target.value)}
            className="max-w-[200px] font-medium"
            data-testid="input-play-name"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <SportSelector
              currentSport={playData.sport}
              onSportChange={handleSportChange}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="gap-1.5"
            data-testid="button-save"
          >
            <Save className="h-4 w-4" />
            <span className="hidden sm:inline">Save</span>
          </Button>

          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <ToolPalette
            activeTool={activeTool}
            onToolChange={setActiveTool}
            canUndo={history ? checkCanUndo(history) : false}
            canRedo={history ? checkCanRedo(history) : false}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            routeOptions={routeOptions}
            onRouteOptionsChange={(opts) => setRouteOptions((prev) => ({ ...prev, ...opts }))}
            selectedColor={selectedColor}
            onColorChange={setSelectedColor}
            teamColors={teamColors}
          />
        </div>

        <main className="flex-1 relative">
          <DrawingCanvas
            playData={playData}
            activeTool={activeTool}
            selectedColor={selectedColor}
            routeOptions={routeOptions}
            onPlayDataChange={handlePlayDataChange}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            animationProgress={animationProgress}
            isAnimating={isAnimating}
          />
        </main>
      </div>

      <footer className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
        <AnimationControls
          isPlaying={isAnimating}
          progress={animationProgress}
          speed={animationSpeed}
          duration={animationDuration}
          onPlayPause={handlePlayPause}
          onReset={handleResetAnimation}
          onProgressChange={setAnimationProgress}
          onSpeedChange={setAnimationSpeed}
        />
      </footer>
    </div>
  );
}
