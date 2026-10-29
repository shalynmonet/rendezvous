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
- Lifestyle disclosure is field-by-field opt-in at database RPC read/claim/preview boundaries; chat prompts exclude lifestyle entirely, planning receives only anonymous constraints, and generated output has a discretion guard. Owner profile edits update capability-authorized room profiles so consent can be revoked.
- Qloo calls live only in `src/lib/qloo.server.ts` (hackathon base URL); keeps the key server-side.
- Ru is an AI SDK tool-calling agent in `src/lib/agent.server.ts` that ends with a structured `finish` tool; every result carries a `reason` citing taste data.
- Guests remain browser-local without a login wall; signed-in state automatically saves to a revision-checked owner-only workspace and uses account-scoped browser caches. Importing existing guest data requires an explicit choice to avoid cross-account leakage.
- Guest chat access goes through capability-checking database RPCs; hashed invitation and participant keys are distinct, direct anonymous table access is forbidden, and server completions require a database-issued claim to avoid duplicate Ru turns.
- Live chat is a shared multi-human game, not a standard single-user AI transcript: human messages sync via authorized polling, and the hosted structured finish turn uses an NDJSON heartbeat stream so both humans can keep chatting independently of Ru.
- Live host scheduling follows a client-safe eligibility policy and database claims; shared room mute invalidates in-flight completions so paused hosting cannot publish late turns.
- Chat uses shared conversation-style rules for open questions, stories, follow-ups and occasional games; every turn retains a non-null conversation card for answer gating, and only scored-game answers can change scores.
- Account state has one root provider; saving/restoring guest tastes requires confirmed authentication and explicit conflict resolution, and QR images are generated locally from the sharing link.
- Shared Ru-lette state lives on the private guest room and goes only through the capability-checked guest_ruelette RPC; photos sit in a private bucket served by short-lived signed URLs after that check, so only the two participants can see them.
- Subsequent shared spins use a room-locked proposal approved by the other participant and an expected spin ID; this preserves current activity state and rejects stale or duplicate replacements.
- Simulated chats are browser-local sessions keyed by connection; persist messages, game, mood and scores before navigation, and derive demo recaps from the selected session rather than the global live-chat summary.
- Account chat snapshots autosave to owner-scoped saved_chats and remain credential-free/read-only; live snapshots are read through room capability checks server-side. Verified live room capabilities are backed up separately in a server-only table, restored only for their authenticated owner after a fresh capability check.
- Persist generated plans, reveals, solo Ru-lette activities, quiz/checklist progress, private photo data, and Ru-view memories in the central workspace; UI-only loading and animation state stays transient.
- People lists account-saved non-demo partners directly from owner-scoped snapshots, without importing them into the guest store or restoring room capabilities; new live snapshots retain the saving participant's side for correct partner identification.
- Ru-lette initializes a local demo pair only when no usable pair exists, preserving an existing personal taste profile and any selected live room.
- Each connection has one ongoing local chat thread; Ru's fresh start records a reset index instead of creating a new thread, so history is never lost. Account-saved partners are merged into connections via useAccountPeople. Ru's agent runs on Gemini through the gateway's Chat Completions endpoint to cut credit cost.
- People are identified by name plus profile evidence (city, taste overlap) in `src/lib/person-identity.ts`, never by name alone, so two contacts who share a name stay on separate cards and each thread stays with its own person; private lifestyle answers are never identity evidence. Every connection records `addedAt`, shown beside clashing names as a tiebreaker but never used to decide identity, since a re-invited person also gets a new date.
