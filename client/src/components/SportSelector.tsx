import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { SportType } from "@shared/schema";

interface SportSelectorProps {
  currentSport: SportType;
  onSportChange: (sport: SportType) => void;
}

const sportEmojis: Record<SportType, string> = {
  basketball: "🏀",
  football: "🏈",
  soccer: "⚽",
  volleyball: "🏐",
  hockey: "🏒",
  baseball: "⚾",
  custom: "📋",
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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2" data-testid="sport-selector">
          <span className="text-lg">{sportEmojis[current.id]}</span>
          <span>{current.label}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {sports.map((sport) => (
          <DropdownMenuItem
            key={sport.id}
            onClick={() => onSportChange(sport.id)}
            className="gap-2"
            data-testid={`sport-option-${sport.id}`}
          >
            <span className="text-lg">{sportEmojis[sport.id]}</span>
            <span>{sport.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
