import { Line, Arrow, Circle, Group } from "react-konva";
import type { Route } from "@shared/schema";

interface RouteLineProps {
  route: Route;
  isSelected: boolean;
  onSelect: () => void;
  onPointMove?: (pointIndex: number, pos: { x: number; y: number }) => void;
  showControlPoints?: boolean;
}

export function RouteLine({
  route,
  isSelected,
  onSelect,
  onPointMove,
  showControlPoints = false,
}: RouteLineProps) {
  if (route.points.length < 2) return null;

  const flatPoints = route.points.flatMap((p) => [p.x, p.y]);

  const getDashPattern = () => {
    switch (route.lineType) {
      case "dashed":
        return [10, 5];
      case "dotted":
        return [3, 3];
      default:
        return undefined;
    }
  };

  const LineComponent = route.hasArrow ? Arrow : Line;

  return (
    <Group>
      <LineComponent
        points={flatPoints}
        stroke={route.color}
        strokeWidth={route.strokeWidth}
        dash={getDashPattern()}
        tension={route.isCurved ? 0.5 : 0}
        lineCap="round"
        lineJoin="round"
        pointerLength={route.hasArrow ? 12 : 0}
        pointerWidth={route.hasArrow ? 10 : 0}
        onClick={onSelect}
        onTap={onSelect}
        shadowColor={isSelected ? "#FFD700" : "transparent"}
        shadowBlur={isSelected ? 6 : 0}
        hitStrokeWidth={15}
      />
      {showControlPoints &&
        isSelected &&
        route.points.map((point, index) => (
          <Circle
            key={index}
            x={point.x}
            y={point.y}
            radius={6}
            fill={index === 0 ? "#4CAF50" : index === route.points.length - 1 ? "#F44336" : "#2196F3"}
            stroke="white"
            strokeWidth={2}
            draggable
            onDragMove={(e) => {
              if (onPointMove) {
                const pos = e.target.position();
                onPointMove(index, { x: pos.x, y: pos.y });
              }
            }}
            data-testid={`route-point-${route.id}-${index}`}
          />
        ))}
    </Group>
  );
}
