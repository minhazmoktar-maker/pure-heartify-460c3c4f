import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gift, Snowflake, Crown, Loader2 } from "lucide-react";
import { useGifts } from "@/hooks/useGifts";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useEntitlement } from "@/hooks/useEntitlement";
import { toast } from "sonner";

interface Props {
  freezesAvailable?: number;
  trigger?: React.ReactNode;
}

/**
 * Unified gift dialog: send a streak freeze or a premium month to a friend
 * by their user ID (obtained from a profile share link). Enforced server-side.
 */
export function GiftDialog({ freezesAvailable = 0, trigger }: Props) {
  const freezeFlag = useFeatureFlag("viral.gift_freeze", true);
  const premiumFlag = useFeatureFlag("viral.gift_premium", true);
  const { plan } = useEntitlement();
  const isPremium = plan === "premium";
  const { giftFreeze, giftPremium } = useGifts();
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [months, setMonths] = useState(1);
  const [sending, setSending] = useState(false);

  const reset = () => { setRecipient(""); setNote(""); setMonths(1); };

  const handleFreeze = async () => {
    if (!recipient.trim()) return toast.error("Enter a recipient user ID");
    setSending(true);
    try {
      await giftFreeze(recipient.trim(), note.trim() || undefined);
      toast.success("Streak freeze gifted 🎁");
      reset(); setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send gift");
    } finally { setSending(false); }
  };

  const handlePremium = async () => {
    if (!recipient.trim()) return toast.error("Enter a recipient user ID");
    setSending(true);
    try {
      await giftPremium(recipient.trim(), months, note.trim() || undefined);
      toast.success(`Gifted ${months} month(s) of Premium 🎁`);
      reset(); setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send gift");
    } finally { setSending(false); }
  };

  if (!freezeFlag && !premiumFlag) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Gift className="h-4 w-4" /> Send a gift
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" /> Send a gift
          </DialogTitle>
          <DialogDescription>
            Gift a friend a streak freeze or a month of Premium. Enter their user ID from their profile share link.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={freezeFlag ? "freeze" : "premium"}>
          <TabsList className="w-full">
            {freezeFlag && <TabsTrigger value="freeze" className="flex-1"><Snowflake className="mr-1 h-4 w-4" />Freeze</TabsTrigger>}
            {premiumFlag && <TabsTrigger value="premium" className="flex-1"><Crown className="mr-1 h-4 w-4" />Premium</TabsTrigger>}
          </TabsList>

          {freezeFlag && (
            <TabsContent value="freeze" className="space-y-3">
              <p className="text-xs text-muted-foreground">You have <b>{freezesAvailable}</b> unused freeze(s). Gifting spends one from your balance.</p>
              <div className="space-y-1.5">
                <Label htmlFor="freeze-recipient">Recipient user ID</Label>
                <Input id="freeze-recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="uuid" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="freeze-note">Note (optional)</Label>
                <Textarea id="freeze-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2} />
              </div>
              <DialogFooter>
                <Button onClick={handleFreeze} disabled={sending || freezesAvailable < 1}>
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send freeze
                </Button>
              </DialogFooter>
            </TabsContent>
          )}

          {premiumFlag && (
            <TabsContent value="premium" className="space-y-3">
              {!isPremium ? (
                <p className="text-sm text-muted-foreground">Only Premium members can gift Premium.</p>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="pr-recipient">Recipient user ID</Label>
                    <Input id="pr-recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="uuid" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pr-months">Months (1–12)</Label>
                    <Input id="pr-months" type="number" min={1} max={12}
                      value={months} onChange={(e) => setMonths(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pr-note">Note (optional)</Label>
                    <Textarea id="pr-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2} />
                  </div>
                  <DialogFooter>
                    <Button onClick={handlePremium} disabled={sending}>
                      {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Gift Premium
                    </Button>
                  </DialogFooter>
                </>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
