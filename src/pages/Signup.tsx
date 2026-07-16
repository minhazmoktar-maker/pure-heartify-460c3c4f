// design-lint-disable-file — brand/canvas/chart palette requires literal hex colors
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Mail, Lock, Loader2, User } from "lucide-react";
import { toast } from "sonner";
import { growth } from "@/lib/growthEvents";
import SEO from "@/components/SEO";
import { AuthField } from "@/components/auth/AuthField";
import { PasswordStrength, scorePassword } from "@/components/auth/PasswordStrength";

type Errors = { displayName?: string; email?: string; password?: string; policy?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

const Signup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = safeNext(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const validate = (): Errors => {
    const e: Errors = {};
    if (!displayName.trim()) e.displayName = "Please enter a display name.";
    if (!email.trim()) e.email = "Email is required.";
    else if (!EMAIL_RE.test(email.trim())) e.email = "Enter a valid email address.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Use at least 8 characters.";
    else if (scorePassword(password) < 2) e.password = "Try a stronger password (mix case, numbers, symbols).";
    if (!acceptedPolicy) e.policy = "Please accept the Privacy Policy to continue.";
    return e;
  };

  const handleSignup = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length) return;
    setLoading(true);
    const redirectBase = window.location.origin;
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: nextPath ? `${redirectBase}${nextPath}` : redirectBase,
        data: { full_name: displayName.trim() },
      },
    });
    setLoading(false);
    if (error) {
      setErrors({ email: error.message });
      toast.error(error.message);
    } else {
      growth.signedUp("email");
      toast.success("Check your email to verify your account!");
      navigate("/verify-email");
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    if (!acceptedPolicy) {
      setErrors((s) => ({ ...s, policy: "Please accept the Privacy Policy to continue." }));
      return;
    }
    setLoading(true);
    growth.signedUp(provider);
    const redirectBase = window.location.origin;
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: nextPath ? `${redirectBase}${nextPath}` : redirectBase,
    });
    if (result.error) {
      toast.error(`${provider === "google" ? "Google" : "Apple"} sign-up failed. Please try again.`);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-8">
      <SEO
        title="Create your Heartify account"
        description="Join Heartify to save channels, follow curated halal content, and personalise your feed."
        path="/signup"
      />
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-card bg-primary">
              <span className="text-heading font-bold text-primary-foreground">H</span>
            </div>
            <span className="font-heading text-title font-bold text-foreground">
              Halal<span className="text-[hsl(var(--gold))]">Tube</span>
            </span>
          </Link>
          <h1 className="mt-2 text-heading font-semibold text-foreground">Create your Heartify account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join the Ummah — it takes 30 seconds.</p>
        </div>

        <div className="space-y-3">
          <button onClick={() => handleOAuth("google")} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/10 active:scale-[0.99]">
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </button>
          <button onClick={() => handleOAuth("apple")} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/10 active:scale-[0.99]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-micro text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSignup} noValidate className="space-y-4">
          <AuthField
            icon={User}
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              if (errors.displayName) setErrors((s) => ({ ...s, displayName: undefined }));
            }}
            error={errors.displayName ?? null}
            required
          />
          <AuthField
            icon={Mail}
            type="email"
            inputMode="email"
            autoComplete="email"
            enterKeyHint="next"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((s) => ({ ...s, email: undefined }));
            }}
            error={errors.email ?? null}
            required
          />
          <div className="space-y-2">
            <AuthField
              icon={Lock}
              passwordToggle
              autoComplete="new-password"
              placeholder="Password (min 8 characters)"
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

          <div>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={acceptedPolicy}
                onChange={(e) => {
                  setAcceptedPolicy(e.target.checked);
                  if (e.target.checked && errors.policy) setErrors((s) => ({ ...s, policy: undefined }));
                }}
                className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
              />
              <span className="text-muted-foreground">
                I accept the{" "}
                <Link to="/privacy" className="font-medium text-primary underline underline-offset-2" target="_blank">
                  Privacy Policy
                </Link>{" "}
                and acknowledge the AI disclaimer
              </span>
            </label>
            {errors.policy && (
              <p role="alert" className="mt-1 text-micro font-medium text-destructive">
                {errors.policy}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-card bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_2px_10px_-2px_hsl(var(--primary)/0.45)] transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Account
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"} className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
