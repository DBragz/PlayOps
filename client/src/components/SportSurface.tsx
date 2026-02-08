import { Group, Rect, Line, Circle, Arc, Text } from "react-konva";
import type { SportType } from "@shared/schema";

interface SportSurfaceProps {
  sport: SportType;
  width: number;
  height: number;
  isDark: boolean;
}

export function SportSurface({ sport, width, height, isDark }: SportSurfaceProps) {
  const lineColor = isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)";
  const fillColor = isDark ? "#1a2836" : "#e8d5c4";
  const courtColor = isDark ? "#2a3847" : "#d4a574";
  const grassColor = isDark ? "#1a3320" : "#3d7a3d";
  const fieldLineColor = isDark ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.9)";

  switch (sport) {
    case "basketball":
      return <BasketballCourt width={width} height={height} lineColor={lineColor} courtColor={courtColor} isDark={isDark} />
        // <img src="/basketball_court_1.jpg" width={width} height={height} />
    case "football":
      return <FootballField width={width} height={height} lineColor={fieldLineColor} fieldColor={grassColor} isDark={isDark} />;
    case "soccer":
      return <SoccerField width={width} height={height} lineColor={fieldLineColor} fieldColor={grassColor} isDark={isDark} />;
    case "volleyball":
      return <VolleyballCourt width={width} height={height} lineColor={lineColor} courtColor={courtColor} isDark={isDark} />;
    case "hockey":
      return <HockeyCourt width={width} height={height} lineColor={lineColor} courtColor={isDark ? "#1e4d6b" : "#bde0f4"} isDark={isDark} />;
    case "baseball":
      return <BaseballField width={width} height={height} lineColor={lineColor} fieldColor={grassColor} isDark={isDark} />;
    case "custom":
    default:
      return <CustomSurface width={width} height={height} fillColor={fillColor} lineColor={lineColor} isDark={isDark} />;
  }
}

function BasketballCourt({ width, height, lineColor, courtColor, isDark }: { width: number; height: number; lineColor: string; courtColor: string; isDark: boolean }) {
  const margin = 40;
  const courtWidth = width - margin * 2;
  const courtHeight = height - margin * 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const keyWidth = courtWidth * 0.19;
  const keyHeight = courtHeight * 0.35;
  const threePointRadius = courtWidth * 0.24;
  const strokeWidth = 2;

  return (
    <Group>
      <Rect x={margin} y={margin} width={courtWidth} height={courtHeight} fill={courtColor} cornerRadius={4} />
      <Rect x={margin} y={margin} width={courtWidth} height={courtHeight} stroke={lineColor} strokeWidth={strokeWidth + 1} cornerRadius={4} />
      <Line points={[centerX, margin, centerX, margin + courtHeight]} stroke={lineColor} strokeWidth={strokeWidth} />
      <Circle x={centerX} y={centerY} radius={courtHeight * 0.15} stroke={lineColor} strokeWidth={strokeWidth} />
      <Circle x={centerX} y={centerY} radius={4} fill={lineColor} />

      {/* Left key */}
      <Rect x={margin} y={centerY - keyHeight / 2} width={keyWidth} height={keyHeight} stroke={lineColor} strokeWidth={strokeWidth} />
      <Arc x={margin + keyWidth} y={centerY} innerRadius={0} outerRadius={keyHeight / 2} angle={180} rotation={-90} stroke={lineColor} strokeWidth={strokeWidth} />

      {/* Right key */}
      <Rect x={margin + courtWidth - keyWidth} y={centerY - keyHeight / 2} width={keyWidth} height={keyHeight} stroke={lineColor} strokeWidth={strokeWidth} />
      <Arc x={margin + courtWidth - keyWidth} y={centerY} innerRadius={0} outerRadius={keyHeight / 2} angle={180} rotation={90} stroke={lineColor} strokeWidth={strokeWidth} />

      {/* Three-point lines */}
      <Arc x={margin + 30} y={centerY} innerRadius={threePointRadius} outerRadius={threePointRadius} angle={180} rotation={-90} stroke={lineColor} strokeWidth={strokeWidth} />
      <Arc x={margin + courtWidth - 30} y={centerY} innerRadius={threePointRadius} outerRadius={threePointRadius} angle={180} rotation={90} stroke={lineColor} strokeWidth={strokeWidth} />
    </Group>
  );
}

