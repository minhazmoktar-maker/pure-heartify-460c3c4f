# GSC & SEO monitoring checklist

Daily automated run: `.github/workflows/gsc-monitor.yml` (08:00 UTC).
Weekly manual sanity check (5 min):

- [ ] Open GSC → Coverage: no new errors vs. last week
- [ ] Sitemaps tab: all sitemaps status = Success, discovered URLs ≥ published routes
- [ ] Core Web Vitals: no URLs regressed to "Poor"
- [ ] Manual actions: none
- [ ] Security issues: none
- [ ] Top queries: verify branded query ("heartify") ranks #1
- [ ] Compare impressions vs. last week (≥ ±20% swing = investigate)

On alert (issue auto-opened by `gsc-monitor.yml`):
1. Read the failing run log for the specific sitemap / URL.
2. Reproduce locally: `SITE_URL=https://pure-heartify.lovable.app/ node scripts/gsc-monitor.mjs`.
3. Fix + re-submit sitemap via `PUT /webmasters/v3/sites/<encoded>/sitemaps/<encoded>`.
4. Close the issue with a link to the fix PR.
