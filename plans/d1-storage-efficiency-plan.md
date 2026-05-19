# Akunlama D1 Storage Efficiency Plan
**Goal:** Reduce D1 scan pressure and storage growth without degrading inbox behavior, API compatibility, or email rendering quality.

**Priority Order**
1. Remove `LIKE` scans, keep targeted pre-insert blocks, and stop recurring spam cleanup scans.
2. Split `emails` and `email_bodies`.

---

## Executive Summary

The current worker stores summary metadata and full message bodies in the same `emails` table. That creates two problems:

1. Hot read paths query a table that is larger than it needs to be.
2. D1 is being used as both an index and a body store, so noisy traffic grows storage and raises query pressure at the same time.

This plan is intentionally phase-based and forward-only. It preserves the current API contract while changing the storage layout behind it.

The plan is split into two workstreams:

- **Workstream A:** Query-path hardening and ingress filtering
- **Workstream B:** Table split and body migration

No UI changes are required unless a backend response contract changes. This plan keeps existing response shapes intact.

---

## Current-State Anchors

These code paths are the starting point for the implementation:

- Inline body storage in [cloudflare-email/src/handlers/email.ts](../cloudflare-email/src/handlers/email.ts)
- `emails` table schema in [cloudflare-email/schema.sql](../cloudflare-email/schema.sql)
- Exact-match summary reads in [cloudflare-email/src/routes/events.ts](../cloudflare-email/src/routes/events.ts)
- Remaining recipient `LIKE` scans in [cloudflare-email/src/routes/stream.ts](../cloudflare-email/src/routes/stream.ts) and [cloudflare-email/src/routes/email-content.ts](../cloudflare-email/src/routes/email-content.ts)
- Recurring spam cleanup scans in [cloudflare-email/src/services/cleanup.ts](../cloudflare-email/src/services/cleanup.ts)
- Pre-insert filtering in [cloudflare-email/src/services/email-filter.ts](../cloudflare-email/src/services/email-filter.ts)
- Blocked recipient capture in [cloudflare-email/src/services/recipient-registry.ts](../cloudflare-email/src/services/recipient-registry.ts)

---

## Constraints

- Preserve current API behavior for:
  - `/api/events`
  - `/api/stream`
  - `/api/email/:id`
  - `/api/email/:id/read`
  - `/api/list`
  - `/api/getKey`
  - `/api/getHtml`
- Preserve current multi-domain support for:
  - `wrangler.akunlama.toml`
  - `wrangler.gratis-ongkir.toml`
- Preserve current recipient capture behavior for blocked messages.
- Keep message rendering quality unchanged. Do not strip or downgrade HTML as part of this plan.
- Treat the migration as forward-only. Do not rely on destructive schema rewrites early in the rollout.

---

## Non-Goals

- Moving message bodies to R2
- Changing retention duration
- Rewriting the frontend inbox UI
- Removing legacy endpoints in this effort

---

## Phase 0: Baseline and Guardrails

### Purpose
Create the minimum observability, invariants, and tests needed to make the later storage changes safe.

### Why This Phase Exists
The later phases change both query behavior and data layout. Without a baseline, later AI execution is more likely to break lookups or silently lose body access.

### Deliverables

#### 0.1 Create a small scripts workspace for operational checks
Create a new directory:

```text
cloudflare-email/scripts/
```

Expected scripts:

- `audit-recipient-format.ts` or `.js`
- `audit-email-body-migration.ts` or `.js`
- `audit-d1-storage-shape.ts` or `.js`

These scripts should accept a `--config` argument so they can target `wrangler.akunlama.toml` and `wrangler.gratis-ongkir.toml`.

#### 0.2 Define storage invariants in code comments or docstrings
The implementation must enforce these invariants:

- Stored `recipient` is the canonical lowercase full email address.
- Summary endpoints read only from the hot metadata table after cutover.
- Email detail endpoints must still return the full body for old and new rows during migration.
- Blocked messages must still call `captureRecipient(...)` even when not stored.

