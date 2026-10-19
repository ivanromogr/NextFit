# Chat safety: first implementation

Work branch: `codex/chat-moderation`. Android installation and iOS/Apple device authentication remain deferred. This work does not complete the full chat/moderation milestone.

## Behavior

- Current active client/trainer assignment still controls sending. Existing history remains available after detachment.
- Web and mobile provide confirmed blocking/unblocking and reporting of individual received messages. A block stops new sends and read receipts in both directions; either user's block is sufficient. Unblocking your own block cannot remove the other person's block. History is preserved.
- Only the recipient can report a persisted message. Repeated reports by the same account for the same message preserve the first reason. Reports start at `PENDING`; reporting does not automatically ban a user or promise a review time.
- Block/report ownership comes from the authenticated account, never from a request body. No public endpoint lists reports or exposes who blocked/reported another user.
- New messages cannot supply an existing ID, change their sender/date/read status, or use arbitrary file URLs. Text is trimmed, empty messages without an attachment and text over 4000 characters are rejected. The backend's verified attachment ID remains the authority.
- Automatic greetings wait for history loading and run at most once per selected conversation. Incoming live messages are matched by both participants. Old history responses, socket callbacks and attachment uploads cannot populate or send through a newly selected conversation.
- Native STOMP connects through Spring's raw `/ws/websocket` transport. Web keeps SockJS. Both read the access token from memory rather than profile metadata. Reconnects obtain the current token.

## API

All routes require authentication:

| Method | Route | Result |
| --- | --- | --- |
| GET | `/api/chat/safety/{otherUserId}` | `blockedByMe`, `canSend` |
| PUT | `/api/chat/blocks/{otherUserId}` | Create own block; return state |
| DELETE | `/api/chat/blocks/{otherUserId}` | Remove own block; return state |
| POST | `/api/chat/messages/{messageId}/reports` | `{reason: HARASSMENT|SPAM|INAPPROPRIATE|OTHER}`, 202 |

Rejected STOMP sends/read receipts return a `CHAT_ERROR` object on the authenticated user's queue. Clients show the error and reload conversation availability. Global unread indicators ignore these control messages.

## Deployment

Two additional tables are required: `chat_blocks` and `chat_reports`. The additive PostgreSQL script is [sql/2026-10-chat-safety.sql](sql/2026-10-chat-safety.sql). Test JPA creates them in isolated H2; PostgreSQL migration execution has not been verified. Existing Render production data/configuration is unchanged.

Deploy the matching backend and schema before exposing this frontend in a shared environment. When the new safety endpoint is unavailable, clients disable sending and offer retry. A frontend-only preview against the existing production backend cannot validate this feature.

## Validation

- Backend repository/service tests cover persistence, duplicates, both blocking directions, unblocking ownership, detached history, unrelated users and report access restrictions.
- Controller tests reject supplied IDs, empty/oversized messages and blocked sends.
- A real random-port Spring server test connects two authenticated raw WebSocket/STOMP clients, delivers a message, submits a report over HTTP, rejects unauthorized/malformed reports, blocks delivery and permits it after unblock.
- Web component tests cover reporting, confirmed block/unblock, disabled sending on load failures and conversation separation. Mobile component tests cover safety controls, the raw transport/token source, separation and stale history.
- Browser UI checks passed at 1440×1000 and 390×844 using fixture APIs/STOMP separately from the real transport integration test: confirmed block/unblock, report submission, fitting dialogs, no horizontal overflow and no application JavaScript errors. The trainer chat uses a compact, scrollable navigation bar on narrow screens. No real user account is modified.

On 2026-10-19, the focused checks passed: backend 29 tests, web 21 tests and mobile 7 tests (57 total); web production bundle and Android JavaScript export completed. Changed shared UI components have no ESLint errors; two pre-existing dependency warnings remain in the chat page hooks.

## Still required before calling moderation production-ready

- A restricted operator interface and authenticated operator role for reviewing pending reports, with decisions and audit history. Existing CLIENTE/ENTRENADOR roles must not receive moderation powers.
- Define the moderation policy, response ownership and contact/escalation path; communicate these to users.
- Add the new personal-data records to data export and retention/deletion policy.
- Validate PostgreSQL deployment, real web/mobile sessions, reconnection and attachment rendering on devices. Configure and test message rate limits and bounded/paginated history for sustained load.
- Blocks apply at server validation; an already accepted in-flight message may still arrive. Multi-instance concurrency and a strict block/send transaction ordering require additional validation.
