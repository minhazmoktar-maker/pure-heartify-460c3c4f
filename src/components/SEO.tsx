import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  path: string; // route path, e.g. "/watch/abc"
  image?: string; // absolute URL
  type?: "website" | "article" | "video.other" | "profile";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** Explicit breadcrumb trail. If omitted, breadcrumbs are auto-derived from path segments. */
  breadcrumbs?: Array<{ name: string; path: string }>;
  /** Disable auto breadcrumbs (root pages). */
  noBreadcrumbs?: boolean;
  /** Disable auto Article schema for `type=article` pages. */
  noAutoArticle?: boolean;
  /** Extra <meta> keywords (comma-separated). */
  keywords?: string;
  /** Locale of the current page (defaults to "en"). */
  locale?: string;
}

const BASE = "https://pure-heartify.lovable.app";

/** Locales that hreflang alternates are emitted for. Keep in sync with src/i18n/dictionaries. */
const HREFLANG_LOCALES = ["en", "ar", "bn", "de", "fr", "id", "tr"] as const;

function titleCase(s: string): string {
  return s
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function deriveBreadcrumbs(path: string): Array<{ name: string; path: string }> {
  const segments = path.split("/").filter(Boolean);
  const trail: Array<{ name: string; path: string }> = [{ name: "Home", path: "/" }];
  let acc = "";
  segments.forEach((seg) => {
    acc += `/${seg}`;
    trail.push({ name: titleCase(decodeURIComponent(seg)), path: acc });
  });
  return trail;
}

/**
 * Per-route SEO tags. See docs/head-meta.md for the sitewide fallback
 * strategy — this component overrides <title>, description, canonical,
 * og:*, twitter:*, hreflang, and JSON-LD for JS-executing crawlers.
 *
 * Emits automatically:
 *   - BreadcrumbList JSON-LD from the URL path (opt out with noBreadcrumbs)
 *   - Article JSON-LD when type=article (opt out with noAutoArticle)
 *   - hreflang alternates for every supported locale
 * Additional entity schemas (VideoObject, FAQPage, Person, …) can be passed
 * through `jsonLd` as either a single object or an array; each is emitted
 * as its own <script type="application/ld+json"> tag.
 */
export default function SEO({
  title,
  description,
  path,
  image,
  type = "website",
  jsonLd,
  breadcrumbs,
  noBreadcrumbs,
  noAutoArticle,
  keywords,
  locale = "en",
}: SEOProps) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const canonical = `${BASE}${cleanPath}`;
  const clampedTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const clampedDesc =
    description.length > 160 ? description.slice(0, 157) + "…" : description;

  const graphs: Record<string, unknown>[] = [];

  // Auto BreadcrumbList
  if (!noBreadcrumbs) {
    const crumbs = breadcrumbs ?? deriveBreadcrumbs(cleanPath);
    if (crumbs.length > 1) {
      graphs.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: c.name,
          item: `${BASE}${c.path}`,
        })),
      });
    }
  }

  // Auto Article schema
  if (type === "article" && !noAutoArticle) {
    graphs.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: clampedTitle,
      description: clampedDesc,
      mainEntityOfPage: canonical,
      url: canonical,
      inLanguage: locale,
      image: image ?? undefined,
      publisher: {
        "@type": "Organization",
        name: "Heartify",
        url: BASE,
        logo: {
          "@type": "ImageObject",
          url: `${BASE}/icons/icon-512.png`,
        },
      },
    });
  }

  if (jsonLd) {
    (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).forEach((g) => graphs.push(g));
  }

  const ogType = type === "article" ? "article" : type === "video.other" ? "video.other" : type === "profile" ? "profile" : "website";

  return (
    <Helmet>
      <html lang={locale} />
      <title>{clampedTitle}</title>
      <meta name="description" content={clampedDesc} />
      {keywords ? <meta name="keywords" content={keywords} /> : null}
      <link rel="canonical" href={canonical} />

      {/* hreflang alternates */}
      {HREFLANG_LOCALES.map((lng) => (
        <link
          key={lng}
          rel="alternate"
          hrefLang={lng}
          href={`${canonical}${cleanPath.includes("?") ? "&" : "?"}lang=${lng}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Open Graph */}
      <meta property="og:title" content={clampedTitle} />
      <meta property="og:description" content={clampedDesc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Heartify" />
      <meta property="og:locale" content={locale === "ar" ? "ar_AR" : `${locale}_${locale.toUpperCase()}`} />
      {image ? <meta property="og:image" content={image} /> : null}

      {/* Twitter */}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={clampedTitle} />
      <meta name="twitter:description" content={clampedDesc} />
      {image ? <meta name="twitter:image" content={image} /> : null}

      {graphs.map((g, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(g)}
        </script>
      ))}
    </Helmet>
  );
}