#### 0.3 Add or extend tests before logic changes
Minimum test coverage to add or update:

- `email-filter` tests for targeted compound rules
- `cleanup` tests for retention-only cleanup
- route tests for:
  - `/api/events`
  - `/api/stream`
  - `/api/email/:id`
  - `/api/email/:id/read`
  - `/api/getHtml`

#### 0.4 Record baseline operational checks
The audit scripts should report at minimum:

- rows with `recipient` missing `@`
- rows with uppercase `recipient`
- rows where a body row is missing after the split phase begins
- count of candidate blocked messages by sender + subject

### Exit Criteria

- Audit scripts exist and run against a selected Wrangler config.
- Tests exist for the paths that will change.
- Recipient and body storage invariants are explicit.

---

## Phase 1: Canonical Recipient Migration and `LIKE` Removal

### Purpose
Remove recipient-based scan queries from hot read paths and force those reads onto indexed equality lookups.

### Problem Being Solved
Current recipient lookups are mixed:

- some routes already use direct equality
- `stream.ts` still uses `recipient LIKE '%username@%'`
- `email-content.ts` `markRead` still uses `LIKE`

This prevents the codebase from consistently benefiting from `idx_emails_recipient_time`.

### Scope

- `cloudflare-email/src/routes/events.ts`
- `cloudflare-email/src/routes/stream.ts`
- `cloudflare-email/src/routes/email-content.ts`
- `cloudflare-email/src/routes/legacy.ts`
- `cloudflare-email/src/utils/validation.ts` or a new recipient utility module
- new operational script(s) in `cloudflare-email/scripts/`

### Implementation Steps

#### 1.1 Introduce a single recipient normalization helper
Create one reusable helper that:

- trims the input
- extracts the username
- appends `EMAIL_DOMAIN` when input is username-only
- lowercases the final stored lookup value

Suggested output shape:

```ts
{
  username: string,
  canonicalRecipient: string
}
```

After this helper exists, routes should query with exactly one canonical recipient value.

#### 1.2 Add a one-time recipient normalization script
Create a script that:

- lowercases all stored recipients
- appends the configured domain for rows that do not contain `@`
- prints before/after counts

This script must run per deployment config because the domain differs by worker.

The intended normalization rule is:

- if `recipient` contains `@`: store `lower(recipient)`
- if `recipient` does not contain `@`: store `lower(recipient + '@' + EMAIL_DOMAIN)`

#### 1.3 Remove recipient `LIKE` usage from all request paths
After the normalization script is available, update these routes:

- `events.ts`: simplify lookup to one canonical equality match
- `legacy.ts` list path: simplify to one canonical equality match
- `stream.ts`: replace `recipient = ? OR recipient = ? OR recipient LIKE ?` with one exact lookup
- `email-content.ts`:
  - `handleGetEmail`: remove recipient fallback variants after normalization is confirmed
  - `handleMarkRead`: replace `LIKE` conditions with exact equality

#### 1.4 Validate query shape locally
Use local D1 plus `EXPLAIN QUERY PLAN` to confirm the updated queries no longer force a scan because of recipient `LIKE`.

### Deployment Order

1. Deploy the normalization script only.
2. Run the normalization script on `akunlama`.
3. Run the normalization script on `gratis-ongkir`.
4. Verify audit output shows no non-canonical recipients.
5. Deploy the route changes.

### Validation

- `rg -n "\bLIKE\b" cloudflare-email/src` should show no recipient `LIKE` usage in request handlers.
- `/api/events`, `/api/stream`, `/api/email/:id`, and `/api/email/:id/read` still work for username-only and full-email inputs.
- Query plan shows index-backed equality lookup on recipient paths.

### Rollback

If lookups fail after deploy:

1. redeploy the previous worker version
2. keep the normalization script result in place
3. inspect whether some rows still use unexpected recipient formats

Do not revert normalized recipient data unless there is a confirmed data corruption issue.

---

## Phase 2: Move Waste Prevention Fully to Ingress and Simplify Cleanup

