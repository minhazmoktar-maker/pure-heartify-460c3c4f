import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import SEO from "@/components/SEO";

function renderSEO(path: string, noindex?: boolean) {
  render(
    <HelmetProvider>
      <SEO title="Heartify" description="Beneficial knowledge" path={path} noindex={noindex} />
    </HelmetProvider>,
  );
}

const canonical = () =>
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null;
const robots = () =>
  document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content ?? null;

describe("SEO head tags", () => {
  it("emits a canonical on the project domain", async () => {
    renderSEO("/explore");
    await waitFor(() => expect(canonical()).toBe("https://heartifyapp.com/explore"));
  });

  it("marks public pages indexable", async () => {
    renderSEO("/privacy");
    await waitFor(() => expect(robots()).toContain("index, follow"));
  });

  it("noindexes private routes automatically", async () => {
    renderSEO("/admin/launch-gate");
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
  });

  it("honours an explicit noindex override", async () => {
    renderSEO("/explore", true);
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
  });

  it("skips hreflang alternates on noindexed routes", async () => {
    renderSEO("/profile");
    await waitFor(() => expect(robots()).toBe("noindex, nofollow"));
    expect(document.querySelectorAll('link[rel="alternate"][hreflang="bn"]').length).toBe(0);
  });
});
