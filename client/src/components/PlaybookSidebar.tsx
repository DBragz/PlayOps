import { useState } from "react";
import { 
  Plus, 
  Search, 
  Copy, 
  Trash2, 
  FileText,
  Tag,
  Calendar,
  MoreVertical,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ClientPlay } from "@/lib/playStore";
import type { PlayTemplate } from "@/lib/playTemplates";
import type { SportType } from "@shared/schema";

interface PlaybookSidebarProps {
  plays: ClientPlay[];
  templates: PlayTemplate[];
  currentPlayId: string | null;
  onSelectPlay: (playId: string) => void;
  onCreatePlay: (name: string, sport: SportType) => void;
  onDuplicatePlay: (playId: string) => void;
  onDeletePlay: (playId: string) => void;
  onRenamePlay: (playId: string, name: string) => void;
  onCopyTemplate: (templateId: string) => void;
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

const sportLabels: Record<SportType, string> = {
  basketball: "Basketball",
  football: "Football",
  soccer: "Soccer",
  volleyball: "Volleyball",
  hockey: "Hockey",
  baseball: "Baseball",
  custom: "Custom",
};

export function PlaybookSidebar({
  plays,
  templates,
  currentPlayId,
  onSelectPlay,
  onCreatePlay,
  onDuplicatePlay,
  onDeletePlay,
  onRenamePlay,
  onCopyTemplate,
}: PlaybookSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewPlayDialog, setShowNewPlayDialog] = useState(false);
  const [newPlayName, setNewPlayName] = useState("");
  const [newPlaySport, setNewPlaySport] = useState<SportType>("basketball");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredPlays = plays.filter((play) => {
    const matchesSearch = play.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      play.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });
  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreatePlay = () => {
    if (newPlayName.trim()) {
      onCreatePlay(newPlayName.trim(), newPlaySport);
      setNewPlayName("");
      setShowNewPlayDialog(false);
    }
  };

  const formatDate = (dateString: string | Date | null) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="flex flex-col h-full bg-sidebar">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-lg">Playbook</h2>
          </div>
          <Button
            size="sm"
            onClick={() => setShowNewPlayDialog(true)}
            data-testid="button-new-play"
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plays..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
            data-testid="input-search-plays"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          <section className="mb-5" aria-labelledby="starter-templates-heading">
            <div className="flex items-center justify-between px-2 py-2">
              <h3 id="starter-templates-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Starter Templates
              </h3>
              <span className="text-xs text-muted-foreground">Read-only</span>
            </div>
            {filteredTemplates.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">No templates match your search.</p>
            ) : (
              <div className="space-y-1">
                {filteredTemplates.map((template) => (
                  <div key={template.id} className="flex items-center gap-2 rounded-md p-2 hover:bg-sidebar-accent/50">
                    <span className="text-lg flex-shrink-0">{sportEmojis[template.sport]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{template.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{template.description}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 px-2"
                      onClick={() => onCopyTemplate(template.id)}
                      aria-label={`Copy ${template.name} template`}
                      data-testid={`copy-template-${template.id}`}
                    >
                      <Copy className="h-3 w-3" />
                      <span className="text-xs">Copy</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <div className="mb-2 border-t border-sidebar-border" />
          <h3 className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your Plays
          </h3>
          {filteredPlays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm text-center">
                {plays.length === 0
                  ? "No plays yet. Create your first play!"
                  : "No plays match your search."}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredPlays.map((play) => (
                <div
                  key={play.id}
                  className={cn(
                    "group flex items-start gap-2 p-2 rounded-md cursor-pointer transition-colors hover-elevate",
                    currentPlayId === play.id
                      ? "bg-sidebar-accent"
                      : "hover:bg-sidebar-accent/50"
                  )}
                  onClick={() => onSelectPlay(play.id)}
                  data-testid={`play-item-${play.id}`}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">{sportEmojis[play.sport as SportType]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{play.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{sportLabels[play.sport as SportType]}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(play.updatedAt)}
                      </span>
                    </div>
                    {play.tags && play.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {play.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                        {play.tags.length > 2 && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0">
                            +{play.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                        data-testid={`play-menu-${play.id}`}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicatePlay(play.id);
                        }}
                        data-testid={`duplicate-play-${play.id}`}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirmId(play.id);
                        }}
                        data-testid={`delete-play-${play.id}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={showNewPlayDialog} onOpenChange={setShowNewPlayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Play</DialogTitle>
            <DialogDescription>
              Give your play a name and select a sport surface.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="play-name">Play Name</Label>
              <Input
                id="play-name"
                placeholder="e.g., Pick and Roll"
                value={newPlayName}
                onChange={(e) => setNewPlayName(e.target.value)}
                data-testid="input-new-play-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Sport</Label>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(sportLabels) as SportType[]).map((sport) => (
                  <Button
                    key={sport}
                    variant={newPlaySport === sport ? "default" : "outline"}
                    className="flex flex-col h-auto py-2"
                    onClick={() => setNewPlaySport(sport)}
                    data-testid={`sport-select-${sport}`}
                  >
                    <span className="text-xl mb-1">{sportEmojis[sport]}</span>
                    <span className="text-xs">{sportLabels[sport]}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPlayDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlay} disabled={!newPlayName.trim()} data-testid="button-create-play-confirm">
              Create Play
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Play</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this play? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  onDeletePlay(deleteConfirmId);
                  setDeleteConfirmId(null);
                }
              }}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
