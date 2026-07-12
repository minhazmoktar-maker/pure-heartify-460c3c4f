import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFollows } from "@/hooks/useFollows";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Props {
  channelId: string;
  channelTitle?: string;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary";
}

export default function FollowButton({ channelId, channelTitle, size = "sm", variant = "outline" }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const { isFollowing, toggle } = useFollows();
  const following = isFollowing(channelId);

  return (
    <Button
      size={size}
      variant={following ? "secondary" : variant}
      onClick={() => {
        if (!user) return nav("/login");
        toggle.mutate(channelId);
      }}
      disabled={toggle.isPending}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${channelTitle ?? "channel"}` : `Follow ${channelTitle ?? "channel"}`}
    >
      {following ? <BellOff className="mr-1.5 h-4 w-4" /> : <Bell className="mr-1.5 h-4 w-4" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
