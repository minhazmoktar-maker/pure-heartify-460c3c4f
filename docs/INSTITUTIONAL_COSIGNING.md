# Institutional co-signed attestations

Heartify keeps an append-only attestation ledger for every reviewed video. A partner
institution (university, fatwa council, seminary, education body) can independently
**co-sign** a ledger record with its own key. The badge on `/verify/:videoId` is then
evidence from a third party, not Heartify vouching for itself.

## Onboarding a partner (Heartify admin)

1. Go to `/admin/institutions`.
2. Fill in name, slug, type, country, website, logo, contact email and the public
   statement that should appear on `/verify`.
3. Press **Register & mint signing key**. The key is shown **once** — send it to the
   partner over a secure channel. Only a SHA-256 hash is stored.
4. Suspend a partner at any time; suspended partners disappear from the directory and
   their badges stop rendering.

## Co-signing (partner side)

```bash
curl -X POST "https://<project>.supabase.co/rest/v1/rpc/institution_cosign" \
  -H "apikey: <publishable key>" -H "content-type: application/json" \
  -d '{
        "_slug": "your-institution-slug",
        "_api_key": "hfi_...",
        "_video_id": "YOUTUBE_ID",
        "_statement": "Reviewed by our fatwa committee, Sha`ban 1447."
      }'
```

Response contains the ledger `chain_digest` and the signature:

```
signature = HMAC_SHA256(key = api_key, message = chain_digest)
```

Re-signing the same video updates the signature and un-revokes it.

## Verification (anyone)

- `get_video_cosignatures(_video_id)` returns each co-signature plus
  `binds_current_ledger` — `true` only when the signed digest is still the active
  ledger record. If Heartify re-reviews the video, the flag flips to `false` and the UI
  shows "Signed an earlier record" until the partner re-signs.
- A partner can reproduce the HMAC locally from the digest and its own key, so a forged
  signature is detectable without trusting Heartify.

## Target partners (3–5 to launch)

Aim for institutional diversity — one Arabic-world seminary or ifta body, one South Asian
darul uloom, one Southeast Asian council, one Western Islamic university or accredited
education body. Partnerships, not code, are the moat here.
