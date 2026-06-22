# Codex Project Context - Household Finance

Generated: 2026-06-22

This file is a handoff document for a new Codex agent. It summarizes the current project state, architecture, conventions, user preferences, and recent implementation context so work can continue smoothly after switching Codex accounts.

## Project Summary

Household Finance is a cloud-first personal finance web app built with Vite, React, TypeScript, Tailwind CSS, shadcn-style UI primitives, React Router, TanStack Query, React Hook Form, Zod, Recharts, Lucide React, and Supabase.

The app is now intended to run against Supabase only. IndexedDB code remains in the repository as legacy/reference implementation and for older tests, but it is no longer the active runtime data source.

Core modules:

- Authentication
- Household bootstrap
- Household invites and members
- Accounts
- Categories
- Transactions
- Bills
- Recurring bills
- Goals
- Loans
- Planner / budgets
- Reports
- Overview dashboard
- Recurring transactions
- In-app notifications
- Cloud backup export

## User Preferences And Standing Instructions

The user has explicitly asked that future work follow these rules:

- Use reusable components.
- Do not hardcode layout patterns inside individual pages.
- Keep visual styles centralized.
- Do not mix business logic inside UI components.
- Treat manual QA results from the developer as the source of truth for cloud behavior when the agent cannot perform authenticated browser QA.
- Do not request, store, print, or commit real credentials.
- Do not require `.env.qa.local`.
- Do not block future milestones on automated authenticated browser QA if the browser environment cannot access the network.

## Runtime Architecture

Current runtime behavior:

- Supabase Auth is required.
- A signed-in user is attached to a household.
- First login automatically bootstraps a household if needed.
- Finance data is read and written through Supabase-backed repositories.
- All cloud repositories are created through the explicit Supabase data-source factory.
- The active application path should not use IndexedDB repositories.
- IndexedDB repositories, models, and tests remain in the repo as legacy/reference code.

Important files:

- `src/providers/auth-provider.tsx`
- `src/providers/finance-data-provider.tsx`
- `src/data/contracts/finance-data-source.ts`
- `src/data/supabase/supabase-finance-data-source.ts`
- `src/lib/supabase/supabase-client.ts`
- `src/lib/supabase/supabase-config.ts`
- `src/lib/supabase/database.types.ts`

`FinanceDataSource` currently includes repositories for:

- `accounts`
- `categories`
- `transactions`
- `bills`
- `goals`
- `loans`
- `budgets`
- `recurringBills`
- `recurringTransactions`

## Commands

