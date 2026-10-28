# Real-person live chat with Rue

## What judges can do
- Create their own taste profile without signing up.
- Invite a real person using a private link. The invited person creates their own profile and joins the same conversation.
- Exchange real messages, answer Rue’s taste-based games, and see the same game and scoreboard on both screens.
- Keep the solo demo available, clearly distinguished from real-person chat.
- After creating a guest taste profile, optionally create an account to save it across devices.
- Share the taste profile with a QR code, a copyable link, and available device sharing, WhatsApp, and email buttons.

## Changes
1. Make invitations work in both directions: the inviter sees the person who joins, and both can open their shared chat.
2. Add a waiting state until the other person joins; never impersonate a real participant.
3. Save shared messages, game state, and scores so refreshes do not lose the conversation. Keep personal taste profiles in browser storage; share only the profile snapshot needed for the invited pairing.
4. Have Rue host and score both people’s actual answers, rather than generating the partner’s answers. Preserve Qloo-grounded prompts and reasons.
5. Show clear sending, waiting, and error states, with recovery if Rue’s request fails while human messaging continues.
6. Keep guest saving immediate in the current browser. Offer a dismissible account-saving prompt after saving; never require an account to create or share tastes.
7. Add account signup, sign-in, sign-out, and password recovery. Save the existing guest taste profile only after a confirmed sign-in; show a check-your-email state when confirmation is required. Restore saved tastes on other devices and ask before overwriting a different local profile.
8. Add a scannable QR code and profile-sharing controls. Tell people which name, city, and favorites the recipient can see before sharing; never include account email or account credentials in links or QR codes.

## Technical details
- Add durable, private guest chat sessions in Lovable Cloud. This is the necessary exception to the current concierge-only database storage; no general user-profile directory or login wall is added.
- Use unguessable, separate invitation and participant credentials, checked server-side on every read and write. No public listing or direct anonymous access to chat records.
- Synchronize both browsers through authorized server calls with bounded polling; prevent duplicate messages and overlapping Rue turns with database-enforced claims.
- Keep Qloo requests and AI credentials server-side, preserve the existing model, and repair any verified request-contract failures affecting chat.
- Add private account-owned taste-profile storage with owner-only read/write policies and automatic profile creation on signup. Keep permissions in the existing separate roles table; account creation does not grant staff access.
- Generate QR codes locally from the same link used by the share buttons; no external QR service receives profile data.

## Verification
- Test two independent browser sessions: create profiles, send and accept an invitation, exchange messages in both directions, play a Rue game, and refresh to confirm the same conversation returns.
- Add tests for participant authorization, invitation acceptance, actual-person versus simulated replies, and duplicate-turn protection.
- Run existing relevant tests and check narrow and desktop layouts.
- Verify guest save, optional account save after confirmation, profile restoration, sign-out, and QR/link sharing. Verify recovery reaches a public new-password page.

## Not included
- A public people directory or changing the existing concierge/admin flow.