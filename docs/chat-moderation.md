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

Two additional tables are required: `chat_blocks` and `chat_reports`. The additive PostgreSQL script is [sql/2026-10-chat-safety.sql](sql/2026-10-chat-safety.sql). JPA checks use isolated H2. The deployment scripts were also verified against PostgreSQL 16 with a legacy report, then executed in the authorized Render rollout described below.

Deploy the matching backend and schema before exposing this frontend in a shared environment. When the new safety endpoint is unavailable, clients disable sending and offer retry. A frontend-only preview against the existing production backend cannot validate this feature.

## Validation

- Backend repository/service tests cover persistence, duplicates, both blocking directions, unblocking ownership, detached history, unrelated users and report access restrictions.
- Controller tests reject supplied IDs, empty/oversized messages and blocked sends.
- A real random-port Spring server test connects two authenticated raw WebSocket/STOMP clients, delivers a message, submits a report over HTTP, rejects unauthorized/malformed reports, blocks delivery and permits it after unblock.
- Web component tests cover reporting, confirmed block/unblock, disabled sending on load failures and conversation separation. Mobile component tests cover safety controls, the raw transport/token source, separation and stale history.
- Browser UI checks passed at 1440×1000 and 390×844 using fixture APIs/STOMP separately from the real transport integration test: confirmed block/unblock, report submission, fitting dialogs, no horizontal overflow and no application JavaScript errors. The trainer chat uses a compact, scrollable navigation bar on narrow screens. No real user account is modified.

On 2026-10-19, the focused checks passed: backend 29 tests, web 21 tests and mobile 7 tests (57 total); web production bundle and Android JavaScript export completed. Changed shared UI components have no ESLint errors; two pre-existing dependency warnings remain in the chat page hooks.

## Moderation review panel

The web panel lives at `/moderacion`. An entry appears in account settings only after the server returns `allowed: true` from `/api/moderation/access`. Direct navigation is also checked; hiding a link is not an authorization boundary.

Moderation uses the separate, server-managed `moderation_operators` entitlement, keyed by account UUID and canonical account role. Merely being CLIENTE or ENTRENADOR never grants moderation access. There is no grant/revoke endpoint exposed to application users. Existing authentication remains unchanged, and each moderation request rechecks the grant. Disabling it takes effect with the existing JWT. The normal JWT filter also rejects inactive accounts.

Only independent reviewers can open/decide a report: an operator cannot review a report they submitted or a message about themselves. These reports are also excluded from that operator's queue. Another independently authorized reviewer is needed for those cases.

The queue is filtered by PENDING/CONFIRMED/DISMISSED, deterministically sorted and paginated (maximum 50 rows). It contains category/date/status, not message bodies or email addresses. A detail request exposes only the reported message. The image endpoint is bound to that report's message and does not expand access to arbitrary private uploads. Responses and images use `Cache-Control: no-store`.

The panel requires a written reason and explicit confirmation for each decision:

- `DISMISS`: close without a violation finding or a new restriction.
- `CONFIRM`: record a violation without imposing another restriction.
- `RESTRICT_CHAT`: confirm and stop chat sends/read receipts in both directions involving the reported account; account login and other features stay available.
- `LIFT_RESTRICTION`: reverse the active restriction originating from that same report. Personal blocks survive this action.

Each action stores an immutable application-level audit entry with operator UUID/role, report identifiers, action, reason and timestamp. The API has no audit edit/delete endpoint. Report resolution and restriction/audit writes share one transaction. A report version and row lock prevent concurrent reviewers from overwriting decisions; restrictions from different reports about the same account also serialize on the target account row. Resolved reports cannot be reopened by repeat user submissions. The panel displays conflicts and requires reloading rather than claiming success.

### Deploy and activate

Apply the schema in order, through the intended environment's migration procedure:

1. [2026-10-chat-safety.sql](sql/2026-10-chat-safety.sql).
2. [2026-10-moderation-panel.sql](sql/2026-10-moderation-panel.sql): report versions/review timestamps, operator grants, restrictions and audit records.
3. Deploy the matching backend and web code.
4. [2026-10-authorize-moderator.sql](sql/2026-10-authorize-moderator.sql): set the explicitly chosen email inside the transaction. The script aborts unless exactly one active account matches, derives the correct UUID/role, and changes no other grants or passwords.

