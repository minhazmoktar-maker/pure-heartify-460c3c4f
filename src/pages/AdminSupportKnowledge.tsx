import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { BookOpen, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

/**
 * No-code knowledge management for the Help assistant.
 *
 * Everything the support agent is allowed to say lives here: policy articles,
 * their version/effective date, and an optional short FAQ answer that the
 * deterministic layer can serve with no AI call at all.
 *
 * Saving bumps the global knowledge version (DB trigger), which expires every
 * cached answer produced against the previous version — so a policy edit can
 * never keep being served from cache.
 */

const CATEGORIES = [
  "account", "authentication", "privacy", "security", "videos", "search",
  "favorites", "watch_history", "daily_dose", "streaks", "profile",
  "notifications", "downloads", "premium", "payments", "content_policy",
  "halal_policy", "reporting", "creator_policy", "technical_support",
  "troubleshooting", "safety", "terms", "refunds", "data_deletion", "general",
];

const AUTHORITY = ["policy", "legal", "product", "faq"];

interface Article {
  id: string;
  slug: string;
  title: string;
  body: string;
  summary: string | null;
  category: string;
  language: string;
  authority_level: string;
  source_url: string | null;
  status: string;
  version: number;
  effective_date: string;
  keywords: string[];
  intents: string[];
  faq_question: string | null;
  faq_answer: string | null;
  cacheable: boolean;
  requires_auth: boolean;
  requires_personalization: boolean;
  updated_at: string;
}

const EMPTY: Omit<Article, "id" | "updated_at" | "version"> = {
  slug: "",
  title: "",
  body: "",
  summary: "",
  category: "general",
  language: "en",
  authority_level: "product",
  source_url: null,
  status: "draft",
  effective_date: new Date().toISOString().slice(0, 10),
  keywords: [],
  intents: [],
  faq_question: "",
  faq_answer: "",
  cacheable: true,
  requires_auth: false,
  requires_personalization: false,
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-micro font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-micro text-muted-foreground">{hint}</span>}
    </label>
  );
}

