import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordStrength, scorePassword } from "@/components/auth/PasswordStrength";

type Errors = { password?: string; confirmPassword?: string };

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setIsRecovery(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setIsRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const validate = (): Errors => {
    const e: Errors = {};
    if (password.length < 8) e.password = "Use at least 8 characters.";
    else if (scorePassword(password) < 2) e.password = "Try a stronger password (mix case, numbers, symbols).";
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErrors({ password: error.message });
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      navigate("/");
    }
  };

  if (!isRecovery) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">Invalid or expired reset link.</p>
          <Link to="/forgot-password" className="text-primary hover:underline">Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <SEO title="Set a new Password — Heartify" description="Choose a new password for your Heartify account." path="/reset-password" />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-heading text-heading font-bold text-foreground">Set New Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a strong password (min 8 characters)</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <AuthField
              icon={Lock}
              passwordToggle
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((s) => ({ ...s, password: undefined }));
              }}
              error={errors.password ?? null}
              required
              minLength={8}
            />
            <PasswordStrength value={password} />
          </div>
          <AuthField
            icon={Lock}
            passwordToggle
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) setErrors((s) => ({ ...s, confirmPassword: undefined }));
            }}
            error={errors.confirmPassword ?? null}
            required
            minLength={8}
          />
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_2px_10px_-2px_hsl(var(--primary)/0.45)] transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
