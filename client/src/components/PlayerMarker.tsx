import { Group, Circle, Text } from "react-konva";
import type { PlayerObject } from "@shared/schema";
import Konva from "konva";

interface PlayerMarkerProps {
  player: PlayerObject;
  isSelected: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragMove: (pos: { x: number; y: number }) => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
  onClick: () => void;
}

export function PlayerMarker({
  player,
  isSelected,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onClick,
}: PlayerMarkerProps) {
  const size = player.size;
  const strokeWidth = isSelected ? 3 : 2;
  const shadowBlur = isDragging ? 12 : isSelected ? 8 : 4;

  return (
    <Group
      x={player.position.x}
      y={player.position.y}
      draggable
      onDragStart={onDragStart}
      onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => {
        const pos = e.target.position();
        onDragMove({ x: pos.x, y: pos.y });
      }}
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        const pos = e.target.position();
        onDragEnd({ x: pos.x, y: pos.y });
      }}
      onClick={onClick}
      onTap={onClick}
      data-testid={`player-marker-${player.id}`}
    >
      <Circle
        radius={size / 2}
        fill={player.teamColor}
        stroke={isSelected ? "#FFD700" : "rgba(0,0,0,0.3)"}
        strokeWidth={strokeWidth}
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={shadowBlur}
        shadowOffset={{ x: 2, y: 2 }}
        shadowOpacity={0.5}
      />
      <Circle
        radius={size / 2 - 4}
        fill="transparent"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={1}
      />
      <Text
        text={player.number}
        fontSize={size * 0.45}
        fontFamily="Montserrat, sans-serif"
        fontStyle="bold"
        fill="white"
        align="center"
        verticalAlign="middle"
        width={size}
        height={size}
        offsetX={size / 2}
        offsetY={size / 2}
        shadowColor="rgba(0,0,0,0.5)"
        shadowBlur={2}
        shadowOffset={{ x: 1, y: 1 }}
      />
      {player.label && (
        <Text
          text={player.label}
          fontSize={11}
          fontFamily="Montserrat, sans-serif"
          fill="white"
          align="center"
          y={size / 2 + 4}
          width={size + 20}
          offsetX={(size + 20) / 2}
          shadowColor="rgba(0,0,0,0.8)"
          shadowBlur={3}
          shadowOffset={{ x: 1, y: 1 }}
        />
      )}
    </Group>
  );
}