export default function AdminSupportKnowledge() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Article>>({ ...EMPTY });
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("support_kb_documents")
      .select(
        "id, slug, title, body, summary, category, language, authority_level, source_url, status, version, effective_date, keywords, intents, faq_question, faq_answer, cacheable, requires_auth, requires_personalization, updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(300);
    if (error) toast.error(error.message);
    else setArticles((data ?? []) as Article[]);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) =>
      `${a.title} ${a.slug} ${a.category} ${a.keywords.join(" ")}`.toLowerCase().includes(q));
  }, [articles, query]);

  const select = (a: Article | null) => {
    setSelectedId(a?.id ?? null);
    setDraft(a ? { ...a } : { ...EMPTY });
  };

  const save = async (publish?: boolean) => {
    const title = (draft.title ?? "").trim();
    const body = (draft.body ?? "").trim();
    if (!title || !body) {
      toast.error("Title and body are required.");
      return;
    }
    setSaving(true);
    const payload = {
      slug: (draft.slug || slugify(title)).trim(),
      title,
      body,
      summary: (draft.summary ?? "")?.toString().trim() || null,
      category: draft.category ?? "general",
      language: draft.language ?? "en",
      authority_level: draft.authority_level ?? "product",
      source_url: (draft.source_url ?? "")?.toString().trim() || null,
      status: publish === undefined ? (draft.status ?? "draft") : publish ? "published" : "draft",
      effective_date: draft.effective_date ?? new Date().toISOString().slice(0, 10),
      keywords: draft.keywords ?? [],
      intents: draft.intents ?? [],
      faq_question: (draft.faq_question ?? "")?.toString().trim() || null,
      faq_answer: (draft.faq_answer ?? "")?.toString().trim() || null,
      cacheable: draft.cacheable ?? true,
      requires_auth: draft.requires_auth ?? false,
      requires_personalization: draft.requires_personalization ?? false,
    };

    const res = selectedId
      ? await supabase
        .from("support_kb_documents")
        .update({ ...payload, version: (draft.version ?? 1) + 1 })
        .eq("id", selectedId)
        .select("id")
        .single()
      : await supabase.from("support_kb_documents").insert(payload).select("id").single();

    if (res.error) {
      setSaving(false);
      toast.error(res.error.message);
      return;
    }

    // Re-embed so the new wording is retrievable, then reload.
    const { error: indexError } = await supabase.functions.invoke("support-kb-index", { body: { force: true } });
    setSaving(false);
    if (indexError) toast.warning("Saved, but re-indexing failed — run it from the Support AI console.");
    else toast.success("Saved, re-indexed, and affected cached answers were expired.");
    setSelectedId(res.data?.id ?? null);
    void load();
  };

  const remove = async () => {
    if (!selectedId) return;
    const { error } = await supabase.from("support_kb_documents").delete().eq("id", selectedId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Article deleted.");
    select(null);
    void load();
  };

  const setList = (key: "keywords" | "intents", value: string) =>
    setDraft((d) => ({ ...d, [key]: value.split(",").map((s) => s.trim()).filter(Boolean) }));

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">
      <SEO
        title="Support knowledge — Heartify Admin"
        description="Create and publish the help articles and FAQ answers the support assistant is allowed to use."
        path="/admin/support-knowledge"
      />

      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <BookOpen aria-hidden className="h-5 w-5 text-primary" />
            <span className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">Knowledge</span>
          </div>
          <h1 className="font-heading text-heading font-bold text-foreground">Support knowledge base</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/admin/support-ai"
            className="flex min-h-11 items-center rounded-card border border-border px-3 text-sm text-foreground hover:bg-muted"
          >
            Assistant health
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="flex min-h-11 items-center gap-2 rounded-card border border-border px-3 text-sm hover:bg-muted"
          >
            <RefreshCw aria-hidden className="h-4 w-4" /> Refresh
          </button>
          <button
            type="button"
            onClick={() => select(null)}
            className="flex min-h-11 items-center gap-2 rounded-card bg-primary px-3 text-sm font-medium text-primary-foreground"
          >
            <Plus aria-hidden className="h-4 w-4" /> New article
          </button>
        </div>
      </header>

      <SupportFaqDrafts onPublished={() => void load()} />

      <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">

        <aside className="rounded-card border border-border bg-card p-3">
          <label htmlFor="kb-search" className="sr-only">Search articles</label>
          <input
            id="kb-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles…"
            className="field-input min-h-11 w-full"
          />
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <ul className="mt-3 max-h-[32rem] space-y-1 overflow-y-auto">
              {filtered.length === 0 && <li className="p-2 text-sm text-muted-foreground">No articles.</li>}
              {filtered.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => select(a)}
                    className={`w-full rounded-card px-2 py-2 text-start text-sm hover:bg-muted ${selectedId === a.id ? "bg-muted" : ""}`}
                  >
                    <span className="block truncate font-medium text-foreground">{a.title}</span>
                    <span className="block text-micro text-muted-foreground">
                      {a.category.replace(/_/g, " ")} · v{a.version} · {a.status}
                      {a.faq_answer ? " · FAQ" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="rounded-card border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Title">
              <input
                value={draft.title ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="field-input min-h-11 w-full"
              />
            </Field>
            <Field label="Slug" hint="Left blank, it is generated from the title.">
              <input
                value={draft.slug ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, slug: slugify(e.target.value) }))}
                className="field-input min-h-11 w-full"
              />
            </Field>
            <Field label="Category">
              <select
                value={draft.category ?? "general"}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                className="field-input min-h-11 w-full"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
            <Field label="Authority" hint="Legal and policy articles outrank product docs when they disagree.">
              <select
                value={draft.authority_level ?? "product"}
                onChange={(e) => setDraft((d) => ({ ...d, authority_level: e.target.value }))}
                className="field-input min-h-11 w-full"
              >
                {AUTHORITY.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Language">
              <input
                value={draft.language ?? "en"}
                onChange={(e) => setDraft((d) => ({ ...d, language: e.target.value.slice(0, 5) }))}
                className="field-input min-h-11 w-full"
              />
            </Field>
            <Field label="Effective date">
              <input
                type="date"
                value={draft.effective_date ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, effective_date: e.target.value }))}
                className="field-input min-h-11 w-full"
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="Body" hint="The grounding text the assistant may quote. Never leave policy claims implied.">
              <textarea
                value={draft.body ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                rows={10}
                className="field-input w-full"
              />
            </Field>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="FAQ question" hint="Exact question users ask. Enables an instant, AI-free answer.">
              <input
                value={draft.faq_question ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, faq_question: e.target.value }))}
                className="field-input min-h-11 w-full"
              />
            </Field>
            <Field label="Keywords" hint="Comma separated. Used by the deterministic matcher.">
              <input
                value={(draft.keywords ?? []).join(", ")}
                onChange={(e) => setList("keywords", e.target.value)}
                className="field-input min-h-11 w-full"
              />
            </Field>
          </div>

          <div className="mt-3">
            <Field label="FAQ answer" hint="Short, self-contained answer served without calling any AI model.">
              <textarea
                value={draft.faq_answer ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, faq_answer: e.target.value }))}
                rows={4}
                className="field-input w-full"
              />
            </Field>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Intents" hint="Comma separated intent tags for routing.">
              <input
                value={(draft.intents ?? []).join(", ")}
                onChange={(e) => setList("intents", e.target.value)}
                className="field-input min-h-11 w-full"
              />
            </Field>
            <Field label="Source URL" hint="Public page this article mirrors, if any.">
              <input
                value={draft.source_url ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, source_url: e.target.value }))}
                className="field-input min-h-11 w-full"
              />
            </Field>
          </div>

          <fieldset className="mt-4 space-y-2">
            <legend className="text-micro font-medium text-muted-foreground">Answer handling</legend>
            {([
              ["cacheable", "Answer may be cached and reused across users"],
              ["requires_auth", "Only relevant to signed-in users"],
              ["requires_personalization", "Needs the user's own account data — never cached or served as FAQ"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex min-h-11 items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(draft[key])}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.checked }))}
                  className="h-5 w-5"
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(true)}
              className="flex min-h-11 items-center gap-2 rounded-card bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <Save aria-hidden className="h-4 w-4" /> {saving ? "Saving…" : "Save & publish"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(false)}
              className="min-h-11 rounded-card border border-border px-4 text-sm hover:bg-muted disabled:opacity-50"
            >
              Save as draft
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={() => void remove()}
                className="flex min-h-11 items-center gap-2 rounded-card border border-destructive px-3 text-sm text-destructive hover:bg-destructive/10"
              >
                <Trash2 aria-hidden className="h-4 w-4" /> Delete
              </button>
            )}
            {selectedId && (
              <span className="text-micro text-muted-foreground">
                Version {draft.version ?? 1} · saving publishes version {(draft.version ?? 1) + 1}
              </span>
            )}
          </div>

          <p className="mt-3 text-micro text-muted-foreground">
            Publishing bumps the knowledge version and expires every cached answer written against older knowledge, so
            outdated policy can never be replayed from cache.
          </p>
        </section>
      </div>
    </main>
  );
}
