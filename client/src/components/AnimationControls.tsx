import { Play, Pause, RotateCcw, FastForward, Rewind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface AnimationControlsProps {
  isPlaying: boolean;
  progress: number;
  speed: number;
  duration: number;
  onPlayPause: () => void;
  onReset: () => void;
  onProgressChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
}

export function AnimationControls({
  isPlaying,
  progress,
  speed,
  duration,
  onPlayPause,
  onReset,
  onProgressChange,
  onSpeedChange,
}: AnimationControlsProps) {
  const formatTime = (seconds: number) => {
    const s = Math.floor(seconds);
    const ms = Math.floor((seconds - s) * 10);
    return `${s}.${ms}s`;
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-card border border-card-border rounded-md shadow-lg">
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onReset}
              data-testid="button-reset-animation"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Reset</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              size="icon"
              onClick={onPlayPause}
              data-testid="button-play-pause"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4 ml-0.5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isPlaying ? "Pause" : "Play"}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(progress * duration)}
        </span>
        <Slider
          value={[progress * 100]}
          onValueChange={(value) => onProgressChange(value[0] / 100)}
          max={100}
          step={1}
          className="flex-1"
          data-testid="slider-progress"
        />
        <span className="text-xs text-muted-foreground w-10">
          {formatTime(duration)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSpeedChange(Math.max(0.25, speed - 0.25))}
              data-testid="button-speed-down"
            >
              <Rewind className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Slower</p>
          </TooltipContent>
        </Tooltip>

        <span className="text-xs font-medium w-10 text-center">{speed}x</span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onSpeedChange(Math.min(3, speed + 0.25))}
              data-testid="button-speed-up"
            >
              <FastForward className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Faster</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