function FootballField({ width, height, lineColor, fieldColor, isDark }: { width: number; height: number; lineColor: string; fieldColor: string; isDark: boolean }) {
  const margin = 30;
  const fieldWidth = width - margin * 2;
  const fieldHeight = height - margin * 2;
  const endZoneWidth = fieldWidth * 0.1;
  const strokeWidth = 2;

  const yardLines = [];
  for (let i = 1; i < 10; i++) {
    const x = margin + endZoneWidth + (fieldWidth - endZoneWidth * 2) * (i / 10);
    yardLines.push(
      <Line key={`yard-${i}`} points={[x, margin, x, margin + fieldHeight]} stroke={lineColor} strokeWidth={1} dash={[5, 5]} />
    );
    const yardNum = i <= 5 ? i * 10 : (10 - i) * 10;
    yardLines.push(
      <Text key={`yard-text-${i}`} x={x - 10} y={margin + fieldHeight / 2 - 8} text={String(yardNum)} fontSize={14} fill={lineColor} fontStyle="bold" />
    );
  }

  return (
    <Group>
      <Rect x={margin} y={margin} width={fieldWidth} height={fieldHeight} fill={fieldColor} cornerRadius={4} />
      <Rect x={margin} y={margin} width={fieldWidth} height={fieldHeight} stroke={lineColor} strokeWidth={strokeWidth + 1} cornerRadius={4} />
      <Rect x={margin} y={margin} width={endZoneWidth} height={fieldHeight} fill={isDark ? "#2d1810" : "#8B0000"} stroke={lineColor} strokeWidth={strokeWidth} />
      <Rect x={margin + fieldWidth - endZoneWidth} y={margin} width={endZoneWidth} height={fieldHeight} fill={isDark ? "#0d1830" : "#00008B"} stroke={lineColor} strokeWidth={strokeWidth} />
      {yardLines}
    </Group>
  );
}

function SoccerField({ width, height, lineColor, fieldColor, isDark }: { width: number; height: number; lineColor: string; fieldColor: string; isDark: boolean }) {
  const margin = 30;
  const fieldWidth = width - margin * 2;
  const fieldHeight = height - margin * 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const penaltyAreaWidth = fieldWidth * 0.16;
  const penaltyAreaHeight = fieldHeight * 0.44;
  const goalAreaWidth = fieldWidth * 0.055;
  const goalAreaHeight = fieldHeight * 0.2;
  const strokeWidth = 2;

  return (
    <Group>
      <Rect x={margin} y={margin} width={fieldWidth} height={fieldHeight} fill={fieldColor} cornerRadius={4} />
      <Rect x={margin} y={margin} width={fieldWidth} height={fieldHeight} stroke={lineColor} strokeWidth={strokeWidth + 1} cornerRadius={4} />
      <Line points={[centerX, margin, centerX, margin + fieldHeight]} stroke={lineColor} strokeWidth={strokeWidth} />
      <Circle x={centerX} y={centerY} radius={fieldHeight * 0.15} stroke={lineColor} strokeWidth={strokeWidth} />
      <Circle x={centerX} y={centerY} radius={4} fill={lineColor} />

      {/* Left penalty area */}
      <Rect x={margin} y={centerY - penaltyAreaHeight / 2} width={penaltyAreaWidth} height={penaltyAreaHeight} stroke={lineColor} strokeWidth={strokeWidth} />
      <Rect x={margin} y={centerY - goalAreaHeight / 2} width={goalAreaWidth} height={goalAreaHeight} stroke={lineColor} strokeWidth={strokeWidth} />
      <Circle x={margin + penaltyAreaWidth * 0.7} y={centerY} radius={3} fill={lineColor} />

      {/* Right penalty area */}
      <Rect x={margin + fieldWidth - penaltyAreaWidth} y={centerY - penaltyAreaHeight / 2} width={penaltyAreaWidth} height={penaltyAreaHeight} stroke={lineColor} strokeWidth={strokeWidth} />
      <Rect x={margin + fieldWidth - goalAreaWidth} y={centerY - goalAreaHeight / 2} width={goalAreaWidth} height={goalAreaHeight} stroke={lineColor} strokeWidth={strokeWidth} />
      <Circle x={margin + fieldWidth - penaltyAreaWidth * 0.7} y={centerY} radius={3} fill={lineColor} />
    </Group>
  );
}

function VolleyballCourt({ width, height, lineColor, courtColor, isDark }: { width: number; height: number; lineColor: string; courtColor: string; isDark: boolean }) {
  const margin = 40;
  const courtWidth = width - margin * 2;
  const courtHeight = height - margin * 2;
  const centerX = width / 2;
  const attackLineOffset = courtWidth * 0.17;
  const strokeWidth = 2;

  return (
    <Group>
      <Rect x={margin} y={margin} width={courtWidth} height={courtHeight} fill={courtColor} cornerRadius={4} />
      <Rect x={margin} y={margin} width={courtWidth} height={courtHeight} stroke={lineColor} strokeWidth={strokeWidth + 1} cornerRadius={4} />
      <Line points={[centerX, margin, centerX, margin + courtHeight]} stroke={lineColor} strokeWidth={strokeWidth + 2} />
      <Line points={[margin + attackLineOffset, margin, margin + attackLineOffset, margin + courtHeight]} stroke={lineColor} strokeWidth={strokeWidth} dash={[10, 5]} />
      <Line points={[margin + courtWidth - attackLineOffset, margin, margin + courtWidth - attackLineOffset, margin + courtHeight]} stroke={lineColor} strokeWidth={strokeWidth} dash={[10, 5]} />
      <Text x={centerX - 20} y={margin - 20} text="NET" fontSize={12} fill={lineColor} fontStyle="bold" />
    </Group>
  );
}

