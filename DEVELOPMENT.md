# Development

## Common Commands

```powershell
npm.cmd install
npm.cmd run dev
npm.cmd run build
npm.cmd run lint
npm.cmd run test
npm.cmd run verify
```

`npm.cmd run verify` runs build, lint, and the full Vitest regression suite.

## Data Safety

Household Finance is now a cloud-only app at runtime. Production finance data
is stored in the authenticated user's Supabase household.

Tests use `fake-indexeddb` with isolated test database names. They do not mutate
production browser IndexedDB data or Supabase data. IndexedDB repositories and
backup code remain in the project as legacy unused runtime implementations until
a later cleanup milestone.

## Supabase Setup

Supabase configuration is required to run the app. Without config, the app shows
a configuration-required screen instead of loading finance pages.

1. Create a Supabase project.
2. Copy the project URL into `VITE_SUPABASE_URL`.
3. Copy the anon public key into `VITE_SUPABASE_ANON_KEY`.
4. Store real values in `.env.local`.
5. Never commit real secrets.

Use `.env.example` as the template for required variable names.

### Supabase CLI

Install the Supabase CLI using the official instructions, then authenticate and
link the project when cloud schema work is ready:

```powershell
supabase login
supabase link --project-ref <project-ref>
supabase db push
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Only run `supabase db push` against a reviewed project/schema. The generated
types command should replace `src/lib/supabase/database.types.ts` after the
linked project schema changes. Keep the service role key, database password, and
access token out of the frontend and out of the repo.

## Before Risky Changes

1. Confirm `npm.cmd run verify` passes.
2. Make the change.
3. Run `npm.cmd run verify` again.
4. Manually QA affected cloud flows with a signed-in Supabase user.

Risky changes include finance logic, repository behavior, IndexedDB schema,
Supabase migrations/RPCs, linked transactions, account balances,
planner/reports calculations, and cloud backup/export behavior.

## Recommended Milestone Workflow

Keep each milestone narrow. Prefer reusable components and shared services over
page-specific logic. Before starting implementation, identify affected flows,
then finish with build, lint, tests, and focused manual QA.
