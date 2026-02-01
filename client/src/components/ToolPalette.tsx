import { 
  MousePointer2, 
  Move, 
  UserPlus, 
  Route, 
  Pencil, 
  Type, 
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  ArrowRight,
  Spline,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type ToolType = "select" | "pan" | "player" | "route" | "freehand" | "text" | "eraser";

export interface RouteOptions {
  hasArrow: boolean;
  isCurved: boolean;
  lineType: "solid" | "dashed" | "dotted";
}

interface ToolPaletteProps {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  routeOptions: RouteOptions;
  onRouteOptionsChange: (options: Partial<RouteOptions>) => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  teamColors: { team1: string[]; team2: string[] };
}

const tools = [
  { id: "select" as ToolType, icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "pan" as ToolType, icon: Move, label: "Pan", shortcut: "H" },
  { id: "player" as ToolType, icon: UserPlus, label: "Add Player", shortcut: "P" },
  { id: "route" as ToolType, icon: Route, label: "Draw Route", shortcut: "R" },
  { id: "freehand" as ToolType, icon: Pencil, label: "Freehand", shortcut: "D" },
  { id: "text" as ToolType, icon: Type, label: "Text", shortcut: "T" },
  { id: "eraser" as ToolType, icon: Eraser, label: "Eraser", shortcut: "E" },
];

const colors = [
  "#FF6B00",
  "#FF8C38",
  "#1E3A5F",
  "#2E5A8F",
  "#4CAF50",
  "#F44336",
  "#9C27B0",
  "#FFEB3B",
  "#FFFFFF",
  "#000000",
];

export function ToolPalette({
  activeTool,
  onToolChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  routeOptions,
  onRouteOptionsChange,
  selectedColor,
  onColorChange,
  teamColors,
}: ToolPaletteProps) {
  return (
    <div className="flex flex-col gap-2 p-2 bg-card border border-card-border rounded-md shadow-lg">
      <div className="flex flex-col gap-1">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            <TooltipTrigger asChild>
              <Button
                variant={activeTool === tool.id ? "default" : "ghost"}
                size="icon"
                onClick={() => onToolChange(tool.id)}
                data-testid={`tool-${tool.id}`}
                className={cn(
                  "relative",
                  activeTool === tool.id && "bg-primary text-primary-foreground"
                )}
              >
                <tool.icon className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{tool.label} ({tool.shortcut})</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <Separator />

      {activeTool === "route" && (
        <>
          <div className="flex flex-col gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={routeOptions.hasArrow ? "default" : "ghost"}
                  size="icon"
                  onClick={() => onRouteOptionsChange({ hasArrow: !routeOptions.hasArrow })}
                  data-testid="route-arrow-toggle"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Arrow Head</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={routeOptions.isCurved ? "default" : "ghost"}
                  size="icon"
                  onClick={() => onRouteOptionsChange({ isCurved: !routeOptions.isCurved })}
                  data-testid="route-curve-toggle"
                >
                  <Spline className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Curved Line</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={routeOptions.lineType === "dashed" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => onRouteOptionsChange({ 
                    lineType: routeOptions.lineType === "dashed" ? "solid" : "dashed" 
                  })}
                  data-testid="route-dash-toggle"
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Dashed Line</p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Separator />
        </>
      )}

      <div className="flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onUndo}
              disabled={!canUndo}
              data-testid="button-undo"
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Undo (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRedo}
              disabled={!canRedo}
              data-testid="button-redo"
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Redo (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              data-testid="button-clear"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Clear All</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator />

      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground text-center mb-1">Colors</p>
        <div className="grid grid-cols-2 gap-1">
          {colors.map((color) => (
            <button
              key={color}
              onClick={() => onColorChange(color)}
              className={cn(
                "w-5 h-5 rounded-sm border-2 transition-transform",
                selectedColor === color ? "border-primary scale-110" : "border-transparent hover:scale-105"
              )}
              style={{ backgroundColor: color }}
              data-testid={`color-${color.replace("#", "")}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
