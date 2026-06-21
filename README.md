# Household Finance

Household Finance is a cloud-backed personal finance app built with Vite,
React, TypeScript, Tailwind CSS, and Supabase.

## Runtime Architecture

- Supabase Auth is required.
- Finance data is stored in the signed-in user's Supabase household.
- The app bootstraps the first household automatically as `My Household` with
  `PKR` and `en-PK`.
- IndexedDB repositories, models, tests, and backup code remain as legacy unused
  runtime implementations until a later cleanup milestone.

## Current Features

- Accounts
- Categories
- Transactions
- Bills and bill payment flows
- Goals and goal movement flows
- Loans and repayment flows
- Planner/Budgets
- Reports
- Theme preferences

## Setup

Create `.env.local` from `.env.example`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Then run:

```powershell
npm.cmd install
npm.cmd run dev
```

Without Supabase config, the app shows a configuration-required screen.

## Quality

```powershell
npm.cmd run verify
```

`verify` runs build, lint, and the Vitest regression suite.
