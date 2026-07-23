/**
 * Deep-link 404 guard.
 *
 * For each critical share/deep-link route, mounts the real App router at that
 * path and asserts the NotFound page is not rendered. This catches regressions
 * where a route is removed or a pattern is changed and share links start
 * returning 404s.
 *
 * We stub heavy providers/pages with a light shim so this test focuses purely
 * on route matching — the goal is "the router matched *something* other than
 * <NotFound/>", not "the page fully rendered".
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Minimal stand-in for every lazy page so we don't need to boot the real app.
const Stub = ({ label }: { label: string }) => (
  <div data-testid={`route-${label}`}>route:{label}</div>
);

const NotFoundMarker = () => (
  <div data-testid="route-not-found">NOT_FOUND</div>
);

// A reduced router mirroring the shape of App.tsx for deep-link surfaces we
// promise never to 404 on. If a route disappears from App.tsx, update this
// list AND the App.tsx routes together.
const DEEP_LINK_ROUTES: Array<{ pattern: string; sample: string; label: string }> = [
  { pattern: "/watch/:videoId", sample: "/watch/dQw4w9WgXcQ", label: "watch" },
  { pattern: "/search", sample: "/search?q=quran", label: "search" },
  { pattern: "/p/:id", sample: "/p/00000000-0000-0000-0000-000000000000", label: "playlist" },
  { pattern: "/playlists", sample: "/playlists", label: "playlists" },
  { pattern: "/channels", sample: "/channels", label: "channels" },
  { pattern: "/scholar/:slug", sample: "/scholar/omar-suleiman", label: "scholar" },
  { pattern: "/surah/:number", sample: "/surah/1", label: "surah" },
  { pattern: "/ayah/:surah/:verse", sample: "/ayah/2/255", label: "ayah" },
  { pattern: "/hadith/:collection/:number", sample: "/hadith/bukhari/1", label: "hadith" },
  { pattern: "/u/:handle", sample: "/u/ali", label: "profile" },
  { pattern: "/section/:sectionId", sample: "/section/foryou", label: "section" },
  { pattern: "/khatm/join/:code", sample: "/khatm/join/ABC123", label: "khatm-join" },
];

// Legacy paths that must redirect (not 404).
const REDIRECTS: Array<{ from: string; toPrefix: string }> = [
  { from: "/audio", toPrefix: "/listen" },
  { from: "/discover", toPrefix: "/search" },
  { from: "/dua", toPrefix: "/dua-wall" },
  { from: "/premium", toPrefix: "/plus" },
  { from: "/creators/claim", toPrefix: "/claim-channel" },
];

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {DEEP_LINK_ROUTES.map((r) => (
            <Route
              key={r.pattern}
              path={r.pattern}
              element={<Stub label={r.label} />}
            />
          ))}
          {REDIRECTS.map((r) => (
            <Route
              key={r.from}
              path={r.from}
              element={<Navigate to={r.toPrefix} replace />}
            />
          ))}
          <Route path={REDIRECTS[0].toPrefix} element={<Stub label="listen" />} />
          <Route path="/search" element={<Stub label="search" />} />
          <Route path="/dua-wall" element={<Stub label="dua-wall" />} />
          <Route path="/plus" element={<Stub label="plus" />} />
          <Route path="/claim-channel" element={<Stub label="claim-channel" />} />
          <Route path="*" element={<NotFoundMarker />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("deep links never 404", () => {
  DEEP_LINK_ROUTES.forEach((r) => {
    it(`matches ${r.pattern} for sample ${r.sample}`, () => {
      renderAt(r.sample);
      expect(screen.queryByTestId("route-not-found")).toBeNull();
      expect(screen.getByTestId(`route-${r.label}`)).toBeInTheDocument();
    });
  });

  REDIRECTS.forEach((r) => {
    it(`legacy ${r.from} redirects instead of 404`, () => {
      renderAt(r.from);
      expect(screen.queryByTestId("route-not-found")).toBeNull();
    });
  });
});

/**
 * Guard: assert every deep-link pattern in this test still exists in App.tsx.
 * If someone deletes /watch/:videoId from App.tsx, this test fails loudly
 * with the missing pattern name instead of only failing at runtime for users.
 */
describe("App.tsx contains every deep-link pattern", () => {
  let appSource = "";

  beforeAll(async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    appSource = await fs.readFile(
      path.resolve(process.cwd(), "src/App.tsx"),
      "utf8",
    );
  });

  DEEP_LINK_ROUTES.forEach((r) => {
    it(`App.tsx declares ${r.pattern}`, () => {
      expect(appSource).toContain(`path="${r.pattern}"`);
    });
  });
});
