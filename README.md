# Rendezvous — Rue knows.

Rue, a houndstooth-scarfed fox, is a taste-aware relationship host. She uses **Qloo's taste graph** to reveal what two people share, plan date nights, host playful games, and draft premium concierge plans.

## How Qloo powers it
- **Taste Profiles**: every favorite is resolved to a Qloo entity via `/search` (autocomplete).
- **Taste Reveal**: `compare_tastes` runs Qloo `/v2/insights` for each person across artists, films and shows, intersects the results and shared taste tags, then Rue explains common ground, bridges and wildcards.
- **Date Plan**: `find_places` queries Qloo insights for places filtered by city + category tag (restaurant, museum, bar) using *both* people's entities. `build_soundtrack` blends Qloo artist affinities.
- **Chat games**: options are built from both profiles plus Qloo affinities.
- **Concierge**: Qloo affinities produce a Taste Portrait and draft plan for Shalyn to review.

Every pick carries a `reason` citing the taste signal, and each screen shows which Qloo tools Rue called.

## Agentic design
Rue runs as an LLM agent (Lovable AI Gateway, AI SDK) that chooses among tools (`resolve_taste`, `get_affinities`, `compare_tastes`, `find_places`, `build_soundtrack`, `start_game`) and finishes with a structured `finish` call.

## Run locally
1. `bun install`
2. Set server env vars: `QLOO_API_KEY` (hackathon key, base `https://hackathon.api.qloo.com`), `LOVABLE_API_KEY`, plus the backend `SUPABASE_*` vars.
3. `bun run dev`

## Demo
Click **Try a demo** on the home page — no login. You play Noor; Rue simulates Theo. The Concierge Desk (`/admin`) needs an admin account.

MIT licensed.
