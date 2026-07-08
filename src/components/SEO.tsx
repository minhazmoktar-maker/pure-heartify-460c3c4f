import { Helmet } from "react-helmet-async";

interface SEOProps {
  title: string;
  description: string;
  path: string; // route path, e.g. "/watch/abc"
  image?: string; // absolute URL
  type?: "website" | "article" | "video.other";
  jsonLd?: Record<string, unknown>;
}

const BASE = "https://pure-heartify.lovable.app";

/**
 * Per-route SEO tags. See docs/head-meta.md for the sitewide fallback
 * strategy — this component overrides <title>, description, canonical,
 * og:*, and twitter:* for JS-executing crawlers.
 */
export default function SEO({
  title,
  description,
  path,
  image,
  type = "website",
  jsonLd,
}: SEOProps) {
  const canonical = `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const clampedTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const clampedDesc =
    description.length > 160 ? description.slice(0, 157) + "…" : description;
  return (
    <Helmet>
      <title>{clampedTitle}</title>
      <meta name="description" content={clampedDesc} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={clampedTitle} />
      <meta property="og:description" content={clampedDesc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      {image ? <meta property="og:image" content={image} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={clampedTitle} />
      <meta name="twitter:description" content={clampedDesc} />
      {image ? <meta name="twitter:image" content={image} /> : null}
      {jsonLd ? (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      ) : null}
    </Helmet>
  );
}
