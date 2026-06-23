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
