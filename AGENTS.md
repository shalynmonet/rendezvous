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
- Ru is an AI SDK tool-calling agent in `src/lib/agent.server.ts` that ends with a structured `finish` tool; every result carries a `reason` citing taste data.
- Guest taste profiles and connections remain browser-local with no login wall; optional account profiles and saved chat snapshots use owner-only storage, while live pairing rooms use capability-authorized storage.
- Guest chat access goes through capability-checking database RPCs; hashed invitation and participant keys are distinct, direct anonymous table access is forbidden, and server completions require a database-issued claim to avoid duplicate Ru turns.
- Live chat is a shared multi-human game, not a standard single-user AI transcript: human messages sync via authorized polling, and the hosted structured finish turn uses an NDJSON heartbeat stream so both humans can keep chatting independently of Ru.
- Live host scheduling follows a client-safe eligibility policy and database claims; shared room mute invalidates in-flight completions so paused hosting cannot publish late turns.
- Chat uses shared conversation-style rules for open questions, stories, follow-ups and occasional games; every turn retains a non-null conversation card for answer gating, and only scored-game answers can change scores.
- Account state has one root provider; saving/restoring guest tastes requires confirmed authentication and explicit conflict resolution, and QR images are generated locally from the sharing link.
- Shared Ru-lette state lives on the private guest room and goes only through the capability-checked guest_ruelette RPC; photos sit in a private bucket served by short-lived signed URLs after that check, so only the two participants can see them.
- Subsequent shared spins use a room-locked proposal approved by the other participant and an expected spin ID; this preserves current activity state and rejects stale or duplicate replacements.
- Simulated chats are browser-local sessions keyed by connection; persist messages, game, mood and scores before navigation, and derive demo recaps from the selected session rather than the global live-chat summary.
- Account chat saving is explicit and stores credential-free snapshots in owner-scoped saved_chats; live snapshots are read through room capability checks server-side, and saved history is read-only rather than restoring room access.
- Ru-lette initializes a local demo pair only when no usable pair exists, preserving an existing personal taste profile and any selected live room.
