import { useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Line, Text as KonvaText, Group } from "react-konva";
import Konva from "konva";
import type { PlayData, PlayerObject, Route, FreehandDrawing, TextAnnotation, SportType } from "@shared/schema";
import { SportSurface } from "./SportSurface";
import { PlayerMarker } from "./PlayerMarker";
import { RouteLine } from "./RouteLine";
import { useTheme } from "./ThemeProvider";
import type { ToolType, RouteOptions } from "./ToolPalette";
import { createPlayer, createRoute, createFreehandDrawing, createTextAnnotation } from "@/lib/playStore";
import { v4 as uuidv4 } from "uuid";

interface DrawingCanvasProps {
  playData: PlayData;
  activeTool: ToolType;
  selectedColor: string;
  routeOptions: RouteOptions;
  onPlayDataChange: (data: PlayData) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  animationProgress: number;
  isAnimating: boolean;
}

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 800;

export function DrawingCanvas({
  playData,
  activeTool,
  selectedColor,
  routeOptions,
  onPlayDataChange,
  selectedElementId,
  onSelectElement,
  animationProgress,
  isAnimating,
}: DrawingCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [dimensions, setDimensions] = useState({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<FreehandDrawing | null>(null);
  const [currentRoute, setCurrentRoute] = useState<Route | null>(null);
  const [nextPlayerNumber, setNextPlayerNumber] = useState(1);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string } | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const getPointerPosition = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return null;
    const pointer = stage.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - stagePos.x) / stageScale,
      y: (pointer.y - stagePos.y) / stageScale,
    };
  }, [stagePos, stageScale]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const scaleBy = 1.1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.min(Math.max(newScale, 0.1), 5);

    setStageScale(clampedScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  }, [stageScale, stagePos]);

  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const pos = getPointerPosition();
    if (!pos) return;

    if (activeTool === "pan") {
      setIsPanning(true);
      return;
    }

    if (activeTool === "player") {
      const newPlayer = createPlayer(selectedColor, String(nextPlayerNumber), pos);
      setNextPlayerNumber((n) => n + 1);
      onPlayDataChange({
        ...playData,
        players: [...playData.players, newPlayer],
      });
      onSelectElement(newPlayer.id);
      return;
    }

    if (activeTool === "route") {
      const newRoute = createRoute(undefined, selectedColor, pos);
      newRoute.hasArrow = routeOptions.hasArrow;
      newRoute.isCurved = routeOptions.isCurved;
      newRoute.lineType = routeOptions.lineType;
      setCurrentRoute(newRoute);
      setIsDrawing(true);
      return;
    }

    if (activeTool === "freehand") {
      const newDrawing = createFreehandDrawing(selectedColor);
      newDrawing.points = [pos.x, pos.y];
      setCurrentDrawing(newDrawing);
      setIsDrawing(true);
      return;
    }

    if (activeTool === "text") {
      setTextInput({ x: pos.x, y: pos.y, value: "" });
      return;
    }

    if (activeTool === "eraser") {
      const target = e.target;
      if (target && target !== stageRef.current) {
        const id = target.id();
        if (id) {
          handleEraseElement(id);
        }
      }
      return;
    }

    if (activeTool === "select") {
      const target = e.target;
      if (target === stageRef.current || target.getClassName() === "Rect") {
        onSelectElement(null);
      }
    }
  }, [activeTool, selectedColor, routeOptions, playData, onPlayDataChange, onSelectElement, getPointerPosition, nextPlayerNumber]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (isPanning) {
      const stage = stageRef.current;
      if (!stage) return;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      
      const dx = e.evt instanceof TouchEvent 
        ? (e.evt.touches[0]?.clientX || 0) - (stage.attrs.lastTouchX || 0)
        : (e.evt as MouseEvent).movementX;
      const dy = e.evt instanceof TouchEvent 
        ? (e.evt.touches[0]?.clientY || 0) - (stage.attrs.lastTouchY || 0)
        : (e.evt as MouseEvent).movementY;
      
      setStagePos((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy,
      }));
      return;
    }

    if (!isDrawing) return;

    const pos = getPointerPosition();
    if (!pos) return;

    if (currentRoute) {
      setCurrentRoute((prev) => {
        if (!prev) return prev;
        const lastPoint = prev.points[prev.points.length - 1];
        const dist = Math.sqrt(Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2));
        if (dist > 10) {
          return {
            ...prev,
            points: [...prev.points, { x: pos.x, y: pos.y }],
          };
        }
        return prev;
      });
    }

    if (currentDrawing) {
      setCurrentDrawing((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          points: [...prev.points, pos.x, pos.y],
        };
      });
    }
  }, [isPanning, isDrawing, currentRoute, currentDrawing, getPointerPosition]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);

    if (isDrawing) {
      if (currentRoute && currentRoute.points.length >= 2) {
        onPlayDataChange({
          ...playData,
          routes: [...playData.routes, currentRoute],
        });
        onSelectElement(currentRoute.id);
      }

      if (currentDrawing && currentDrawing.points.length >= 4) {
        onPlayDataChange({
          ...playData,
          freehandDrawings: [...playData.freehandDrawings, currentDrawing],
        });
      }

      setCurrentRoute(null);
      setCurrentDrawing(null);
      setIsDrawing(false);
    }
  }, [isDrawing, currentRoute, currentDrawing, playData, onPlayDataChange, onSelectElement]);

  const handleEraseElement = (id: string) => {
    onPlayDataChange({
      ...playData,
      players: playData.players.filter((p) => p.id !== id),
      routes: playData.routes.filter((r) => r.id !== id),
      freehandDrawings: playData.freehandDrawings.filter((d) => d.id !== id),
      textAnnotations: playData.textAnnotations.filter((t) => t.id !== id),
    });
  };

  const handlePlayerDragEnd = (playerId: string, pos: { x: number; y: number }) => {
    onPlayDataChange({
      ...playData,
      players: playData.players.map((p) =>
        p.id === playerId ? { ...p, position: pos } : p
      ),
    });
  };

  const handleRoutePointMove = (routeId: string, pointIndex: number, pos: { x: number; y: number }) => {
    onPlayDataChange({
      ...playData,
      routes: playData.routes.map((r) =>
        r.id === routeId
          ? {
              ...r,
              points: r.points.map((p, i) => (i === pointIndex ? { ...p, ...pos } : p)),
            }
          : r
      ),
    });
  };

  const handleTextSubmit = () => {
    if (textInput && textInput.value.trim()) {
      const annotation = createTextAnnotation(textInput.value, { x: textInput.x, y: textInput.y }, selectedColor);
      onPlayDataChange({
        ...playData,
        textAnnotations: [...playData.textAnnotations, annotation],
      });
    }
    setTextInput(null);
  };

  const getAnimatedPlayerPosition = (player: PlayerObject): { x: number; y: number } => {
    if (!isAnimating || !playData.animationKeyframes?.length) {
      return player.position;
    }

    const playerRoute = playData.routes.find((r) => r.playerId === player.id);
    if (!playerRoute || playerRoute.points.length < 2) {
      return player.position;
    }

    const totalPoints = playerRoute.points.length;
    const progressIndex = animationProgress * (totalPoints - 1);
    const index = Math.floor(progressIndex);
    const t = progressIndex - index;

    if (index >= totalPoints - 1) {
      return playerRoute.points[totalPoints - 1];
    }

    const p1 = playerRoute.points[index];
    const p2 = playerRoute.points[index + 1];

    return {
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
    };
  };

  const getCursor = () => {
    switch (activeTool) {
      case "pan":
        return isPanning ? "grabbing" : "grab";
      case "player":
        return "crosshair";
      case "route":
      case "freehand":
        return "crosshair";
      case "text":
        return "text";
      case "eraser":
        return "not-allowed";
      default:
        return "default";
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background"
      style={{ cursor: getCursor() }}
    >
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        x={stagePos.x}
        y={stagePos.y}
        scaleX={stageScale}
        scaleY={stageScale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        draggable={activeTool === "pan"}
      >
        <Layer>
          <SportSurface
            sport={playData.sport}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            isDark={isDark}
          />
        </Layer>

        <Layer>
          {playData.freehandDrawings.map((drawing) => (
            <Line
              key={drawing.id}
              id={drawing.id}
              points={drawing.points}
              stroke={drawing.color}
              strokeWidth={drawing.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
              globalCompositeOperation="source-over"
            />
          ))}

          {currentDrawing && (
            <Line
              points={currentDrawing.points}
              stroke={currentDrawing.color}
              strokeWidth={currentDrawing.strokeWidth}
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </Layer>

        <Layer>
          {playData.routes.map((route) => (
            <RouteLine
              key={route.id}
              route={route}
              isSelected={selectedElementId === route.id}
              onSelect={() => onSelectElement(route.id)}
              onPointMove={(pointIndex, pos) => handleRoutePointMove(route.id, pointIndex, pos)}
              showControlPoints={selectedElementId === route.id && activeTool === "select"}
            />
          ))}

          {currentRoute && currentRoute.points.length >= 2 && (
            <RouteLine
              route={currentRoute}
              isSelected={false}
              onSelect={() => {}}
            />
          )}
        </Layer>

        <Layer>
          {playData.players.map((player) => {
            const animatedPos = getAnimatedPlayerPosition(player);
            const displayPlayer = isAnimating ? { ...player, position: animatedPos } : player;
            
            return (
              <PlayerMarker
                key={player.id}
                player={displayPlayer}
                isSelected={selectedElementId === player.id}
                isDragging={false}
                onDragStart={() => {}}
                onDragMove={() => {}}
                onDragEnd={(pos) => handlePlayerDragEnd(player.id, pos)}
                onClick={() => onSelectElement(player.id)}
              />
            );
          })}
        </Layer>

        <Layer>
          {playData.textAnnotations.map((annotation) => (
            <KonvaText
              key={annotation.id}
              id={annotation.id}
              x={annotation.position.x}
              y={annotation.position.y}
              text={annotation.text}
              fontSize={annotation.fontSize}
              fontFamily="Montserrat, sans-serif"
              fontStyle={annotation.fontWeight}
              fill={annotation.color}
              draggable={activeTool === "select"}
              onClick={() => onSelectElement(annotation.id)}
              onTap={() => onSelectElement(annotation.id)}
              onDragEnd={(e) => {
                const pos = e.target.position();
                onPlayDataChange({
                  ...playData,
                  textAnnotations: playData.textAnnotations.map((t) =>
                    t.id === annotation.id ? { ...t, position: pos } : t
                  ),
                });
              }}
            />
          ))}
        </Layer>
      </Stage>

      {textInput && (
        <div
          className="absolute"
          style={{
            left: textInput.x * stageScale + stagePos.x,
            top: textInput.y * stageScale + stagePos.y,
          }}
        >
          <input
            type="text"
            autoFocus
            value={textInput.value}
            onChange={(e) => setTextInput({ ...textInput, value: e.target.value })}
            onBlur={handleTextSubmit}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSubmit();
              if (e.key === "Escape") setTextInput(null);
            }}
            className="bg-white dark:bg-gray-800 border border-primary px-2 py-1 text-sm rounded shadow-lg outline-none"
            style={{ color: selectedColor }}
            placeholder="Enter text..."
            data-testid="input-text-annotation"
          />
        </div>
      )}

      <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs text-muted-foreground border border-card-border">
        Zoom: {Math.round(stageScale * 100)}%
      </div>
    </div>
  );
}
