# Supabase Sync Plan

Milestone 4A is planning-only. This document describes how Household Finance can
move from a fully local IndexedDB app to a safe cloud-backed app with Supabase
while preserving the existing local MVP.

No runtime code, package installation, schema change, or business behavior is
introduced by this plan.

## 1. Current Architecture Summary

The app currently uses React, TypeScript, Vite, React Router, shared UI
components, and local IndexedDB persistence through the `idb` package.

Current layers:

```text
UI pages and components
  -> providers and page-level data loading
  -> repositories
  -> IndexedDB
```

Key current architecture notes:

- UI components render app state and call repository functions for mutations.
- Repositories are the boundary between UI and persistence.
- IndexedDB stores are defined in `src/data/db/finance-db.ts`.
- App models live in `src/data/models`.
- Domain helpers such as transaction datetime and loan calculations live in
  `src/data/domain`.
- Dashboard, planner, and reports calculations live in selector/query modules,
  not directly in the UI.
- Backup/restore exports and imports all local stores as JSON.
- Regression tests use Vitest and fake-indexeddb, so they do not mutate browser
  IndexedDB data.
- Current stores are `accounts`, `categories`, `transactions`, `bills`,
  `goals`, `loans`, `budgets`, and `metadata`.

The repository layer should remain the stable application boundary. Cloud work
should add data-source implementations behind that boundary instead of allowing
UI components to call Supabase directly.

## 2. Target Cloud Architecture

Recommended target shape:

```text
UI
  -> hooks / queries
  -> repositories
  -> data source layer
  -> IndexedDB now
  -> Supabase later
```

Three possible approaches:

| Option | Description | Pros | Cons |
| --- | --- | --- | --- |
| Cloud-first repositories | Authenticated sessions read/write Supabase directly. IndexedDB becomes backup/offline/test support. | Simpler conflict model, easier privacy model, less sync code. | Requires login for cloud data and needs migration/import flow. |
| Local-first with sync | IndexedDB remains source of truth and syncs to Supabase in the background. | Strong offline support. | Hard conflict handling, risky account balance reconciliation, more test surface. |
| Phased hybrid | Keep local MVP safe, add Supabase behind repository/data-source interfaces, migrate local data after login, then run cloud sessions online-first. | Safest migration path, minimal UI churn, can postpone offline conflicts. | More transition plumbing than a full switch. |

Recommendation: use a phased hybrid migration.

Proposed future path:

1. Keep existing IndexedDB repositories working.
2. Introduce repository contracts and data-source implementations.
3. Add Supabase auth and cloud schema without changing local data.
4. Add a user-controlled local-to-cloud migration tool.
5. Switch authenticated cloud sessions to Supabase-backed repositories after
   migration.
6. Keep local JSON backup/restore available as a safety tool.
7. Add offline/local-first sync later only if it becomes a real requirement.

For the first cloud version, prefer online-only cloud writes after login. This
keeps linked transactions and account balance updates much safer than
bidirectional background sync.

## 3. Supabase Data Model Plan

Use UUID primary keys. Finance records should keep app-level IDs where possible
so local backup imports and migration mapping stay simple.

All finance tables should include:

- `id uuid primary key`
- `household_id uuid not null references households(id)`
- `created_by uuid references auth.users(id)`
- `updated_by uuid references auth.users(id)`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `archived_at timestamptz null` where the current local model supports archive
- `deleted_at timestamptz null` for soft delete

Use `numeric` for money values. The UI currently uses PKR and 1 PKR input steps,
but cloud storage should not rely on floating point.

### `profiles`

Purpose: app profile for each Supabase auth user.

Important fields:

