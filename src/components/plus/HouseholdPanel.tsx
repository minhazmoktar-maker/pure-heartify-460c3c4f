import { useState } from "react";
import { Loader2, Mail, Users, X, LogOut, Plus, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useHousehold } from "@/hooks/useHousehold";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UpgradeCTA from "@/components/UpgradeCTA";

/**
 * Family-seats management UI shown on `/plus`.
 * - Signed-out: prompt to sign in.
 * - Signed-in + no plan: shows waitlist upgrade nudge (via UpgradeCTA).
 * - Owner: create household, invite by email, revoke invites, remove members.
 * - Member: see household name + owner + leave button.
 */
export default function HouseholdPanel() {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, loading: entLoading } = useEntitlement();
  const { household, members, invites, loading, refresh } = useHousehold();
  const [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");

  if (authLoading || entLoading || loading) {
    return (
      <div className="flex items-center gap-2 rounded-card border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading family seats…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-card border border-border bg-card p-6">
        <h3 className="font-heading text-heading font-semibold">Family seats</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to create or join a Heartify+ household and share your plan with up to 5 family members.
        </p>
        <Button asChild className="mt-4"><a href="/login?next=/plus">Sign in</a></Button>
      </div>
    );
  }

  const isOwner = household?.owner_id === user.id;
  const seatsUsed = members.length + invites.length;

  // No household yet — owner path requires premium
  if (!household) {
    if (!isPremium) {
      return (
        <div className="rounded-card border border-border bg-card p-6">
          <h3 className="font-heading text-heading font-semibold">Family seats</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Heartify+ Family lets you share one plan with up to 5 family members. Upgrade to create your household.
          </p>
          <div className="mt-4"><UpgradeCTA feature="Family seats" /></div>
        </div>
      );
    }
    return (
      <div className="rounded-card border border-border bg-card p-6">
        <h3 className="font-heading text-heading font-semibold">Create your household</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Your Heartify+ plan supports up to 5 family seats. Create your household to start inviting.
        </p>
        <Button
          className="mt-4"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const { error } = await supabase
              .from("plus_households")
              .insert({ owner_id: user.id, name: "My Family", plan: "family", seat_limit: 5 });
            setBusy(false);
            if (error) toast.error(error.message);
            else { toast.success("Household created"); await refresh(); }
          }}
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Create household
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[hsl(var(--gold))]" aria-hidden />
            <h3 className="font-heading text-heading font-semibold">{household.name}</h3>
          </div>
          <p className="mt-1 text-micro text-muted-foreground">
            {seatsUsed} of {household.seat_limit} seats used {isOwner ? "· you're the owner" : "· you're a member"}
          </p>
        </div>
        {!isOwner && (
          <Button
            variant="outline" size="sm"
            onClick={async () => {
              if (!confirm("Leave this household? You'll lose access to shared Heartify+ benefits.")) return;
              const { error } = await supabase
                .from("plus_household_members").delete().eq("user_id", user.id);
              if (error) toast.error(error.message);
              else { toast.success("You left the household"); await refresh(); }
            }}
          >
            <LogOut className="mr-1.5 h-3.5 w-3.5" /> Leave
          </Button>
        )}
      </div>

      {/* Members */}
      <ul className="mt-4 divide-y divide-border/60 rounded-card border border-border">
        {members.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">No members yet.</li>
        )}
        {members.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-foreground">
                {m.user_id === user.id ? "You" : `Member ${m.user_id.slice(0, 8)}`}
              </p>
              <p className="text-micro text-muted-foreground">
                {m.role === "owner" ? "Owner" : "Member"} · joined {new Date(m.joined_at).toLocaleDateString()}
              </p>
            </div>
            {isOwner && m.user_id !== user.id && (
              <Button
                size="sm" variant="ghost"
                onClick={async () => {
                  if (!confirm("Remove this member from your household?")) return;
                  const { error } = await supabase
                    .from("plus_household_members").delete().eq("id", m.id);
                  if (error) toast.error(error.message);
                  else { toast.success("Member removed"); await refresh(); }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      {/* Owner-only: invites */}
      {isOwner && (
        <>
          {invites.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-micro font-semibold uppercase tracking-wide text-muted-foreground">
                Pending invites
              </p>
              <ul className="divide-y divide-border/60 rounded-card border border-border">
                {invites.map((inv) => {
                  const link = `${window.location.origin}/plus/join?token=${inv.token}`;
                  return (
                    <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{inv.invited_email}</p>
                        <p className="text-micro text-muted-foreground">
                          Expires {new Date(inv.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        size="sm" variant="ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(link);
                          toast.success("Invite link copied");
                        }}
                        aria-label="Copy invite link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        onClick={async () => {
                          const { error } = await supabase
                            .from("plus_seat_invites")
                            .update({ status: "revoked" })
                            .eq("id", inv.id);
                          if (error) toast.error(error.message);
                          else { toast.success("Invite revoked"); await refresh(); }
                        }}
                        aria-label="Revoke invite"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={async (e) => {
              e.preventDefault();
              const email = inviteEmail.trim().toLowerCase();
              if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Enter a valid email"); return; }
              if (seatsUsed >= household.seat_limit) {
                toast.error(`Household is full (${household.seat_limit} seats).`); return;
              }
              setBusy(true);
              const { error } = await supabase
                .from("plus_seat_invites")
                .insert({ household_id: household.id, invited_email: email, created_by: user.id });
              setBusy(false);
              if (error) toast.error(error.message);
              else { toast.success("Invite sent"); setInviteEmail(""); await refresh(); }
            }}
          >
            <div className="flex-1">
              <Label htmlFor="invite-email" className="text-micro">Invite a family member</Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="family@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={busy || seatsUsed >= household.seat_limit}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Send invite
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
