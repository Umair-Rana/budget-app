# Offline Architecture Foundation

This document describes the intended offline-first direction for Household Finance. Phase 2A is a foundation milestone only: the app still runs cloud-only, and no user-visible behavior changes are introduced.

## Current repository flow

```text
React UI
  |
  v
useFinanceDataSource()
  |
  v
FinanceDataSource contract
  |
  v
Supabase repository implementations
  |
  v
Supabase RPCs and household-scoped tables
```

Most screens already depend on `FinanceDataSource` instead of importing Supabase repositories directly. The remaining cloud-specific coupling is intentionally at the boundary:

- auth provider and Supabase session handling;
- household bootstrap, sharing, rename, and deletion flows;
- cloud backup export;
- repository construction inside the finance data provider.

Those areas are allowed to know about Supabase because they are cloud/session infrastructure, not page-level finance CRUD.

## Future repository factory flow

```text
React UI
  |
  v
FinanceDataSource
  |
  v
Repository factory
  |
  +-- Supabase repositories       current production path
  |
  +-- Offline repositories        future path, feature-flagged
        |
        +-- Local database adapter
        +-- Operation queue
        +-- Sync engine
```

The factory currently returns Supabase repositories only. `offlineMode` is present as a disabled feature flag so future work can add an offline runtime without changing page components.

## Future sync flow

```text
User performs business action
  |
  v
Repository method validates domain rules
  |
  +-- Online: call Supabase RPC/repository immediately
  |
  +-- Offline: write local projection and enqueue business operation
                 |
                 v
              Network returns
                 |
                 v
              Replay queued operations through existing Supabase RPCs
                 |
                 v
              Pull remote household state and refresh local projection
```

The sync engine should not sync raw table updates. It should replay business operations such as:

- `CreateTransaction`
- `UpdateTransaction`
- `DeleteTransaction`
- `PayBill`
- `UnpayBill`
- `CreateGoalContribution`
- `WithdrawFromGoal`
- `RecordLoanRepayment`
- recurring generation operations

This keeps balance-impact rules, linked transactions, idempotency, and household membership security aligned with the existing Supabase business logic.

## Operation queue design

Each queued operation should include:

- stable queue item ID;
- operation type;
- entity family;
- household ID;
- user ID;
- payload;
- idempotency key;
- created timestamp;
- retry count;
- status;
- last/next attempt timestamps;
- error message when failed.

The queue must be idempotent. If Android or Web retries after a crash, the server should be able to recognize already-applied operations and avoid duplicate transactions or duplicate bill payments.

## Conflict strategy

The first offline sync implementation should prefer business-operation conflicts over row-diff conflicts.

Examples:

- A transaction edited by two household members should be resolved as competing `UpdateTransaction` operations.
- A bill paid offline in one device and deleted online by another should be surfaced as a `PayBill` versus `DeleteBill` conflict.
- Goal contributions and loan repayments should remain server-validated because they affect account balances and linked transactions.

Initial conflict handling can be conservative: detect conflict, stop replay for that operation, preserve local queued data, and ask a future UI layer to resolve it.

## Local database interfaces

Phase 2A introduces type contracts only:

- local entity repository interface;
- local sync metadata repository interface;
- operation queue repository interface;
- sync result/conflict/status types.

No IndexedDB or SQLite implementation is introduced in this phase.

## Android and Web differences

The repository and sync contracts should be shared across Android and Web. The storage adapter can differ:

- Android may later use SQLite through Capacitor.
- Web may later use IndexedDB.

Both adapters should expose the same local repository contracts so React pages and domain code do not branch on platform.

## Non-goals for this phase

This milestone does not add:

- offline CRUD;
- local persistence changes;
- SQLite;
- IndexedDB migration changes;
- background sync;
- conflict resolution UI;
- push notifications;
- database migrations.

The production runtime remains cloud-only.

## SQLite POC Results

Milestone 3A.1 adds an isolated SQLite proof-of-concept under
`src/data/local-sqlite/poc/`. It is not wired into the finance runtime, React
providers, Supabase repositories, or user interface.

### Packages selected

