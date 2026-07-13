import { Baby } from "lucide-react";
import { useKidsMode } from "@/contexts/KidsModeContext";
import { Switch } from "@/components/ui/switch";

export default function KidsModeToggle() {
  const { enabled, toggle } = useKidsMode();
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
      <Baby className="h-4 w-4 text-primary" />
      <span className="flex-1">Kids mode</span>
      <Switch checked={enabled} onCheckedChange={toggle} aria-label="Toggle Kids mode" />
    </label>
  );
}
