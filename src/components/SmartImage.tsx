import { forwardRef, useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SmartImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  /** Optional aspect ratio wrapper — accepts any Tailwind aspect utility (default: none, image sizes itself). */
  aspect?: string;
  /** Wrapper class for the aspect box (border-radius, overflow, etc.). */
  wrapperClassName?: string;
  /** If true, uses eager loading + high priority (above-the-fold hero images only). */
  priority?: boolean;
};

/**
 * Drop-in <img> replacement with:
 *   - `loading="lazy"` + `decoding="async"` by default (or eager when `priority`)
 *   - Blur-up placeholder (animated shimmer) until load/error
 *   - Broken-image fallback (subtle muted surface, no ugly icon)
 *   - Optional aspect-ratio wrapper to lock layout and prevent CLS
 * Keeps native <img> semantics — alt/src/srcset/sizes all forwarded.
 */
const SmartImage = forwardRef<HTMLImageElement, SmartImageProps>(
  ({ aspect, wrapperClassName, priority, className, onLoad, onError, alt, ...rest }, ref) => {
    const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

    const img = (
      <img
        ref={ref}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        // @ts-expect-error — fetchpriority isn't in the React 18 typings yet.
        fetchpriority={priority ? "high" : "auto"}
        alt={alt ?? ""}
        onLoad={(e) => {
          setState("loaded");
          onLoad?.(e);
        }}
        onError={(e) => {
          setState("error");
          onError?.(e);
        }}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-short ease-[cubic-bezier(0.22,1,0.36,1)]",
          state === "loaded" ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    );

    const placeholder = state !== "loaded" && (
      <div
        aria-hidden
        className={cn(
          "absolute inset-0",
          state === "error"
            ? "bg-muted"
            : "animate-pulse bg-gradient-to-br from-muted via-muted/70 to-muted",
        )}
      />
    );

    if (aspect) {
      return (
        <div className={cn("relative overflow-hidden", aspect, wrapperClassName)}>
          {placeholder}
          {img}
        </div>
      );
    }

    // No aspect wrapper: still layer the placeholder over the img via a relative shell.
    return (
      <div className={cn("relative", wrapperClassName)}>
        {placeholder}
        {img}
      </div>
    );
  },
);

SmartImage.displayName = "SmartImage";
export default SmartImage;