function HockeyCourt({ width, height, lineColor, courtColor, isDark }: { width: number; height: number; lineColor: string; courtColor: string; isDark: boolean }) {
  const margin = 30;
  const courtWidth = width - margin * 2;
  const courtHeight = height - margin * 2;
  const centerX = width / 2;
  const centerY = height / 2;
  const cornerRadius = 40;
  const strokeWidth = 2;

  return (
    <Group>
      <Rect x={margin} y={margin} width={courtWidth} height={courtHeight} fill={courtColor} cornerRadius={cornerRadius} />
      <Rect x={margin} y={margin} width={courtWidth} height={courtHeight} stroke={lineColor} strokeWidth={strokeWidth + 1} cornerRadius={cornerRadius} />
      <Line points={[centerX, margin, centerX, margin + courtHeight]} stroke="#CC0000" strokeWidth={strokeWidth + 1} />
      <Circle x={centerX} y={centerY} radius={courtHeight * 0.12} stroke="#0066CC" strokeWidth={strokeWidth} />
      <Circle x={centerX} y={centerY} radius={4} fill="#0066CC" />
      <Line points={[margin + courtWidth * 0.2, margin, margin + courtWidth * 0.2, margin + courtHeight]} stroke="#0066CC" strokeWidth={strokeWidth} />
      <Line points={[margin + courtWidth * 0.8, margin, margin + courtWidth * 0.8, margin + courtHeight]} stroke="#0066CC" strokeWidth={strokeWidth} />
      <Circle x={margin + courtWidth * 0.2} y={centerY - courtHeight * 0.25} radius={courtHeight * 0.08} stroke="#CC0000" strokeWidth={strokeWidth} />
      <Circle x={margin + courtWidth * 0.2} y={centerY + courtHeight * 0.25} radius={courtHeight * 0.08} stroke="#CC0000" strokeWidth={strokeWidth} />
      <Circle x={margin + courtWidth * 0.8} y={centerY - courtHeight * 0.25} radius={courtHeight * 0.08} stroke="#CC0000" strokeWidth={strokeWidth} />
      <Circle x={margin + courtWidth * 0.8} y={centerY + courtHeight * 0.25} radius={courtHeight * 0.08} stroke="#CC0000" strokeWidth={strokeWidth} />
    </Group>
  );
}

function BaseballField({ width, height, lineColor, fieldColor, isDark }: { width: number; height: number; lineColor: string; fieldColor: string; isDark: boolean }) {
  const centerX = width / 2;
  const baseY = height - 80;
  const infieldSize = Math.min(width, height) * 0.35;
  const dirtColor = isDark ? "#3d2817" : "#c4a777";
  const strokeWidth = 2;

  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height} fill={fieldColor} />
      <Line points={[centerX, baseY, 40, height * 0.3]} stroke={lineColor} strokeWidth={strokeWidth} />
      <Line points={[centerX, baseY, width - 40, height * 0.3]} stroke={lineColor} strokeWidth={strokeWidth} />
      <Circle x={centerX} y={baseY - infieldSize * 0.6} radius={infieldSize * 0.7} fill={dirtColor} />
      <Rect x={centerX - infieldSize / 2} y={baseY - infieldSize} width={infieldSize} height={infieldSize} rotation={45} offsetX={0} offsetY={0} stroke={lineColor} strokeWidth={strokeWidth} fill="transparent" />
      <Rect x={centerX - 8} y={baseY - 8} width={16} height={16} fill="white" stroke={lineColor} strokeWidth={1} rotation={45} offsetX={8} offsetY={8} />
      <Rect x={centerX - infieldSize * 0.5 - 6} y={baseY - infieldSize * 0.5 - 6} width={12} height={12} fill="white" stroke={lineColor} strokeWidth={1} />
      <Rect x={centerX - 6} y={baseY - infieldSize - 6} width={12} height={12} fill="white" stroke={lineColor} strokeWidth={1} />
      <Rect x={centerX + infieldSize * 0.5 - 6} y={baseY - infieldSize * 0.5 - 6} width={12} height={12} fill="white" stroke={lineColor} strokeWidth={1} />
      <Circle x={centerX} y={baseY - infieldSize * 0.5} radius={15} fill={dirtColor} stroke={lineColor} strokeWidth={1} />
    </Group>
  );
}

function CustomSurface({ width, height, fillColor, lineColor, isDark }: { width: number; height: number; fillColor: string; lineColor: string; isDark: boolean }) {
  const gridSize = 50;
  const lines = [];

  for (let x = gridSize; x < width; x += gridSize) {
    lines.push(
      <Line key={`v-${x}`} points={[x, 0, x, height]} stroke={lineColor} strokeWidth={0.5} opacity={0.3} />
    );
  }
  for (let y = gridSize; y < height; y += gridSize) {
    lines.push(
      <Line key={`h-${y}`} points={[0, y, width, y]} stroke={lineColor} strokeWidth={0.5} opacity={0.3} />
    );
  }

  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height} fill={fillColor} />
      {lines}
    </Group>
  );
}
