import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Home, Search, Compass, BookOpen, Heart, ListVideo, Gift, Baby,
  Sparkles, Video, User, Bookmark, Bell, Settings, Play, Star,
} from "lucide-react";
import { useKidsMode } from "@/contexts/KidsModeContext";

interface Item {
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string;
  group: string;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { toggle: toggleKids, enabled: kidsOn } = useKidsMode();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey);
      if (isCmdK) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => () => {
    setOpen(false);
    navigate(path);
  };

  const items: Item[] = [
    { group: "Watch", label: "Browse videos", icon: Home, action: go("/"), keywords: "home feed" },
    { group: "Watch", label: "Shorts (under 60s)", icon: Video, action: go("/shorts"), keywords: "reels vertical" },
    { group: "Watch", label: "Search", icon: Search, action: go("/search") },
    { group: "Watch", label: "Bookmarks", icon: Bookmark, action: go("/bookmarks") },
    { group: "Watch", label: "Watch later", icon: ListVideo, action: go("/playlists?filter=watch-later") },
    { group: "Watch", label: "Playlists", icon: ListVideo, action: go("/playlists") },

    { group: "Qur'an & duas", label: "Mushaf reader", icon: BookOpen, action: go("/mushaf/1") },
    { group: "Qur'an & duas", label: "Adhkar", icon: Star, action: go("/adhkar") },
    { group: "Qur'an & duas", label: "Dua wall", icon: Heart, action: go("/dua-wall") },
    { group: "Qur'an & duas", label: "Kids duas", icon: Baby, action: go("/kids-duas") },

    { group: "Explore", label: "Channels", icon: Compass, action: go("/channels") },
    { group: "Explore", label: "Creators", icon: Sparkles, action: go("/creators") },
    { group: "Explore", label: "Leaderboards", icon: Sparkles, action: go("/leaderboards") },

    { group: "Account", label: "Profile", icon: User, action: go("/profile") },
    { group: "Account", label: "Notifications", icon: Bell, action: go("/notifications") },
    { group: "Account", label: "Settings", icon: Settings, action: go("/settings") },
    { group: "Account", label: "Heartify Plus", icon: Sparkles, action: go("/plus") },
    { group: "Account", label: "Redeem gift code", icon: Gift, action: go("/redeem") },

    {
      group: "Preferences",
      label: kidsOn ? "Turn Kids mode OFF" : "Turn Kids mode ON",
      icon: Baby,
      action: () => { toggleKids(); setOpen(false); },
      keywords: "children safe filter",
    },
    { group: "Preferences", label: "Play Daily Dose", icon: Play, action: go("/") },
  ];

  const grouped = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.group] ??= []).push(it);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(grouped).map(([group, list], idx) => (
          <div key={group}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {list.map((it) => (
                <CommandItem
                  key={it.label}
                  value={`${it.label} ${it.keywords ?? ""}`}
                  onSelect={it.action}
                >
                  <it.icon className="mr-2 h-4 w-4" />
                  <span>{it.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </div>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
