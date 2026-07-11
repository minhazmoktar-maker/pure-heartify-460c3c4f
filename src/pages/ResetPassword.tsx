import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
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
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="font-heading text-xl font-bold text-foreground">Set New Password</h1>
          <p className="mt-1 text-sm text-muted-foreground">Choose a strong password (min 8 characters)</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input type={showPassword ? "text" : "password"} placeholder="New password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3">
              {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="h-10 w-full rounded-lg border border-border bg-background pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none" />
          </div>
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
