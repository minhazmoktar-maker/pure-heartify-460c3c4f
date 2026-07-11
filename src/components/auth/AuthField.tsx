import * as React from "react";
import { Eye, EyeOff, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  icon?: LucideIcon;
  label?: string;
  type?: string;
  error?: string | null;
  hint?: string;
  /** For password fields — renders an inline show/hide toggle. */
  passwordToggle?: boolean;
}

/**
 * Unified auth field: leading icon, branded focus ring, inline validation choreography,
 * and standardized password visibility toggle. Used by Login, Signup, Forgot/ResetPassword.
 */
export const AuthField = React.forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ icon: Icon, label, error, hint, className, id, passwordToggle, type = "text", ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);
    const reactId = React.useId();
    const inputId = id ?? `af-${reactId}`;
    const errId = `${inputId}-err`;
    const hintId = `${inputId}-hint`;
    const resolvedType = passwordToggle ? (visible ? "text" : "password") : type;
    const invalid = Boolean(error);

    return (
      <div className={cn("space-y-1.5", invalid && "animate-shake")}>
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-muted-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon
              aria-hidden
              className={cn(
                "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
                invalid ? "text-destructive" : "text-muted-foreground",
              )}
            />
          )}
          <input
            {...props}
            ref={ref}
            id={inputId}
            type={resolvedType}
            aria-invalid={invalid || undefined}
            aria-describedby={cn(error && errId, hint && hintId) || undefined}
            className={cn(
              "field-input w-full",
              Icon && "pl-10",
              passwordToggle && "pr-10",
              invalid && "field-input--invalid",
              className,
            )}
          />
          {passwordToggle && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide password" : "Show password"}
              className="tap-target absolute right-0 top-1/2 -translate-y-1/2 pr-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-foreground"
            >
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
        {error ? (
          <p id={errId} role="alert" className="text-xs font-medium text-destructive">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
AuthField.displayName = "AuthField";