### Purpose
Stop paying recurring cleanup cost for mail that should never have been stored.

### Problem Being Solved
Current cleanup still runs sender-pattern deletes with `LIKE`, even though the worker already has a pre-insert filter path. That means D1 is doing both:

- write cost for noisy mail
- repeated delete scans for noisy mail

The correct steady state is: noisy traffic is blocked before insert, and cleanup focuses on retention only.

### Scope

- `cloudflare-email/src/services/email-filter.ts`
- `cloudflare-email/src/handlers/email.ts`
- `cloudflare-email/src/services/cleanup.ts`
- `cloudflare-email/src/config.ts`
- unit tests for filter and cleanup behavior
- Wrangler config values for domain-specific keyword rules

### Implementation Steps

#### 2.1 Keep existing env-driven keyword filters
Do not remove:

- `BLOCKED_SENDER_KEYWORDS`
- `BLOCKED_SUBJECT_KEYWORDS`
- `BLOCKED_BODY_KEYWORDS`

These remain useful for rapid operator changes.

#### 2.2 Add explicit targeted block rules for noisy patterns
Extend the filter service so it can express compound rules such as:

- sender match
- exact or normalized subject match
- optional body token match
- human-readable block reason

This is required because substring-only env rules are too blunt for high-volume transactional senders.

Suggested implementation shape:

```ts
interface TargetedBlockRule {
  senderIncludes?: string[]
  subjectEquals?: string[]
  subjectIncludes?: string[]
  bodyIncludes?: string[]
  reason: string
}
```

Keep these rules in code, not only in env vars. They are part of the application's protection logic and should be testable.

#### 2.3 Preserve blocked-recipient capture
Do not change this behavior:

- blocked email still calls `captureRecipient(env, recipient, { blocked: true })`
- blocked email still returns before storage

#### 2.4 Remove recurring spam sender deletes from scheduled cleanup
Delete the sender-pattern loop from `cleanup.ts`.

After this phase, scheduled cleanup should only:

- compute retention cutoff
- select candidate email IDs by `received_at`
- delete those rows in batches

Do not keep recurring spam cleanup in the hourly job once ingress blocking is in place.

#### 2.5 Keep one-off purge ability separate from scheduled cleanup
If an operator later needs to purge historical spam already stored, that should be:

- a manual script, or
- a protected admin-only maintenance task

It should not remain in the recurring hourly cleanup path.

### Deployment Order

1. Deploy filter changes first.
2. Verify blocked mail is being rejected pre-insert.
3. Deploy cleanup simplification second.

### Validation

- targeted flood emails are blocked before insert
- legitimate emails from the same provider still pass
- scheduled cleanup no longer performs sender-pattern `LIKE` deletes
- cleanup runtime becomes more predictable

### Rollback

If a targeted filter over-blocks:

1. remove or narrow the offending rule
2. redeploy filter config/code
3. do not reintroduce recurring spam cleanup as the default response

---

## Phase 3: Introduce `email_bodies` Without Breaking Reads

### Purpose
Separate hot metadata from cold body data while keeping the current API contract stable.

### Problem Being Solved
The `emails` table currently stores:

- summary metadata used by list and stream routes
- large body columns used only by detail routes

This makes every growth event hit the same table, even though most reads do not need bodies.

### Scope

- new migration file(s)
- `cloudflare-email/schema.sql`
- `cloudflare-email/src/handlers/email.ts`
- `cloudflare-email/src/routes/email-content.ts`
- `cloudflare-email/src/routes/legacy.ts`
- tests for detail reads and new writes

### Data Model Target

#### `emails`
Hot metadata table:

- `id`
- `recipient`
- `sender`
- `subject`
- `preview`
- `received_at`
- `read_at`

#### `email_bodies`
Cold body table:

- `email_id` primary key
- `body_html`
- `body_text`

### Implementation Steps

#### 3.1 Add a migration for `email_bodies`
Create a migration file such as:

```text
cloudflare-email/migrations/0002_create_email_bodies.sql
```

