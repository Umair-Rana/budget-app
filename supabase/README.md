# Supabase Schema Draft

This folder contains Supabase/PostgreSQL migrations for the Household Finance
cloud runtime.

Supabase is now the only runtime database. IndexedDB code remains in the app as
a legacy unused runtime implementation until a later cleanup milestone.

## Files

- `migrations/0001_initial_schema.sql` creates the draft tables, constraints,
  indexes, timestamps, and soft-delete fields.
- `migrations/0002_rls_policies.sql` enables RLS and adds draft membership-based
  access policies.

## Applying Later

Review migrations before applying them to a real Supabase project. Use the
Supabase CLI or dashboard migration workflow against the intended project.

## Supabase CLI Workflow

Install the Supabase CLI using the official installation path for your machine.
After installation, authenticate and link this project:

```powershell
supabase login
supabase link --project-ref <project-ref>
```

Apply the migrations to the linked project only after review:

```powershell
supabase db push
```

Generate TypeScript database types after the linked schema is up to date:

```powershell
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

The generated file should replace the current placeholder
`src/lib/supabase/database.types.ts`. Do not manually fake generated types.

## Environment Values

Store real local frontend values in `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not commit `.env.local`. The frontend must never use the service role key,
database password, or Supabase access token.

## Current Status

The runtime app signs in with Supabase Auth, bootstraps a household, uses
Supabase repositories for finance data, and can export the signed-in household
as a JSON cloud backup. Cloud import/restore is not implemented yet.

## Security Notes

- Keep the service role key out of frontend code.
- Frontend code should only use the anon public key.
- Store real local credentials in `.env.local`.
- Never commit real secrets.
- Review RLS before production use, especially household bootstrap, member
  management, hard deletes, and balance-sensitive finance operations.