The owner designated their account in chat. The authorized Render rollout used the deployment-only bootstrap to grant that account; its readiness check verified the persisted grant. The committed manual template contains no personal email address and remains a fallback. Fixture tests used no real accounts, and the deployment did not restrict any production account.

### Panel validation

- Service/JPA checks cover absent/wrong-role/revoked grants, self-review restrictions, bounded queues, required decision notes, stale versions, immutable decisions, restriction/reversal semantics, personal block preservation, report-scoped attachment selection and resolved-report deduplication.
- A real HTTP server test checks authentication, role entitlement, pagination/input errors, forged actor fields, concurrent reviewers (one success, one 409), audited restriction and reversal, and revocation with an existing token.
- A real image HTTP test verifies exact private image bytes, MIME/no-store headers, denial for a normal user, denial through the general upload route for a nonparticipant operator, and a 404 for an unrelated report ID.
- Browser checks passed at 1440×1000 and 390×844 with fixture APIs: review, confirmation before writes, restriction/reversal with current versions, audit rendering, fitting dialogs, no overflow or JavaScript errors. A normal account never requests report data.
- Component tests cover server-only navigation gating, escaped message content, missing notes, cancellation, conflicts, revoked permissions, stale selections and the reversal action/version. The touched profile tests were updated for the existing separate password-change route and partial icon mocks.

## Still required before calling moderation production-ready

- Complete a signed-in browser check with the designated account after deployment. The bootstrap health gate verifies the persisted grant without requesting the account password.
- Define the moderation policy, response ownership and contact/escalation path; communicate these to users.
- Add the new personal-data records to data export and retention/deletion policy.
- Validate real web/mobile sessions, reconnection and attachment rendering on devices. Configure and test message rate limits and bounded/paginated chat history for sustained load.
- Blocks apply at server validation; an already accepted in-flight message may still arrive. Multi-instance concurrency and a strict block/send transaction ordering require additional validation.

Panel validation on 2026-10-19: 42 focused backend checks and 40 web checks passed (82 total). The web build and ESLint for the new panel/entry components passed. Device testing is a separate outstanding check; PostgreSQL deployment verification is recorded below.

## Automated deployment bootstrap

For the initial Render rollout, the backend bundles the two additive PostgreSQL schema scripts. `APP_MODERATION_SCHEMA_INIT_MODE=always` explicitly enables Spring SQL initialization before Hibernate. `APP_MODERATION_BOOTSTRAP_ENABLED=true` plus `APP_MODERATION_BOOTSTRAP_EMAIL` activates a deployment-only runner. It finds exactly one active account across both identity tables (normalized email), grants only that UUID/role and logs a completion marker without passwords/tokens. No HTTP grant endpoint exists. Missing/ambiguous targets fail startup without granting another account.

While the runner is enabled, the aggregate `/actuator/health` also requires the persisted grant; it exposes no identity details. The existing Render health check points at this endpoint. After the initial healthy rollout, set schema initialization back to `never`, disable the runner and clear its email, then deploy again. This prevents later restarts from restoring a deliberately revoked grant.

The complete sequence was tested on PostgreSQL 16: migrate a legacy report without version columns, preserve its category/status, grant only the fixture operator, deny a normal account, reapply migrations idempotently, then restart with both bootstrap switches disabled and confirm the persisted permission via the authenticated API. Four focused bootstrap tests also cover designation, idempotence, ambiguity, missing accounts and the disabled default. All fixture data remained outside production.

## Authorized production rollout — 2026-10-19

Backend source commit: `ab11b4299d67442f550134f6a959d48bce5270e8`. The initial Render deployment `dep-dbaucs3rjlhs73anrbgg` became live with the bootstrap health gate enabled, verifying both schema initialization and the persisted operator grant. Public API checks passed for health, required authentication on the moderation/chat endpoints, exact-origin production CORS and rejection of invalid Google credentials.

All three temporary bootstrap environment variables were then removed. A normal-config deployment of the same backend source was requested as `dep-dbaufee1egvs73c6hd7g`; its outcome is tracked through Render. The web is published through the existing Vercel production project from `main`, after the matching backend became live. No Render service other than NextFit is part of this rollout.

Production entry: `https://next-fit-q7uo.vercel.app/moderacion`. The user signs in using their existing NextFit account; no new password or separate moderator login is created.