- `id uuid primary key references auth.users(id)`
- `display_name text`
- `email text`
- `default_household_id uuid null references households(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Relationship notes:

- One profile per auth user.
- Do not store passwords or auth secrets here.

### `households`

Purpose: finance workspace boundary.

Important fields:

- `id uuid primary key`
- `name text not null`
- `currency text not null default 'PKR'`
- `locale text not null default 'en-PK'`
- `created_by uuid not null references auth.users(id)`
- `created_at timestamptz`
- `updated_at timestamptz`
- `archived_at timestamptz null`
- `deleted_at timestamptz null`

Relationship notes:

- Every finance record belongs to exactly one household.
- Single-user mode still uses a household so spouse/shared support can be added
  without reshaping every table.

### `household_members`

Purpose: membership and roles for a household.

Important fields:

- `id uuid primary key`
- `household_id uuid not null references households(id)`
- `user_id uuid not null references auth.users(id)`
- `role text not null` (`owner`, `member`, `viewer`)
- `invited_by uuid references auth.users(id)`
- `joined_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`
- `removed_at timestamptz null`

Relationship notes:

- Unique active membership for `(household_id, user_id)`.
- Owners manage membership.
- Members can create/edit finance data in the initial shared model.
- Viewers are optional and read-only.

### `accounts`

Purpose: active money containers and current balances.

Important fields:

- `id uuid primary key`
- `household_id uuid not null`
- `name text not null`
- `type text not null`
- `icon text not null`
- `color text not null`
- `currency text not null default 'PKR'`
- `opening_balance numeric not null`
- `current_balance numeric not null`
- `notes text null`
- ownership and timestamp fields

Relationship notes:

- Transactions reference accounts through `from_account_id` and
  `to_account_id`.
- Balance updates must happen transactionally with transaction creation,
  update, reversal, and delete.

### `categories`

Purpose: reusable transaction, bill, planner, and reporting categories.

Important fields:

- `id uuid primary key`
- `household_id uuid not null`
- `name text not null`
- `type text not null` (`income`, `expense`, `adjustment`)
- `icon text not null`
- `color text not null`
- `is_default boolean not null default false`
- `default_key text null`
- ownership and timestamp fields

Relationship notes:

- Categories remain household-scoped for customization.
- Seed defaults should be inserted once per household.
- Unique active category names should be enforced per
  `(household_id, type, lower(name))` where `deleted_at is null`.

### `transactions`

Purpose: ledger of income, expenses, transfers, adjustments, and linked module
movements.

Important fields:

- `id uuid primary key`
- `household_id uuid not null`
- `type text not null` (`income`, `expense`, `transfer`, `adjustment`)
- `amount numeric not null`
- `category_id uuid null references categories(id)`
- `from_account_id uuid null references accounts(id)`
- `to_account_id uuid null references accounts(id)`
- `payment_method text null`
- `date date not null`
- `time time null`
- `transaction_datetime timestamptz null`
- `notes text null`
- `tags text[] null`
- `receipt_name text null`
- `receipt_path text null`
- `receipt_thumbnail text null`
- `linked_bill_id uuid null references bills(id)`
- `linked_goal_id uuid null references goals(id)`
- `linked_loan_id uuid null references loans(id)`
- ownership and timestamp fields

Relationship notes:

- Linked bill, goal, and loan transactions stay read-only in the Transactions
  UI and are managed by their source module.
- Sorting should use `transaction_datetime`, then `created_at`, then `date`.
- Cloud writes that affect balances should use RPC functions or transactions.

### `bills`

Purpose: bill planning and paid/unpaid status.

Important fields:

- `id uuid primary key`
- `household_id uuid not null`
- `name text not null`
- `amount numeric not null`
- `category_id uuid not null references categories(id)`
- `due_date date not null`
- `status text not null`
- `frequency text not null`
- `next_due_date date null`
- `last_generated_date date null`
- `payment_account_id uuid null references accounts(id)`
- `linked_transaction_id uuid null references transactions(id)`
- `notes text null`
- ownership and timestamp fields

Relationship notes:

- Mark paid should create a linked expense transaction and update the account
  balance in one atomic operation.
- Mark unpaid or delete paid bill should reverse the linked transaction safely.

### `goals`

Purpose: savings goals and target progress.

Important fields:

- `id uuid primary key`
- `household_id uuid not null`
- `name text not null`
- `target_amount numeric not null`
- `current_amount numeric not null`
- `target_date date null`
- `priority text not null`
- `status text not null`
- `icon text null`
- `color text null`
- `notes text null`
- ownership and timestamp fields

Relationship notes:

- Current local behavior stores goal progress on the goal and creates linked
  transfer transactions for contributions/withdrawals.
- Cloud should keep that behavior initially and update goal/account/transaction
  records atomically.

### `goal_movements` optional later

Purpose: explicit movement ledger if goal history needs more structure than
linked transactions.

Initial recommendation: do not require this table for the first cloud migration.
The current app already represents goal contributions and withdrawals as linked
transfer transactions.

Potential fields if added later:

- `id uuid primary key`
- `household_id uuid not null`
- `goal_id uuid not null references goals(id)`
- `transaction_id uuid not null references transactions(id)`
- `movement_type text not null` (`contribution`, `withdrawal`)
- `amount numeric not null`
- `account_id uuid not null references accounts(id)`
- `date date not null`
- ownership and timestamp fields

### `loans`

Purpose: loans given and taken, including outstanding balances.

Important fields:

- `id uuid primary key`
- `household_id uuid not null`
- `name text not null`
- `type text not null` (`given`, `taken`)
- `counterparty text null`
- `principal_amount numeric not null`
- `outstanding_amount numeric not null`
- `interest_rate numeric null`
- `due_date date null`
- `status text not null`
- `source_account_id uuid null references accounts(id)`
- `receiving_account_id uuid null references accounts(id)`
- `linked_transaction_id uuid null references transactions(id)`
- `notes text null`
- ownership and timestamp fields

Relationship notes:

- Opening loan movements and repayments should remain linked transfer
  transactions.
- Financial detail edits should stay guarded when linked movements exist.

### `loan_movements` optional later

Purpose: explicit movement ledger for loan opening, repayment made, repayment
received, and reversals if linked transactions are not enough.

Initial recommendation: do not require this table for the first cloud migration.
The current app derives loan activity from linked loan transactions.

Potential fields if added later:

- `id uuid primary key`
- `household_id uuid not null`
- `loan_id uuid not null references loans(id)`
- `transaction_id uuid not null references transactions(id)`
- `movement_type text not null`
- `amount numeric not null`
- `account_id uuid not null references accounts(id)`
- `date date not null`
- ownership and timestamp fields

### `budgets`

Purpose: monthly planner allocations by category.

Important fields:

- `id uuid primary key`
- `household_id uuid not null`
- `month text not null`
- `category_id uuid not null references categories(id)`
- `planned_amount numeric not null`
- `group text null`
- `notes text null`
- ownership and timestamp fields

Relationship notes:

- Enforce one active allocation per `(household_id, month, category_id)`.
- Reports and Overview should reuse planner selectors/services.

### `audit_history` optional

Purpose: human-readable significant events and future restore/sync diagnostics.

Important fields:

- `id uuid primary key`
- `household_id uuid not null`
- `entity_type text not null`
- `entity_id uuid null`
- `action text not null`
- `summary text not null`
- `metadata jsonb null`
- `created_by uuid references auth.users(id)`
- `created_at timestamptz not null`

Relationship notes:

- The current Audit History page is a placeholder.
- Add this only when audit tracking is intentionally implemented.

### `backup_exports` optional or skip

Purpose: metadata about cloud backup/export events.

Initial recommendation: skip storing backup file bodies in Supabase. Generate
downloadable JSON on demand from cloud data.

Optional fields if export metadata is useful:

- `id uuid primary key`
- `household_id uuid not null`
- `exported_by uuid not null references auth.users(id)`
- `source text not null` (`local`, `cloud`)
- `backup_version integer not null`
- `database_version integer null`
- `record_counts jsonb not null`
- `created_at timestamptz not null`

## 4. Household / Shared Access Model

Use households as the permanent security and data boundary.

Initial mode:

- A signup creates one user profile and one household.
- The first user becomes the household `owner`.
- All finance records created by that user are scoped to the household.

Later shared household mode:

- Owner can invite spouse/family members.
- Member can read and write household finance data.
- Viewer, if enabled, can read only.
- Household switching can be driven by `profiles.default_household_id` and a
  small household switcher.
- Every finance query must filter by the selected `household_id`.

Role model:

| Role | Can read | Can create/edit finance data | Can manage members | Can delete household |
| --- | --- | --- | --- | --- |
| owner | Yes | Yes | Yes | Yes |
| member | Yes | Yes | No | No |
| viewer | Yes | No | No | No |

If stricter controls are needed later, add per-module permissions. Do not start
there.

## 5. Authentication Plan

Use Supabase Auth in a later milestone.

Initial auth features:

- Email/password signup and login.
- Session persistence through the Supabase client.
- Sign out.
- Protected app routes for cloud mode.
- First-user onboarding creates a profile and first household.
- After signup, seed default categories for the household.

Later auth features:

- Magic link login.
- Password reset and email verification polish.
- Invite acceptance flow for household members.

Auth routing plan:

- Unauthenticated users can use local mode until cloud migration is enabled, or
  see login/signup if the app is explicitly in cloud mode.
- Authenticated users select or create a household.
- Repositories receive the active household context.

## 6. Row-Level Security / Privacy Plan

RLS should be enabled on every app-owned Supabase table.

Strategy:

- Finance tables are scoped by `household_id`.
- A user can access a finance record only if they have an active membership for
  that record's household.
- Owners can invite and remove members.
- Members can read/write finance data.
- Viewers can read only.
- Soft-deleted records are hidden by default in app queries.
- Service-role operations, if ever used, must stay server-side and never ship to
  the browser.

Draft policy ideas, not final SQL:

- `select` on finance tables: allowed when `exists active household_members row
  for auth.uid() and table.household_id`.
- `insert` on finance tables: allowed for owner/member of `household_id`; set
  `created_by` to `auth.uid()`.
- `update` on finance tables: allowed for owner/member; preserve
  `household_id`; set `updated_by` to `auth.uid()`.
- `delete`: avoid hard delete from the client. Prefer updates that set
  `deleted_at`.
- `household_members` select: members can see members of their household.
- `household_members` insert/update/remove: owner only.

All RLS work should be tested with real anon/authenticated clients, not only
with privileged SQL.

## 7. Sync / Migration Strategy

### Option A - Full cloud switch

- Login required for cloud data.
- Repositories read/write Supabase.
- IndexedDB remains for local mode, tests, backup, or future offline support.

Pros: simpler and safer for first cloud version.

Cons: existing local users need a clear migration/import path.

### Option B - Local-first with cloud sync

- IndexedDB remains local source of truth.
- Supabase syncs in the background.
- App can support offline writes.

Pros: best offline experience.

Cons: high complexity for conflicts, linked transactions, account balances, and
restore behavior.

### Option C - Phased hybrid

- Keep IndexedDB local mode intact.
- Add Supabase data source layer.
- Add explicit local-to-cloud migration after login.
- Switch cloud sessions to cloud data after migration.
- Keep local backup/export for safety.
- Add offline sync later only if needed.

Recommendation: Option C.

Suggested migration flow:

1. User exports a local backup as a safety step.
2. User signs up or signs in.
3. App creates/selects a household.
4. User chooses "Upload local data to cloud".
5. App validates local data using the same backup validation rules.
6. App maps local IDs to cloud UUIDs, preserving IDs where safe.
7. App uploads records in dependency order:
   profiles/household, categories, accounts, goals, loans, bills, budgets,
   transactions, metadata.
8. App verifies counts and key relationship links.
9. App switches the active session to cloud data.
10. Local backup remains available.

Do not silently merge local and cloud data in the first version.

## 8. Conflict Handling Plan

Conflicts that can happen later:

- Same record edited on two devices.
- Offline edits made on one device while another device changes the same data.
- Deleted record edited elsewhere.
- Account balance mismatch after concurrent transaction changes.
- Linked bill/goal/loan reversal conflicts.
- Restore operation overwriting newer cloud data.

Initial strategy:

- Avoid offline cloud writes in the first version.
- Use online-only writes for authenticated cloud sessions.
- Use server timestamps.
- Use last-write-wins only for simple descriptive fields where safe.
- Use transactional RPC functions for financial mutations.
- Block or require refresh when a record changed since it was loaded for
  balance-sensitive operations.
- Add explicit conflict handling only after the cloud baseline is stable.

Do not implement background bidirectional sync until linked finance flows are
covered by tests and server-side transaction safety.

## 9. Account Balance Strategy in Cloud

Account balance correctness is the highest-risk part of cloud migration.

Current behavior:

- `accounts.currentBalance` is stored.
- Transactions apply and reverse balance impact.
- Bills create linked expense transactions.
- Goals create linked contribution/withdrawal transfer movements.
- Loans create linked loan movements and repayments.
- Linked transactions are managed by their source modules.

Initial cloud recommendation:

- Keep `current_balance` stored on accounts for fast UI reads.
- Preserve the current repository semantics.
- Move multi-record financial mutations into Supabase RPC functions or server
  transactions before allowing real cloud writes.

Critical operations that should be atomic:

- Create/update/delete transaction plus account balance impact/reversal.
- Mark bill paid plus linked transaction plus account balance update.
- Mark bill unpaid/delete paid bill plus linked transaction reversal.
- Goal contribution/withdrawal plus linked transaction plus account and goal
  update.
- Loan creation with opening movement plus account and loan update.
- Loan repayment plus linked transaction plus account and outstanding amount
  update.

Later hardening:

- Add a balance verification function that recalculates balances from opening
  balances and active transactions.
- Add tests comparing stored balances with recalculated balances.
- Add audit rows for balance-sensitive operations.

## 10. Repository Migration Plan

General approach:

- Define repository contracts where needed.
- Keep UI calls stable.
- Implement IndexedDB and Supabase data-source versions behind repositories.
- Pass active household/session context into cloud-backed repositories.
- Keep selectors pure and data-source agnostic.

### Accounts repository

- Keep create/update/archive/delete behavior.
- Cloud implementation must scope all queries by `household_id`.
- Financial balance writes should be restricted to transaction/RPC flows where
  possible.

### Categories repository

- Seed default categories per household.
- Preserve duplicate-name validation per type.
- Keep default category protection.
- UI should not care whether categories came from IndexedDB or Supabase.

### Transactions repository

- Highest priority for RPC/transaction safety.
- Keep linked transactions read-only from Transactions UI.
- Preserve date/time sorting behavior.
- Cloud update/delete must reverse previous balance impact safely.

### Bills repository

- Keep bill CRUD and mark paid/unpaid semantics.
- Move mark paid/unpaid to atomic cloud operations.
- Preserve linked transaction relationship.

### Goals repository

- Keep goal CRUD and movement flows.
- Move contribution/withdrawal to atomic cloud operations.
- Keep `current_amount` controlled by movements.

### Loans repository

- Keep loan CRUD and repayment flows.
- Move opening loan and repayment flows to atomic cloud operations.
- Preserve restrictions around editing financial details with linked movements.

### Budgets repository

- Keep one active budget per month/category.
- Scope by household.
- Reuse planner selectors and queries for local and cloud data.

### Dashboard and reports queries

- Keep selector functions reusable and pure.
- Data queries should load household-scoped records from whichever repository
  implementation is active.
- Reports should not call Supabase directly from UI components.

### Backup/restore

- Preserve local backup/restore.
- Add cloud export later through a cloud data-source export function.
- Cloud restore should require stronger confirmation than local restore.

## 11. Backup / Restore Future Plan

After cloud support, backup/restore should remain a safety feature.

Export:

- Export local data when in local mode.
- Export cloud household data when in cloud mode.
- Include backup metadata:
  - `source`: `local` or `cloud`
  - app version
  - backup version
  - exported at
  - currency and locale
  - household ID or anonymized household info
  - record counts

Restore:

- Local restore can continue full replacement of IndexedDB with confirmation.
- Cloud restore should not silently overwrite active cloud data.
- First cloud restore version should support restore into a new empty household
  or require an explicit destructive confirmation.
- Avoid merge restore until conflict handling is designed.
- Validate backup structure before any write.
- Preserve local JSON export before cloud restore attempts.

## 12. Testing Plan

Keep existing tests and add cloud-oriented tests gradually.

Recommended test layers:

- Existing fake-indexeddb repository/domain tests remain.
- Add repository contract tests that can run against IndexedDB and Supabase-like
  implementations.
- Add migration mapping tests from local backup shape to cloud payloads.
- Add financial reversal tests for each cloud RPC operation.
- Add account balance recalculation tests.
- Add RLS tests later using authenticated Supabase test users where possible.
- Add backup import/export compatibility tests for cloud exports.

Do not remove fake-indexeddb tests. They remain useful for local mode and
regression coverage.

## 13. Risk List

| Risk | Mitigation |
| --- | --- |
| Local data corruption during migration | Require local backup export first; migrate only after validation; do not mutate IndexedDB during upload. |
| Account balance mismatch | Use atomic RPC/transactions for financial writes; add recalculation verification. |
| Duplicate IDs during migration | Preserve UUIDs where safe; otherwise maintain an ID mapping table during upload and verify links. |
| Linked transactions mapped incorrectly | Upload source records and transactions in a planned order; test bill/goal/loan links explicitly. |
| RLS mistakes expose data | Enable RLS on every table; test with anon/auth clients; scope all finance rows by household membership. |
| Restore overwrites cloud data | Require explicit destructive confirmation; prefer restore into a new household first. |
| Offline conflict complexity | Avoid offline writes in first cloud version; postpone local-first sync. |
| Deleted record edited elsewhere | Use `updated_at` checks for sensitive operations; refresh before mutation when stale. |
| Timezone/date issues | Store date-only fields as dates, timestamps as timestamptz, and keep transaction datetime sorting tests. |
| Bundle/env security mistakes | Only expose public anon key; never ship service role key; keep env setup documented. |
| Default category duplication | Seed defaults once per household using `default_key` and unique constraints. |
| Reports diverge from dashboard | Keep shared selectors/services and add cross-module tests. |

## 14. Recommended Milestone 4 Roadmap

Suggested sequence:

1. 4B - Supabase project setup and environment config.
2. 4C - Auth UI and session handling.
3. 4D - Cloud database schema draft and SQL migrations.
4. 4E - Repository data-source abstraction and contracts.
5. 4F - Local-to-cloud migration tool.
6. 4G - Cloud-backed Accounts and Categories.
7. 4H - Cloud-backed Transactions with balance safety.
8. 4I - Cloud-backed Bills, Goals, and Loans.
9. 4J - Cloud-backed Planner, Reports, and Overview.
10. 4K - Household sharing and invitations.
11. 4L - Cloud backup/export/restore hardening.
12. 4M - Optional offline/local-first sync research, only if needed.

Recommended next milestone after the 4D schema draft: 4E should introduce
repository data-source abstraction and contracts without switching finance data
to cloud yet.

## Milestone 4D Note

Draft Supabase schema and RLS migration files now live in `supabase/migrations`.
They are planning/infrastructure artifacts only; the runtime app still uses
IndexedDB repositories for all finance data.

## Milestone 4E Note

Repository contracts and an IndexedDB finance data-source registry now exist in
`src/data/contracts` and `src/data/data-source`. Existing IndexedDB repositories
are typed against those contracts, `indexedDbFinanceDataSource` remains the only
active data source, and no Supabase finance queries or sync behavior have been
added yet.

## Milestone 4F Note

Central dashboard, reports, and planner query layers now read through
`activeFinanceDataSource`. Backup/restore remains IndexedDB-specific for
full-store fidelity, and page-level mutations may still import concrete
IndexedDB repositories until cloud repository implementations exist. No runtime
cloud finance behavior has been added.

## Milestone 4G Note

An inactive Supabase finance data-source skeleton now exists under
`src/data/supabase`. Temporary snake_case row types, domain mappers, and
contract-shaped repository stubs are in place. The stubs throw a clear inactive
error if called, `activeFinanceDataSource` still points to IndexedDB, and no
cloud finance reads, writes, sync, or migration behavior has been added.

## Milestone 4H Note

Supabase CLI setup documentation and a non-secret `supabase/config.toml`
placeholder now exist. The schema/RLS migrations were reviewed for obvious
Supabase/PostgreSQL compatibility issues, but they were not applied to a real
project from this repo. Generated database types still use the placeholder until
the Supabase CLI is installed, a project is linked, and migrations are pushed.

## Milestone 4I Note

Supabase CLI setup was completed, migrations were applied to the linked
project, and generated database types now live in
`src/lib/supabase/database.types.ts`. This remains schema verification only:
the app still runs on IndexedDB and no cloud finance repositories are active by
default.

## Milestone 4J Note

Supabase-backed Accounts and Categories repository factories now exist behind
explicit `{ client, householdId, userId }` context. The default
`supabaseFinanceDataSource` remains inactive, `activeFinanceDataSource` still
points to IndexedDB, and no automatic runtime switching has been added.
Transactions, Bills, Goals, Loans, Budgets, backup/restore, and sync remain
local or stubbed until later milestones.

## Milestone 4K Note

Supabase-backed Transactions repository support now exists behind the explicit
`createSupabaseFinanceDataSource(...)` factory. The active app source remains
IndexedDB, and the default `supabaseFinanceDataSource` still uses inactive
stubs. Transaction mutations are balance-sensitive: the current Supabase
repository performs careful client-side row and account balance updates, but
those multi-table changes are not truly atomic. Before enabling cloud
transactions in runtime app flows, a future milestone should move transaction
create/update/archive/delete balance operations into Postgres RPC functions or
another server-side transaction-safe path.

## Milestone 4L Note

Balance-safe Supabase transaction RPC functions are defined in
`supabase/migrations/0003_transaction_rpc_functions.sql` for create, update,
archive, and soft delete. They use fixed-search-path `security definer`
functions with explicit `can_write_household(...)` checks, validate account and
category ownership within the target household, reject direct mutation of linked
transactions unless an internal/source-managed flag is supplied, and apply
account balance impacts inside the same database transaction. The Supabase
Transactions repository now calls these RPCs for mutations, while
`activeFinanceDataSource` still points to IndexedDB and cloud transactions are
not activated in runtime app flows.

## Milestone 4M Note

Cloud RPC design for Bills, Goals, and Loans is documented in
`supabase/RPC_DESIGN.md`. The design captures current IndexedDB workflows,
linked transaction lifecycles, balance reversal rules, proposed RPC names,
parameter shapes, return formats, security conventions, migration sequencing,
repository wiring plans, and key risks. No runtime repositories, SQL migrations,
UI, sync, or data-source switching were implemented in this planning milestone.

## Milestone 4N Note

Balance-safe Supabase Bill RPCs are implemented in
`supabase/migrations/0005_bill_rpc.sql`. The explicit Supabase finance factory
now creates a real Bills repository for scoped reads and bill mutations via
RPCs, including paid/unpaid flows that create, reverse, and soft-delete linked
expense transactions atomically with account balance updates. The default
`supabaseFinanceDataSource` remains inactive, `activeFinanceDataSource` still
points to IndexedDB, and Goals, Loans, and Budgets remain inactive Supabase
stubs.

## Milestone 4O Note

Balance-safe Supabase Goal RPCs are implemented in
`supabase/migrations/0006_goal_rpc.sql`. The explicit Supabase finance factory
now creates a real Goals repository for scoped reads and goal mutations via
RPCs, including contribution and withdrawal flows that create linked transfer
transactions atomically with account balance and goal `current_amount` updates.
Goal archive and soft-delete RPCs reverse active linked goal movements,
soft-delete linked transactions, and update the goal in one database
transaction. The default `supabaseFinanceDataSource` remains inactive,
`activeFinanceDataSource` still points to IndexedDB, and Loans and Budgets
remain inactive Supabase stubs.

## Milestone 4P Note

Balance-safe Supabase Loan RPCs are implemented in
`supabase/migrations/0007_loan_rpc.sql`. The explicit Supabase finance factory
now creates a real Loans repository for scoped reads and loan mutations via
RPCs, including loan given/taken opening movements and repayment flows that
create linked transfer transactions atomically with account balance and loan
`outstanding_amount` updates. Loan archive and soft-delete RPCs reverse active
linked loan movements, soft-delete linked transactions, and update the loan in
one database transaction. The default `supabaseFinanceDataSource` remains
inactive, `activeFinanceDataSource` still points to IndexedDB, and Budgets
remain inactive Supabase stubs.

## Milestone 4Q Note

The Supabase Budgets repository is implemented behind the explicit Supabase
finance factory. Budgets use scoped Supabase CRUD with local-parity validation:
expense-category checks, active `month + category` duplicate prevention, and
self-ignoring duplicate checks during edits. All finance repositories now have
Supabase implementations behind `createSupabaseFinanceDataSource(...)`. The
default `supabaseFinanceDataSource` remains inactive, `activeFinanceDataSource`
still points to IndexedDB, and the next step should be controlled
local-to-cloud migration planning/tooling rather than automatic switching.

## Milestone 4R Note

Fresh cloud mode activation is prepared without local migration or sync. Local
mode remains the default, the static `activeFinanceDataSource` export still
points to IndexedDB, and runtime app screens now read the selected data source
from `FinanceDataProvider`. Cloud mode is only selected when Supabase is
configured, a user is signed in, and the user explicitly chooses Cloud in
Settings. The provider bootstraps or reuses a Supabase household, seeds default
categories in that household, and routes finance modules to the explicit
Supabase factory while leaving browser IndexedDB data untouched. Backup/restore
remains local-only and a future milestone should design any deliberate
local-to-cloud migration separately.

## Milestone 5A Note

The app has pivoted to cloud-only runtime architecture. Finance pages no longer
support Local/Cloud switching, `financeDataMode` localStorage state has been
removed, and unauthenticated users see configuration/authentication screens
instead of finance routes. `FinanceDataProvider` now bootstraps the signed-in
user's Supabase household and exposes only
`createSupabaseFinanceDataSource(...)` repositories to runtime pages. The
IndexedDB repositories, models, regression tests, and backup implementation are
retained as legacy unused runtime code for a later cleanup milestone. Backup &
Restore is disabled in Settings until cloud export/restore is designed.

## Milestone 5C Note

Cloud export is implemented in Settings as `Cloud Backup`. The signed-in app can
download a version 2 JSON backup for the current Supabase household using the
authenticated anon client and RLS-scoped selects. The backup includes the
household row, household members, accounts, categories, transactions, bills,
goals, loans, budgets, and optional audit history when available. Legacy
IndexedDB backup code remains unused at runtime. Cloud import/restore remains
future work.

## Milestone 5D Note

Recurring transactions are implemented as cloud household-scoped schedule
records in `public.recurring_transactions`. The app supports manual generation
for recurring income, expense, and transfer schedules; generated items are
normal transactions created through the existing balance-safe transaction RPC,
then the schedule is advanced. Generation is intentionally manual and
per-record for this milestone. No notifications, cron scheduler, import/restore,
or special report logic has been added.
