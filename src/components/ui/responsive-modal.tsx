import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Phase M2 — ResponsiveModal.
 *
 * A mobile-first modal primitive. On phones (< md) it renders as a bottom
 * sheet (vaul Drawer): thumb-reachable actions, native swipe-to-dismiss,
 * safe-area padding. On tablets/desktop it renders as the standard shadcn
 * Dialog so keyboard and pointer flows stay first-class.
 *
 * Use for utility modals with forms, lists, or short flows (share, save-to,
 * settings, gift). Do NOT use for:
 *   • Confirm/destructive prompts → keep <AlertDialog />
 *   • Long-lived side panels → use <Sheet />
 *   • Command palettes → keep <CommandDialog />
 *
 * Accessibility: title/description are wired through the underlying
 * primitive so screen readers announce identically on both surfaces.
 */

interface RootProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function ResponsiveModal({ open, onOpenChange, children }: RootProps) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>{children}</Drawer>
  ) : (
    <Dialog open={open} onOpenChange={onOpenChange}>{children}</Dialog>
  );
}

interface TriggerProps extends React.ComponentProps<typeof DialogTrigger> {}
export function ResponsiveModalTrigger(props: TriggerProps) {
  const isMobile = useIsMobile();
  return isMobile ? <DrawerTrigger {...props} /> : <DialogTrigger {...props} />;
}

interface ContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}
export function ResponsiveModalContent({ className, children, ...rest }: ContentProps) {
  const isMobile = useIsMobile();
  return isMobile ? (
    <DrawerContent className={cn("max-h-[92vh] px-4 pb-[max(1rem,env(safe-area-inset-bottom))]", className)} {...rest}>
      <div className="overflow-y-auto">{children}</div>
    </DrawerContent>
  ) : (
    <DialogContent className={className} {...rest}>{children}</DialogContent>
  );
}

export function ResponsiveModalHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();
  const Cmp = isMobile ? DrawerHeader : DialogHeader;
  return <Cmp className={cn(isMobile && "px-0 text-left", className)} {...props} />;
}

export const ResponsiveModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(function ResponsiveModalTitle({ className, ...props }, ref) {
  const isMobile = useIsMobile();
  const Cmp = isMobile ? DrawerTitle : DialogTitle;
  return <Cmp ref={ref as never} className={className} {...props} />;
});

export const ResponsiveModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(function ResponsiveModalDescription({ className, ...props }, ref) {
  const isMobile = useIsMobile();
  const Cmp = isMobile ? DrawerDescription : DialogDescription;
  return <Cmp ref={ref as never} className={className} {...props} />;
});

export function ResponsiveModalFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const isMobile = useIsMobile();
  const Cmp = isMobile ? DrawerFooter : DialogFooter;
  return <Cmp className={cn(isMobile && "px-0 pb-0 pt-2", className)} {...props} />;
}