Use Windows PowerShell commands:

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run test
npm.cmd run verify
```

`npm.cmd run verify` runs:

```text
build -> lint -> tests
```

The package script is:

```json
"verify": "npm run build && npm run lint && npm run test"
```

## Environment And Security

Environment file:

```text
.env.local
```

Expected frontend variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Rules:

- Never commit `.env.local`.
- Never expose service role keys.
- Never expose database passwords.
- Never expose Supabase access tokens.
- Frontend code may only use the Supabase project URL and anon key.
- Supabase RLS and RPCs must enforce household access.

## Routes

Main routes are defined in:

```text
src/routes/app-routes.tsx
```

Known routes:

- `/` - Overview
- `/transactions` - Transactions
- `/recurring` - Recurring Transactions
- `/planner` - Planner / Budgets
- `/more` - More
- `/bills` - Bills
- `/recurring-bills` - Recurring Bills
- `/goals` - Goals
- `/loans` - Loans
- `/accounts` - Accounts
- `/reports` - Reports
- `/audit-history` - Audit History
- `/settings` - Settings
- `/404` - Not Found

Navigation expectations:

- Desktop main navigation: Overview, Transactions, Bills, Goals, More.
- Settings remains separate at the sidebar bottom.
- More contains Planner, Loans, Accounts, Reports, Audit History, and mobile Settings access when needed.
- More child pages should preserve More context in active navigation.
- Mobile bottom navigation should remain compact and should not overflow.

## Supabase Data Source

The Supabase data source factory is in:

```text
src/data/supabase/supabase-finance-data-source.ts
```

Important behavior:

- The default inactive `supabaseFinanceDataSource` exists for safety.
- `createSupabaseFinanceDataSource(input)` creates real Supabase repositories.
- All current finance modules have Supabase implementations.
- The cloud-only provider should create the real data source after auth and household bootstrap.

## Supabase Migrations

Migrations currently present:

```text
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_rls_policies.sql
supabase/migrations/0003_transaction_rpc_functions.sql
supabase/migrations/0004_lock_transaction_rpc_helper_access.sql
supabase/migrations/0005_bill_rpc.sql
supabase/migrations/0006_goal_rpc.sql
supabase/migrations/0007_loan_rpc.sql
supabase/migrations/0008_household_bootstrap_rpc.sql
supabase/migrations/0009_recurring_transactions.sql
supabase/migrations/0010_household_invites.sql
supabase/migrations/0011_remove_household_member.sql
supabase/migrations/0012_recurring_generation_rpc.sql
supabase/migrations/0013_recurring_bills.sql
```

High-level purpose:

- `0001` initial schema.
- `0002` RLS policies.
- `0003` transaction RPCs.
- `0004` locks down helper access.
- `0005` bill payment RPCs.
- `0006` goal movement RPCs.
- `0007` loan repayment RPCs.
- `0008` household bootstrap RPC.
- `0009` recurring transactions.
- `0010` household invites.
- `0011` owner remove household member RPC.
- `0012` atomic/idempotent recurring transaction generation RPC.
- `0013` recurring bills and recurring bill generation RPC.

Supabase CLI commands used/documented in the project:

```powershell
npm.cmd exec supabase -- db push
npm.cmd exec supabase -- gen types typescript --linked > src/lib/supabase/database.types.ts
```

If generated types get encoding issues on Windows, normalize back to UTF-8 before committing.

## Feature Architecture Notes

### Authentication

Key files:

- `src/components/auth/auth-screen.tsx`
- `src/providers/auth-provider.tsx`

Recent signup hardening:

- Signup should show success or error clearly.
- If email confirmation is required, show a message telling the user to check email and then sign in.
- Supabase signup should use a safe redirect origin when needed, not hardcoded localhost or a Vercel preview URL.
- Do not log passwords.
- Existing sign-in must keep working.

### Household Bootstrap And Sharing

Key behavior:

- First login creates/reuses household.
- Household categories seed once only.
- Owner can invite members.
- Pending invites can be revoked.
- Owner can remove non-owner household members.
- Removed members should no longer access household finance data after refresh/login.
- No realtime kicking is required.

Important security rules:

- Owner cannot remove themselves.
- Owner cannot remove the last owner.
- Non-owners cannot remove members.
- RLS/RPC must enforce household access.

### Accounts

Accounts are cloud-backed. Account balances are updated through transaction, bill, goal, and loan flows. Do not manually mutate balances in UI components.

### Categories

Categories are a reusable system used by transactions, bills, planner/budgets, reports, overview, and icons/colors.

Category rules:

- Types: income, expense, adjustment.
- Default categories are protected.
- Duplicate active names within the same type should be prevented.
- Settings contains category management.

### Transactions

Transactions are cloud-backed and balance-sensitive. Use RPCs for create/update/archive/delete where account balances can change.

Transaction types include:

- Income
- Expense
- Transfer
- Adjustment

Timestamp behavior:

- Transactions support date and time.
- Sorting should use transaction date/time with fallbacks for older data.
- Same-date transactions should sort correctly by time.

### Bills

Bills are cloud-backed. Mark paid/unpaid flows use RPCs because they affect linked transactions and account balances.

Recurring bills:

- Route: `/recurring-bills`
- Recurring bills generate normal unpaid bill records.
- They do not automatically create expense transactions.
- Existing Mark Paid flow creates the payment transaction.

### Goals

Goals are cloud-backed. Contributions and withdrawals are balance-sensitive and use RPCs. Goal progress drives overview and notifications.

### Loans

Loans are cloud-backed. Repayments are balance-sensitive and use RPCs. Loan summaries feed overview, reports, and notifications.

### Planner / Budgets

Budgets are cloud-backed through normal scoped Supabase CRUD.

Rules:

- Month required.
- Category required.
- Category must be an expense category.
- Planned amount must be greater than or equal to zero.
- Duplicate active `month + categoryId` should be blocked.
- Editing a budget must ignore itself during duplicate checks.

Planner and budget calculations should live in reusable data/planner or selector layers, not UI components.

### Reports

Reports should use reusable query/selector layers. Do not duplicate finance calculations inside React components.

### Overview Dashboard

Overview is backed by real data from query/selectors. Dashboard cards should not contain business logic in page components.

Important calculations:

- Available Balance: sum active account balances.
- Monthly Income: current month income transactions only.
- Monthly Expenses: current month expense transactions only.
- Budget Remaining: planner budget behavior where available.

### Recurring Transactions

Recurring transactions are cloud-backed.

Important migration:

```text
supabase/migrations/0012_recurring_generation_rpc.sql
```

Important behavior:

- Generation is atomic and idempotent.
- RPC uses row locking and existing transaction RPC helpers.
- Repository `generateDue` should call the RPC and should not run a client-side loop that creates multiple transactions non-atomically.

### In-App Notifications

Notifications are derived data, not database rows.

Expected notification types:

- Bills due today, due tomorrow, overdue.
- Recurring transactions due or overdue.
- Goals complete or over target.
- Loans fully repaid.
- Budgets at 80%, 100%, or over allocation.

Dismissals persist in localStorage only and do not affect finance data.

### Cloud Backup Export

Cloud backup export exists in Settings.

Export should include current household data only:

- household
- household_members
- accounts
- categories
- transactions
- bills
- recurring_bills
- goals
- loans
- budgets
- optional audit_history if available

Do not export:

- auth secrets
- access tokens
- service role keys
- passwords

Backup format uses:

```json
{
  "app": "Household Finance",
  "backupVersion": 2,
  "source": "supabase",
  "exportedAt": "ISO_DATE",
  "household": {},
  "stores": {}
}
```

Import/restore was explicitly not part of the cloud backup milestone unless requested later.

## Date Input Audit

The app currently uses native HTML date controls:

- `<input type="date">`
- `<input type="month">`

It does not currently use:

- shadcn/ui Date Picker
- React Day Picker
- another date picker library

Read-only date labels use app formatting helpers, including `formatDisplayDate`, to display dates as `DD/MM/YYYY`.

Important limitation:

- Native browser date inputs cannot reliably display `DD/MM/YYYY` in every browser.
- Browsers localize native date inputs based on user agent, OS locale, and platform behavior.
- Pakistan users may still see browser-specific formats in the native date picker/input UI.

Recommended future implementation:

- Build one reusable `DateField` component.
- Store values internally as ISO `YYYY-MM-DD`.
- Display/edit as `DD/MM/YYYY`.
- Validate and parse centrally.
- Use a calendar popover/dialog if desired.
- Use mobile-friendly behavior without relying on inconsistent native display formatting.

## UI And Styling Conventions

General expectations:

- Use reusable layout and form components.
- Keep repeated page shells centralized.
- Keep business/domain logic out of UI components.
- Use shared formatting helpers for money, dates, percentages, and statuses.
- PKR formatting is expected.
- Date display should be `DD/MM/YYYY` where the app controls rendering.
- Expense amounts should be neutral with a minus sign; reserve red for warnings/danger states.
- Use Lucide React icons where available.
- Avoid fake/demo financial data.

## Testing

Test stack:

- Vitest
- fake-indexeddb for legacy/local data tests where needed
- mocked Supabase clients for cloud repository tests

Tests should not hit live Supabase.

Latest known verification from prior work:

```text
npm.cmd run verify
```

Last reported result:

```text
passed
17 test files
107 tests
```

Run verify before and after risky changes.

## Important File Map

Application shell and routing:

- `src/routes/app-routes.tsx`
- `src/layouts/app-layout.tsx`
- `src/components/app/`
- `src/components/ui/`

Providers:

- `src/providers/auth-provider.tsx`
- `src/providers/finance-data-provider.tsx`
- `src/providers/theme-provider.tsx`

Supabase:

- `src/lib/supabase/supabase-config.ts`
- `src/lib/supabase/supabase-client.ts`
- `src/lib/supabase/database.types.ts`
- `src/data/supabase/supabase-finance-data-source.ts`
- `src/data/supabase/repositories/`
- `src/data/supabase/mappers/`
- `src/data/supabase/types/`

Contracts and data-source:

- `src/data/contracts/`
- `src/data/data-source/`

Domain/query layers:

- `src/data/domain/`
- `src/data/dashboard/`
- `src/data/reports/`
- `src/data/planner/`
- `src/data/notifications/`
- `src/data/backup/`

Legacy IndexedDB:

- `src/data/repositories/`
- `src/data/db/`
- `src/data/models/`

Supabase migrations:

- `supabase/migrations/`

Project docs:

- `README.md`
- `DEVELOPMENT.md`
- `SUPABASE_SYNC_PLAN.md`
- `supabase/README.md`

## Current Git State At Handoff

At the time this context file was created, `git status --short` returned no changes before adding this handoff document.

Only this handoff document should be new unless later edits are made:

```text
CODEX_PROJECT_CONTEXT.md
```

## Recommended Workflow For New Codex Agent

1. Read `README.md`, `DEVELOPMENT.md`, and this file.
2. Run `git status --short`.
3. Inspect the files related to the user’s next request before editing.
4. Keep changes scoped to the requested milestone or bug.
5. Do not change runtime architecture unless explicitly requested.
6. Do not touch secrets.
7. Run `npm.cmd run verify` after code changes.
8. Report changed files, behavior, tests, verify result, and known limitations.

## Suggested Next Safe Tasks

Only do these if the user asks:

- Implement a reusable cross-browser `DateField` for `DD/MM/YYYY` date entry.
- Continue cloud hardening based on developer manual QA results.
- Add regression tests for any confirmed production bug.
- Improve reusable form/list primitives without changing business behavior.
- Add cloud import/restore only as a separate explicit milestone.