Expected DDL:

```sql
CREATE TABLE IF NOT EXISTS email_bodies (
    email_id TEXT PRIMARY KEY,
    body_html TEXT,
    body_text TEXT
);
```

Do not drop body columns from `emails` in this phase.

#### 3.2 Keep `schema.sql` backward compatible during transition
During the transition period:

- keep the existing `emails` definition in `schema.sql`
- add `email_bodies` creation to `schema.sql`

Reason: fresh installs must support the transitional code while older databases are still migrating.

#### 3.3 Change the write path to store metadata and body separately
Update `handleEmail(...)` so that:

- `emails` gets only metadata fields plus preview
- `email_bodies` gets the actual body columns

The implementation should use a single logical write unit. Prefer batched D1 statements if supported by the current runtime and typings. If batching is not available, the code must fail safely and log partial-write risk clearly.

#### 3.4 Update detail reads to prefer `email_bodies`
Update:

- `handleGetEmail`
- `handleGetHtml`

Behavior:

1. read metadata from `emails`
2. read body from `email_bodies`
3. if no `email_bodies` row exists, fall back to legacy `emails.body_html/body_text`

This fallback is required until backfill is complete.

#### 3.5 Stop using `SELECT *` on email detail reads
Replace broad selects with explicit column lists. This matters more after the table split and reduces accidental coupling.

### Deployment Order

1. Apply the `email_bodies` migration to `akunlama`.
2. Apply the `email_bodies` migration to `gratis-ongkir`.
3. Deploy the worker code with:
   - split writes
   - read fallback to legacy body columns

### Validation

- new emails create one metadata row and one body row
- detail endpoints render new emails correctly
- detail endpoints still render old emails correctly
- list and stream routes remain unchanged from the frontend point of view

### Rollback

If detail reads fail for new emails:

1. redeploy the previous worker
2. keep the `email_bodies` table in place
3. inspect whether metadata write succeeded while body write failed

Do not drop the new table during rollback.

---

## Phase 4: Backfill Historical Bodies and Update Retention Cleanup

### Purpose
Move old inline body data into `email_bodies` and make retention cleanup delete both tables consistently.

### Problem Being Solved
After Phase 3, new mail is split, but historical rows still store bodies inline in `emails`. That means the hot table remains bloated until historical rows are migrated.

### Scope

- `cloudflare-email/scripts/backfill-email-bodies.ts` or `.js`
- `cloudflare-email/scripts/audit-email-body-migration.ts` or `.js`
- `cloudflare-email/src/services/cleanup.ts`
- operational runbook updates

### Implementation Steps

#### 4.1 Add a batch backfill script
Create a backfill script that:

- reads from `emails` in stable batches
- inserts missing rows into `email_bodies`
- only processes rows where legacy body columns still contain data

Do not use `OFFSET` pagination. Use a stable cursor such as:

- `received_at`
- plus `id` as a tie-breaker

#### 4.2 Null legacy body columns after each successful batch
After each batch is copied into `email_bodies`, set:

- `emails.body_html = NULL`
- `emails.body_text = NULL`

for the successfully migrated IDs.

Important note: do not expect the D1 file size to shrink immediately. Freed pages may be reused internally before any visible size reduction. The main win here is:

- smaller hot rows for future reads
- better reuse of existing space
- less growth pressure going forward

#### 4.3 Update cleanup to delete bodies first, then metadata
After the split is live, cleanup should:

1. select a batch of expired email IDs from `emails`
2. delete matching rows from `email_bodies`
3. delete matching rows from `emails`

This prevents future orphans without relying on schema-level cascades.

#### 4.4 Add audit queries for migration completeness
The audit script should report:

- emails with non-null legacy body fields
- emails with no matching `email_bodies` row
- orphan `email_bodies` rows with no parent `emails` row

### Deployment Order

1. Deploy cleanup changes after Phase 3 is stable.
2. Run backfill on `akunlama` in batches.
3. Verify audit results.
4. Run backfill on `gratis-ongkir`.
5. Verify audit results again.

