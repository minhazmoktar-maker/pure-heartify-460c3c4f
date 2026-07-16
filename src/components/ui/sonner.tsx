import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton
      richColors={false}
      // Phase 3 — standardized durations (short-lived acks vs. persistent errors are set at call sites).
      duration={4000}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border group-[.toaster]:border-border group-[.toaster]:shadow-e2 group-[.toaster]:rounded-card group-[.toaster]:backdrop-blur-sm",
          title: "group-[.toast]:font-medium group-[.toast]:text-[0.925rem]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-md",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-md",
          closeButton:
            "group-[.toast]:bg-background group-[.toast]:border-border group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground",
          success:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-[hsl(var(--gold))] [&_[data-icon]]:text-[hsl(var(--gold))]",
          error:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-destructive [&_[data-icon]]:text-destructive",
          info: "group-[.toaster]:border-l-4 group-[.toaster]:border-l-primary [&_[data-icon]]:text-primary",
          warning:
            "group-[.toaster]:border-l-4 group-[.toaster]:border-l-[hsl(var(--gold))] [&_[data-icon]]:text-[hsl(var(--gold))]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
