import { useState, useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Menu, 
  Save, 
  Zap,
  LogIn,
  LogOut,
  Loader2,
  UserRound,
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
  fetchCurrentUser,
  fetchAccountPlays,
  createAccountPlay,
  updateAccountPlay,
  deleteAccountPlay,
  type AccountUser,
  teamColors,
  type ClientPlay,
} from "@/lib/playStore";
import { STARTER_TEMPLATES } from "@/lib/playTemplates";
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
  const queryClient = useQueryClient();
  const [plays, setPlays] = useState<ClientPlay[]>([]);
  const [currentPlayId, setCurrentPlayId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState | null>(null);
  const [authStatus, setAuthStatus] = useState<"loading" | "guest" | "account" | "error" | "expired">("loading");
  const [accountUser, setAccountUser] = useState<AccountUser | null>(null);
  const [authError, setAuthError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const identityIdRef = useRef<string | null>(null);
  const identityAbortRef = useRef(new AbortController());
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
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.get("auth") === "failed") {
      toast({
        title: "Sign-in failed",
        description: "PlayOps couldn't complete sign-in. Please try again.",
        variant: "destructive",
      });
      currentUrl.searchParams.delete("auth");
      window.history.replaceState({}, "", currentUrl.pathname + currentUrl.search + currentUrl.hash);
    }
  }, [toast]);

  useEffect(() => {
    const controller = new AbortController();
    identityAbortRef.current = controller;
    let active = true;

    const initialize = async () => {
      try {
        const user = await fetchCurrentUser(controller.signal);
        if (!active) return;
        identityIdRef.current = user?.id ?? null;
        setAccountUser(user);

        if (user) {
          const accountPlays = await fetchAccountPlays(controller.signal);
          if (!active) return;
          setAuthStatus("account");
          setPlays(accountPlays);
          if (accountPlays.length) {
            const firstPlay = accountPlays[0];
            setCurrentPlayId(firstPlay.id);
            setPlayName(firstPlay.name);
            setHistory(createHistoryState(firstPlay.data as PlayData));
          } else {
            setCurrentPlayId(null);
            setPlayName("Untitled Play");
            setHistory(createHistoryState(createPlay("Untitled Play").data));
          }
          return;
        }

        const guestPlays = loadPlays();
        setAuthStatus("guest");
        setPlays(guestPlays);
        if (guestPlays.length) {
          const firstPlay = guestPlays[0];
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
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error("Failed to load PlayOps account data:", error);
        if (error instanceof Error && /AUTH_SESSION_EXPIRED|401|AUTH_REQUIRED/.test(error.message)) {
          identityIdRef.current = null;
          setAccountUser(null);
          setAuthStatus("expired");
        } else {
          setAuthError("PlayOps could not check your sign-in or load your playbook. Please retry.");
          setAuthStatus("error");
        }
      }
    };

    void initialize();
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const checkForAccountChange = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const user = await fetchCurrentUser();
        if ((user?.id ?? null) !== identityIdRef.current) {
          window.location.reload();
        }
      } catch (error) {
        if (error instanceof Error && error.message === "AUTH_SESSION_EXPIRED") {
          window.location.reload();
          return;
        }
        // Keep the current editor visible; a failed status check is retried on next focus.
      }
    };
    window.addEventListener("focus", checkForAccountChange);
    return () => window.removeEventListener("focus", checkForAccountChange);
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

  const expireAccountSession = useCallback(() => {
    identityAbortRef.current.abort();
    identityIdRef.current = null;
    queryClient.clear();
    setAccountUser(null);
    setPlays([]);
    setCurrentPlayId(null);
    setHistory(null);
    setPlayName("");
    setSelectedElementId(null);
    setAuthStatus("expired");
  }, [queryClient]);

  const reportPersistenceError = useCallback((error: unknown, action: string) => {
    const message = error instanceof Error ? error.message : "";
    if (authStatus === "account" && /401|AUTH_REQUIRED/.test(message)) {
      expireAccountSession();
      toast({
        title: "Sign-in expired",
        description: "Sign in again to reopen and save your account plays.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: `Couldn't ${action}`,
      description: authStatus === "account"
        ? "Your account playbook was not changed. Check your connection and try again."
        : "Your local play was not changed. Check browser storage and try again.",
      variant: "destructive",
    });
  }, [authStatus, expireAccountSession, toast]);

  const persistCurrentPlay = useCallback(async (): Promise<ClientPlay | undefined> => {
    if (!playData || (authStatus !== "account" && authStatus !== "guest")) return undefined;

    const existing = plays.find((play) => play.id === currentPlayId);
    const draft = {
      ...(existing ?? createPlay(playName || "Untitled Play", playData.sport)),
      name: playName || "Untitled Play",
      data: playData,
      updatedAt: new Date().toISOString(),
    };

    if (authStatus === "account") {
      const userId = accountUser?.id;
      if (!userId) throw new Error("Your sign-in expired.");
      const saved = currentPlayId
        ? await updateAccountPlay(currentPlayId, { name: draft.name, data: draft.data }, identityAbortRef.current.signal)
        : await createAccountPlay(draft, identityAbortRef.current.signal);
      if (identityIdRef.current !== userId) throw new DOMException("Account changed", "AbortError");
      setPlays((current) => current.some((play) => play.id === saved.id)
        ? current.map((play) => play.id === saved.id ? saved : play)
        : [...current, saved]);
      setCurrentPlayId(saved.id);
      return saved;
    }

    const updatedPlays = currentPlayId && plays.some((play) => play.id === currentPlayId)
      ? plays.map((play) => play.id === currentPlayId ? draft : play)
      : [...plays, draft];
    setPlays(updatedPlays);
    savePlays(updatedPlays);
    setCurrentPlayId(draft.id);
    return draft;
  }, [playData, authStatus, plays, currentPlayId, playName, accountUser]);

  const handleSave = useCallback(async () => {
    if (!playData || isSaving) return;
    setIsSaving(true);
    try {
      const saved = await persistCurrentPlay();
      if (!saved) return;
      toast({
        title: "Play Saved",
        description: `"${saved.name}" has been saved successfully.`,
      });
    } catch (error) {
      reportPersistenceError(error, "save play");
    } finally {
      setIsSaving(false);
    }
  }, [playData, isSaving, persistCurrentPlay, toast, reportPersistenceError]);

  const handleSelectPlay = useCallback(async (playId: string) => {
    if (playId === currentPlayId) {
      setSidebarOpen(false);
      return;
    }
    try {
      await persistCurrentPlay();
      const play = plays.find((item) => item.id === playId);
      if (!play) return;
      setCurrentPlayId(playId);
      setPlayName(play.name);
      setHistory(createHistoryState(play.data as PlayData));
      setSelectedElementId(null);
      setSidebarOpen(false);
    } catch (error) {
      reportPersistenceError(error, "switch plays");
    }
  }, [currentPlayId, persistCurrentPlay, plays, reportPersistenceError]);

  const selectLoadedPlay = useCallback((play: ClientPlay) => {
    setCurrentPlayId(play.id);
    setPlayName(play.name);
    setHistory(createHistoryState(play.data as PlayData));
    setSelectedElementId(null);
    setSidebarOpen(false);
  }, []);

  const handleCreatePlay = useCallback(async (name: string, sport: SportType) => {
    try {
      const currentSaved = currentPlayId ? await persistCurrentPlay() : undefined;
      const basePlays = currentSaved
        ? plays.map((play) => play.id === currentSaved.id ? currentSaved : play)
        : plays;
      const draft = createPlay(name, sport);
      const created = authStatus === "account"
        ? await createAccountPlay(draft, identityAbortRef.current.signal)
        : draft;
      const updatedPlays = [...basePlays, created];
      setPlays(updatedPlays);
      if (authStatus === "guest") savePlays(updatedPlays);
      selectLoadedPlay(created);
      toast({ title: "Play Created", description: `"${name}" has been created.` });
    } catch (error) {
      reportPersistenceError(error, "create play");
    }
  }, [currentPlayId, persistCurrentPlay, plays, authStatus, selectLoadedPlay, toast, reportPersistenceError]);

  const handleDuplicatePlay = useCallback(async (playId: string) => {
    const play = plays.find((item) => item.id === playId);
    if (!play) return;
    try {
      const source = playId === currentPlayId && playData
        ? { ...play, name: playName, data: playData }
        : play;
      const duplicate = duplicatePlayFn(source);
      const created = authStatus === "account"
        ? await createAccountPlay(duplicate, identityAbortRef.current.signal)
        : duplicate;
      const updatedPlays = [...plays, created];
      setPlays(updatedPlays);
      if (authStatus === "guest") savePlays(updatedPlays);
      toast({ title: "Play Duplicated", description: `"${created.name}" has been created.` });
    } catch (error) {
      reportPersistenceError(error, "duplicate play");
    }
  }, [plays, currentPlayId, playData, playName, authStatus, toast, reportPersistenceError]);

  const handleCopyTemplate = useCallback(async (templateId: string) => {
    const template = STARTER_TEMPLATES.find((item) => item.id === templateId);
    if (!template) return;

    const draft = {
      ...createPlay(template.name, template.sport),
      description: template.description,
      tags: [...template.tags],
      data: structuredClone(template.data),
    };
    try {
      const copiedPlay = authStatus === "account"
        ? await createAccountPlay(draft, identityAbortRef.current.signal)
        : draft;
      const updatedPlays = [...plays, copiedPlay];
      setPlays(updatedPlays);
      if (authStatus === "guest") savePlays(updatedPlays);
      selectLoadedPlay(copiedPlay);
      toast({ title: "Template Copied", description: `"${template.name}" was copied to your plays.` });
    } catch (error) {
      reportPersistenceError(error, "copy template");
    }
  }, [plays, authStatus, selectLoadedPlay, toast, reportPersistenceError]);

  const handleDeletePlay = useCallback(async (playId: string) => {
    try {
      if (authStatus === "account") {
        await deleteAccountPlay(playId, identityAbortRef.current.signal);
      }
      const updatedPlays = plays.filter((play) => play.id !== playId);
      setPlays(updatedPlays);
      if (authStatus === "guest") savePlays(updatedPlays);

      if (currentPlayId === playId) {
        setSelectedElementId(null);
        if (updatedPlays.length) {
          selectLoadedPlay(updatedPlays[0]);
        } else if (authStatus === "account") {
          setCurrentPlayId(null);
          setPlayName("Untitled Play");
          setHistory(createHistoryState(createPlay("Untitled Play").data));
        } else {
          const replacement = createPlay("Untitled Play", "basketball");
          setPlays([replacement]);
          savePlays([replacement]);
          selectLoadedPlay(replacement);
        }
      }
      toast({ title: "Play Deleted", description: "The play has been removed from your playbook." });
    } catch (error) {
      reportPersistenceError(error, "delete play");
    }
  }, [authStatus, plays, currentPlayId, selectLoadedPlay, toast, reportPersistenceError]);

  const handleRenamePlay = useCallback(async (playId: string, name: string) => {
    try {
      if (authStatus === "account") {
        const renamed = await updateAccountPlay(
          playId,
          { name },
          identityAbortRef.current.signal,
        );
        setPlays((current) => current.map((play) => play.id === playId ? renamed : play));
      } else {
        const updatedPlays = plays.map((play) => play.id === playId ? { ...play, name } : play);
        setPlays(updatedPlays);
        savePlays(updatedPlays);
      }
      if (playId === currentPlayId) setPlayName(name);
    } catch (error) {
      reportPersistenceError(error, "rename play");
    }
  }, [authStatus, plays, currentPlayId, reportPersistenceError]);

  const handleSignOut = useCallback(async () => {
    setIsSigningOut(true);
    try {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Sign-out failed.");
      identityAbortRef.current.abort();
      identityIdRef.current = null;
      queryClient.clear();
      setAccountUser(null);
      setPlays([]);
      setCurrentPlayId(null);
      setHistory(null);
      setSelectedElementId(null);
      window.location.assign("/");
    } catch {
      setIsSigningOut(false);
      toast({
        title: "Couldn't sign out",
        description: "Your account is still active. Check your connection and try again.",
        variant: "destructive",
      });
    }
  }, [queryClient, toast]);

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

  if (authStatus === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading PlayOps...</p>
        </div>
      </div>
    );
  }

  if (authStatus === "error" || authStatus === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <Zap className="h-9 w-9 text-primary" aria-hidden="true" />
          <h1 className="text-2xl font-bold">
            {authStatus === "expired" ? "Your sign-in expired" : "PlayOps couldn't load"}
          </h1>
          <p className="text-muted-foreground">
            {authStatus === "expired"
              ? "Sign in again to reopen your account playbook. Your guest plays remain separate."
              : authError}
          </p>
          {authStatus === "expired" ? (
            <Button asChild>
              <a href="/api/login"><LogIn className="h-4 w-4" /> Sign in again</a>
            </Button>
          ) : (
            <Button onClick={() => window.location.reload()}>Try again</Button>
          )}
        </div>
      </div>
    );
  }

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
                templates={STARTER_TEMPLATES}
                currentPlayId={currentPlayId}
                onSelectPlay={handleSelectPlay}
                onCreatePlay={handleCreatePlay}
                onDuplicatePlay={handleDuplicatePlay}
                onDeletePlay={handleDeletePlay}
                onRenamePlay={handleRenamePlay}
                onCopyTemplate={handleCopyTemplate}
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
            disabled={isSaving}
            className="gap-1.5"
            data-testid="button-save"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">{isSaving ? "Saving…" : "Save"}</span>
          </Button>

          <ThemeToggle />

          {authStatus === "account" && accountUser ? (
            <div className="flex items-center gap-1.5">
              <span className="max-w-20 truncate text-xs text-muted-foreground lg:max-w-36 lg:text-sm" title={accountUser.email ?? accountUser.name}>
                <UserRound className="mr-1 inline h-3.5 w-3.5 lg:h-4 lg:w-4" aria-hidden="true" />
                {accountUser.name}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                disabled={isSigningOut}
                aria-label="Sign out"
                title="Sign out"
                data-testid="button-sign-out"
              >
                {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                <span className="hidden sm:inline">{isSigningOut ? "Signing out…" : "Sign out"}</span>
              </Button>
            </div>
          ) : (
            <Button asChild variant="outline" size="sm" aria-label="Sign in to save plays" data-testid="button-sign-in">
              <a href="/api/login">
                <LogIn className="h-4 w-4" />
                <span className="text-xs sm:text-sm">Sign in</span>
              </a>
            </Button>
          )}
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
