import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Circle, Hexagon, Pentagon, Square, Diamond, Octagon, Layout } from "lucide-react";
import type { SportType } from "@shared/schema";

interface SportSelectorProps {
  currentSport: SportType;
  onSportChange: (sport: SportType) => void;
}

const sportIcons: Record<SportType, React.ComponentType<{ className?: string }>> = {
  basketball: Circle,
  football: Hexagon,
  soccer: Pentagon,
  volleyball: Square,
  hockey: Diamond,
  baseball: Octagon,
  custom: Layout,
};

const sports: { id: SportType; label: string }[] = [
  { id: "basketball", label: "Basketball" },
  { id: "football", label: "Football" },
  { id: "soccer", label: "Soccer" },
  { id: "volleyball", label: "Volleyball" },
  { id: "hockey", label: "Hockey" },
  { id: "baseball", label: "Baseball" },
  { id: "custom", label: "Custom" },
];

export function SportSelector({ currentSport, onSportChange }: SportSelectorProps) {
  const current = sports.find((s) => s.id === currentSport) || sports[0];
  const CurrentIcon = sportIcons[current.id];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="sport-selector">
          <CurrentIcon className="h-4 w-4 text-primary" />
          <span>{current.label}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {sports.map((sport) => {
          const Icon = sportIcons[sport.id];
          return (
            <DropdownMenuItem
              key={sport.id}
              onClick={() => onSportChange(sport.id)}
              className="gap-2"
              data-testid={`sport-option-${sport.id}`}
            >
              <Icon className="h-4 w-4 text-primary" />
              <span>{sport.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
