import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageCircle, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.string().trim().email("Enter a valid email.").max(255),
  topic: z.enum(["general", "bug", "content", "privacy", "billing"]),
  message: z.string().trim().min(10, "Please write a bit more.").max(4000),
});

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", topic: "general" as const, message: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setBusy(true);
    try {
      // Best-effort: store in analytics_events (already has user_id-agnostic policy for inserts).
      await supabase.from("analytics_events").insert([{
        event_name: "contact_submitted",
        properties: parsed.data as unknown as Record<string, unknown>,
      }]);
      toast.success("Thanks — we'll get back to you shortly.");
      setForm({ name: "", email: "", topic: "general", message: "" });
    } catch {
      toast.error("Could not send. Email us directly at hello@heartify.app.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <SEO
        title="Contact Heartify — Support, Privacy & Trust"
        description="Get in touch with the Heartify team for support, privacy requests, content reports, and billing questions."
        path="/contact"
      />
      <h1 className="font-heading text-3xl font-bold text-foreground">Contact us</h1>
      <p className="mt-2 text-muted-foreground">
        We're a small team. Every message is read by a human, in shaa Allah.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <a href="mailto:hello@heartify.app" className="rounded-xl border border-border bg-card p-4 hover:bg-accent/5">
          <Mail className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium text-foreground">General</p>
          <p className="text-xs text-muted-foreground">hello@heartify.app</p>
        </a>
        <a href="mailto:privacy@heartify.app" className="rounded-xl border border-border bg-card p-4 hover:bg-accent/5">
          <ShieldAlert className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium text-foreground">Privacy / DSAR</p>
          <p className="text-xs text-muted-foreground">privacy@heartify.app</p>
        </a>
        <Link to="/trust" className="rounded-xl border border-border bg-card p-4 hover:bg-accent/5">
          <MessageCircle className="mb-2 h-5 w-5 text-primary" />
          <p className="text-sm font-medium text-foreground">Trust & Safety</p>
          <p className="text-xs text-muted-foreground">Report abuse / appeals</p>
        </Link>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">Your name</span>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={100}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground">Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={255}
              required
            />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">Topic</span>
          <select
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value as typeof form.topic })}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="general">General question</option>
            <option value="bug">Report a bug</option>
            <option value="content">Content report</option>
            <option value="privacy">Privacy / data request</option>
            <option value="billing">Billing / subscription</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-foreground">Message</span>
          <textarea
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            rows={6}
            maxLength={4000}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}
