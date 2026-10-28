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
- Guest taste profiles and connections remain browser-local with no login wall; optional account profiles use owner-only storage and private shared guest chat sessions are the only additional cloud-stored pairing snapshots and messages.
- Guest chat access goes through capability-checking database RPCs; hashed invitation and participant keys are distinct, direct anonymous table access is forbidden, and server completions require a database-issued claim to avoid duplicate Rue turns.
- Live chat is a shared multi-human game, not a standard single-user AI transcript: human messages sync via authorized polling, and the hosted structured finish turn uses an NDJSON heartbeat stream so both humans can keep chatting independently of Rue.
- Account state has one root provider; saving/restoring guest tastes requires confirmed authentication and explicit conflict resolution, and QR images are generated locally from the sharing link.
- Shared Rue-lette state lives on the private guest room and goes only through the capability-checked guest_ruelette RPC; photos sit in a private bucket served by short-lived signed URLs after that check, so only the two participants can see them.