- Android native SQLite: `@capacitor-community/sqlite`
- Web SQLite WASM: `@sqlite.org/sqlite-wasm`

The Android package was selected because it is the established Capacitor
community SQLite plugin and exposes native Android persistence through the
same Capacitor project already used by the APK.

The Web package was selected because it is the SQLite project's official WASM
distribution and supports OPFS when the browser and response headers allow it.

### POC scope

The POC uses only this table:

```sql
create table if not exists sqlite_poc_notes (
  id text primary key,
  title text not null,
  created_at text not null,
  updated_at text not null
);
```

It also creates `schema_migrations` and records the migration ID
`0001_sqlite_poc_notes`. The runner proves migration ordering plus insert,
query, update, and delete through a small shared driver contract.

### OPFS and Vercel headers

The Web POC runs SQLite WASM inside a module worker. It attempts OPFS first and
falls back to a non-OPFS SQLite database if OPFS is unavailable. Durable Web
SQLite persistence depends on OPFS availability.

OPFS-backed SQLite requires cross-origin isolation. Before exposing Web SQLite
runtime behavior in production, Vercel should serve the app with these headers:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cross-Origin-Opener-Policy",
          "value": "same-origin"
        },
        {
          "key": "Cross-Origin-Embedder-Policy",
          "value": "require-corp"
        }
      ]
    }
  ]
}
```

Those headers are documented but not applied in this spike because no
production route uses SQLite yet, and `Cross-Origin-Embedder-Policy` can affect
third-party scripts, images, and embeds. Apply and test them before enabling
Web SQLite for real app data.

### Persistence result

- Android persistence is implemented through a native SQLite database named
  `household_finance_sqlite_poc`. Manual APK/device verification is still
  required to confirm persistence after app restart.
- Web persistence is implemented through SQLite WASM OPFS when available.
  Manual browser verification with cross-origin isolation headers is still
  required to confirm persistence after refresh on the deployment target.

### Known limitations

- The POC is intentionally not user-visible.
- The POC does not model finance tables, household membership, sync queues, or
  conflict handling.
- Web OPFS requires browser support and deployment headers.
- Safari support needs extra caution. Older Safari versions are not a good
  target for the OPFS-backed SQLite path.
- The IndexedDB fallback should remain until Web SQLite persistence is proven
  on the browsers and Vercel configuration the app will actually support.

### Go / No-Go recommendation

Conditional Go for SQLite-first architecture. The shared migration runner and
driver contract are viable, Android native SQLite is available through
Capacitor, and Web SQLite WASM can be loaded through Vite. Keep the IndexedDB
fallback until OPFS persistence is manually verified on deployed Web builds and
the cross-origin isolation headers are accepted for production.

## Local SQLite Schema Foundation

Milestone 3A.2 adds the real local SQLite schema and migration foundation under
`src/data/local-sqlite/`. This is separate from the POC folder and is still not
wired into app runtime, finance repositories, Supabase sync, or UI.

### Clean-start decision

Production currently has no significant user data, so the local SQLite schema
starts clean. There is no production data backfill from existing Supabase
records in this milestone.

Local migrations still exist because future installed APKs and browser local
databases will need deterministic upgrades. Even with a clean initial rollout,
each future schema change should be delivered as an ordered local SQLite
migration.

### Schema overview

The first local migration is:

```text
0001_initial_local_sqlite_schema
```

It creates local finance tables for:

- `households`
- `household_members`
- `accounts`
- `categories`
- `transactions`
- `bills`
- `goals`
- `loans`
- `budgets`
- `recurring_transactions`
- `recurring_bills`
- `notifications`

It also creates local infrastructure tables:

- `schema_migrations`
- `local_sync_metadata`
- `operation_queue`
- `sync_conflicts`
- `tombstones`

The schema uses SQLite-compatible column types only: `text`, `integer`, and
`real`. IDs are stored as `id text primary key`. Timestamps are ISO strings.
Household-owned records include `household_id text not null`, and finance
tables include `updated_at` plus `deleted_at` for future sync and soft-delete
handling.

### Operation queue purpose

`operation_queue` is the future durable list of business operations that must be
replayed to Supabase when connectivity returns. It stores operation type,
entity type, entity ID, payload JSON, status, attempt count, idempotency key,
retry timing, and error details.

No replay logic is implemented yet.

### Sync metadata purpose

`local_sync_metadata` will track per-household/per-entity pull and push cursors.
It records `last_pulled_at`, `last_pushed_at`, and an optional remote cursor so
future sync can resume incrementally instead of reloading everything.

No pull/push sync is implemented yet.

### Tombstone purpose

`tombstones` records deleted entity IDs and deletion timestamps. This lets
future sync distinguish "record is missing because it was deleted" from "record
has not been downloaded yet", which is essential for multi-device deletion
correctness.

### IndexedDB fallback status

IndexedDB fallback remains in place. It should not be removed until Web SQLite
WASM + OPFS persistence is proven on deployed builds and accepted for the
browser support matrix.

## Local SQLite Drivers

Milestone 3A.3 adds real platform driver implementations for the
`LocalSqliteDriver` contract. These drivers can create/open local databases,
run the real local schema migrations, execute parameterized SQL, wrap work in
transactions, and close connections.

They are still not connected to finance repositories, app startup, Supabase
sync, or UI. The production runtime remains cloud-first.

### Android driver

Android uses `@capacitor-community/sqlite` through
`AndroidLocalSqliteDriver`. The local database name is:

```text
household_finance_local
```

The driver supports:

- `exec(sql)` for SQL statements;
- `run(sql, params)` for parameterized writes;
- `query<T>(sql, params)` for parameterized reads;
- `transaction(work)` using `begin transaction`, `commit`, and `rollback`;
- `close()` for safely closing the native connection.

### Web WASM driver

Web uses `@sqlite.org/sqlite-wasm` through a module worker. The main-thread
driver sends SQL requests to the worker so SQLite work does not block React.

The worker attempts OPFS first. If OPFS is unavailable or cannot be opened, it
falls back to a transient SQLite database. The fallback is useful for smoke
testing the driver contract but should not be treated as durable offline
storage.

Durable Web OPFS persistence still requires cross-origin isolation headers:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Those headers are still documented-only. They are not required by the current
production app because the SQLite driver is not called from runtime.

### Driver factory and initializer

`createLocalSqliteDriver()` selects:

- native Capacitor platform: Android SQLite driver;
- browser platform: Web SQLite WASM driver;
- Vitest/test mode: in-memory driver.

`initializeLocalSqlite()` creates a driver, runs all local SQLite migrations,
and returns the initialized driver. It closes the driver if migration
initialization fails.

### Development smoke helper

`runLocalSqliteSmokeTest()` initializes a driver, runs migrations, performs a
safe insert/query/update/delete against `local_sync_metadata`, and closes the
driver. It is guarded as development-only and is not wired to any production
route or UI.

## Local SQLite Mapping Layer

Milestone 3A.4 adds the local SQLite finance row types, domain mappers, and
read-only repository scaffold. This prepares a future local read path without
switching the app runtime.

### Mapper purpose

The mapping layer translates SQLite rows that use snake_case columns and
SQLite-safe values into existing domain models such as `Account`, `Transaction`,
`Bill`, `Goal`, `Loan`, budgets, recurring records, and app notifications.

JSON fields are stored as JSON text locally. For example, transaction tags are
stored in `tags_json` and mapped back to the domain `tags` array.

### Read-only repository scaffold purpose

Local repositories now expose read methods such as `getAll`, `getById`, and
entity-specific filters like `getByType`, `getByMonth`, and `getDue`.

All repository reads are household-scoped and exclude deleted rows by default.
Archived rows are also excluded by default where the app's repository options
support that behavior.

### Runtime remains Supabase-only

The local SQLite data source scaffold is not connected to
`createFinanceDataSource(...)`, React providers, routes, or app startup. The
active production runtime remains Supabase-only.

### Write operations are deferred

Write methods intentionally throw:

```text
Local SQLite write operations are not implemented yet.
```

Offline writes require operation queue replay, idempotency, conflict handling,
and server reconciliation. Those are deliberately deferred to later milestones.

### IndexedDB fallback status

IndexedDB fallback remains in place and untouched. It should not be removed
until the SQLite read/write/sync path is fully proven on Android and Web.

## Cloud to Local Hydration

Milestone 3A.5 adds a controlled Supabase-to-local SQLite hydration layer. It
builds a local SQLite projection from the current authenticated household's
cloud data, but it does not change app runtime behavior.

### Not a production historical migration

Hydration is not a historical production backfill system. It is a runtime
projection builder for the current logged-in household. The app still treats
Supabase as the source of truth, and existing cloud reads/writes remain the
active production path.

### Cloud remains source of truth

The hydrator reads all current finance entities from the Supabase-backed
`FinanceDataSource` using include-all repository options so archived/deleted
records can be copied into the local projection. Household and membership rows
come from either a Supabase client fetch or an explicit household snapshot.

For this milestone, cloud wins. Existing local rows for the household are
soft-marked as deleted before cloud rows are upserted back into SQLite. This
prevents stale local projection rows without permanently deleting local data or
introducing tombstone sync behavior.

### Tables hydrated

The hydration layer writes:

- `households`
- `household_members`
- `accounts`
- `categories`
- `transactions`
- `bills`
- `goals`
- `loans`
- `budgets`
- `recurring_transactions`
- `recurring_bills`
- `notifications`

Notifications are derived from the current finance data because the current app
does not store app notifications as a Supabase table. They are written as a
local projection only.

### Transaction and metadata behavior

Hydration runs inside `LocalSqliteDriver.transaction(...)`. Android uses
`begin transaction`, `commit`, and `rollback`; Web and tests use the same driver
contract. If hydration fails during local writes, the driver is expected to
rollback and the returned hydration result includes a clear error list.

After a successful hydration, `local_sync_metadata` is updated once per entity
type with:

- `household_id`
- `entity_type`
- `last_pulled_at`
- `updated_at`

Remote cursors are intentionally not used yet.

### Runtime remains Supabase-only

The hydrator is exported as an internal data-layer utility and is not wired into
React providers, app startup, route loaders, or the finance data source factory.
Future milestones can manually invoke it during local read-path experiments,
but production runtime remains Supabase-only after 3A.5.

### Future read-path switching plan

Before switching reads to local SQLite, the app still needs a gated read-path
strategy, refresh scheduling, realtime-to-local projection updates, stale-row
policy validation, operation queue design, and conflict/replay handling for
future offline writes.

## Gated Local SQLite Read Path

Milestone 3A.6 adds a disabled-by-default local SQLite read path for
development and diagnostic testing.

### Default runtime remains Supabase

The feature flag is:

```text
VITE_LOCAL_SQLITE_READ_MODE=false
```

When this flag is absent or false, `createFinanceDataSourceForRuntime(...)`
returns the Supabase finance data source and does not initialize local SQLite.
This remains the default production behavior.

### Local read mode behavior

When enabled in development/testing, the runtime factory:

1. creates the Supabase finance data source;
2. initializes local SQLite and runs migrations;
3. hydrates the current household projection from Supabase into SQLite;
4. returns a hybrid data source.

The hybrid data source reads from local SQLite repositories and delegates all
mutations to Supabase repositories.

### Writes remain Supabase-only

No local writes, operation replay, conflict handling, or sync queue processing
exists yet. App mutations still call Supabase. After a successful Supabase
mutation in local read mode, the hybrid data source performs a best-effort
rehydration so subsequent local reads can see the updated cloud projection.

If post-write rehydration fails, the Supabase write result is preserved and the
diagnostic logger records the local refresh failure.

### Fallback behavior

If SQLite initialization or initial hydration fails, the app falls back to the
Supabase data source. App startup should not fail because local diagnostic read
mode could not start.

### Realtime behavior

Realtime invalidation remains unchanged. It still invalidates finance queries
after Supabase events. Automatic realtime-triggered local rehydration is not
implemented in this milestone and should be handled in a later sync/read-path
hardening step.

### Not offline mode

This is not offline-first behavior. It is a gated local read-path test harness.
Future milestones must still implement local write operations, an operation
queue, idempotent replay, conflict handling, and robust sync metadata before
offline mode can be enabled.