### Validation

- new cleanup deletes both tables consistently
- historical rows continue to render while being migrated
- audit shows body coverage approaching 100 percent
- legacy inline body usage drops toward zero

### Rollback

If backfill logic is faulty:

1. stop the backfill script
2. keep read fallback enabled
3. fix the script and resume from the last safe cursor

Do not re-copy entire tables blindly.

---

## Phase 5: Final Cutover and Simplification

### Purpose
Finish the migration once old-body fallback is no longer needed.

### Problem Being Solved
After migration, transitional logic becomes technical debt if it stays in place indefinitely.

### Scope

- `cloudflare-email/src/routes/email-content.ts`
- `cloudflare-email/src/routes/legacy.ts`
- `cloudflare-email/schema.sql`
- migration docs and tests

### Implementation Steps

#### 5.1 Remove legacy body fallback from reads
Only do this after the audit confirms there are no missing body rows for active data.

Remove:

- fallback reads from `emails.body_html`
- fallback reads from `emails.body_text`

#### 5.2 Keep schema change conservative
Do not make physical table rebuild a blocker for cutover.

Recommended default:

- keep legacy columns present but unused until a separate maintenance window is approved

Reason:

- code simplicity can be achieved without an immediate table rebuild
- storage behavior improves as new rows stop using inline bodies and old rows are nulled

If a later maintenance window is approved, a full table rebuild can be planned separately.

#### 5.3 Update `schema.sql` for fresh installs
Once transitional fallback is removed from code:

- define `emails` as metadata-only
- define `email_bodies` as the body store

This should happen only after the transitional deployment shape is no longer needed.

### Validation

- no detail route reads from legacy body columns
- new installs use the final two-table layout
- tests cover the final storage shape with no fallback

### Rollback

If final cutover reveals missed historical gaps:

1. restore the previous read fallback code
2. rerun migration audit
3. backfill the missing rows

---

## Required Files and Artifacts

These are the expected implementation artifacts across the full plan:

```text
cloudflare-email/
  migrations/
    0002_create_email_bodies.sql
  scripts/
    audit-recipient-format.ts
    audit-d1-storage-shape.ts
    audit-email-body-migration.ts
    normalize-recipients.ts
    backfill-email-bodies.ts
  src/
    handlers/
      email.ts
    routes/
      events.ts
      stream.ts
      email-content.ts
      legacy.ts
    services/
      email-filter.ts
      cleanup.ts
    utils/
      validation.ts or new recipient utility
  schema.sql
```

Not every artifact must be created in the same commit, but the implementation should follow the phase order above.

---

## Validation Matrix

At the end of each major phase, validate these user-visible flows:

1. Create inbox and fetch `/api/events`
2. Open inbox SSE stream via `/api/stream`
3. Open email detail via `/api/email/:id`
4. Mark email as read via `/api/email/:id/read`
5. Open legacy HTML via `/api/getHtml`
6. Confirm blocked noisy mail is rejected before storage
7. Confirm expired mail cleanup removes associated body rows

Validation must be run against:

- local/dev
- `akunlama`
- `gratis-ongkir`

Rollout should hit `akunlama` first, then `gratis-ongkir` after validation.

---

## Success Criteria

The plan is complete only when all of these are true:

- no recipient `LIKE` scans remain in request-serving routes
- noisy message families are blocked pre-insert instead of deleted later by recurring cleanup
- scheduled cleanup is retention-focused, not spam-pattern focused
- new emails store metadata separately from bodies
- old emails have been backfilled into `email_bodies`
- detail endpoints still render full content correctly
- summary endpoints operate only on the hot metadata table

---

## Recommended Commit Strategy

Keep commits phase-scoped:

1. tests and audit scripts
2. recipient normalization and `LIKE` removal
3. filter hardening and cleanup simplification
4. `email_bodies` migration and split-write code
5. backfill tooling and cleanup updates
6. final cutover and schema cleanup

This makes rollback and verification much easier.
