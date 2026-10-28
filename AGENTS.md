<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Rendezvous architecture
- Qloo calls live only in `src/lib/qloo.server.ts` (hackathon base URL); keeps the key server-side.
- Rue is an AI SDK tool-calling agent in `src/lib/agent.server.ts` that ends with a structured `finish` tool; every result carries a `reason` citing taste data.
- Taste profiles and connections live in browser storage (`src/lib/store.ts`) so the demo has no login wall; only concierge requests are stored in the database, readable by admins only.
