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

## Android APK - Capacitor

The Android APK uses Capacitor to wrap the existing Vite web build. This phase
is online-only and uses the same Supabase backend as the web app.

Common commands:

```powershell
npm.cmd run build
npm.cmd exec cap sync android
npm.cmd exec cap open android
```

Debug APK build:

```text
Open Android Studio → Build → Build Bundle(s) / APK(s) → Build APK(s)
```

If the Android command-line toolchain is configured, a debug APK can also be
built from the Android project directory:

```powershell
cd android
.\gradlew.bat assembleDebug
```

Commit the `android/` project for Capacitor, but do not commit local Android
build outputs, `local.properties`, keystores, or signing secrets.

### Android UX Notes

- Android hardware/software back is handled through the Capacitor App plugin.
  Back closes the top open dialog first, navigates back or home on nested
  routes, and asks before exiting from the Overview route.
- Android network status is handled through the Capacitor Network plugin rather
  than relying on `navigator.onLine`, which can be unreliable inside Android
  WebView. The shared `NetworkProvider` still uses browser events on Web.
- On Android app resume, the app rechecks current connectivity immediately and
  updates the connection banner. When the provider detects an offline-to-online
  transition, it invalidates finance queries once so realtime/data can recover
  from missed events.
- The main Android activity uses `android:windowSoftInputMode="adjustResize"`
  so the WebView resizes when the keyboard opens instead of covering form
  actions.
- The app shell and dialogs use CSS safe-area insets for status bar and bottom
  navigation spacing.
- Current Android manifest permissions are intentionally minimal. The APK uses
  `android.permission.INTERNET`; no location, contacts, storage, notification,
  or background permissions are required for the current cloud-only runtime.

### Android Icon and Splash Assets

Current icon and splash assets are the default Capacitor-generated assets and
are acceptable for this milestone.

Asset locations:

```text
android/app/src/main/res/mipmap-*/ic_launcher*.png
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher*.xml
android/app/src/main/res/drawable*/splash.png
android/app/src/main/res/drawable/ic_launcher_background.xml
android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml
```

Future branding work can replace these assets with generated Android icon and
splash sets. Do not edit signing keys or local build outputs for icon changes.

## Data Safety

Household Finance is now a cloud-only app at runtime. Production finance data
is stored in the authenticated user's Supabase household.

Tests use `fake-indexeddb` with isolated test database names. They do not mutate
production browser IndexedDB data or Supabase data. IndexedDB repositories and
backup code remain in the project as legacy unused runtime implementations until
a later cleanup milestone.

## SQLite POC

Milestone 3A.1 includes an isolated SQLite proof-of-concept under:

```text
src/data/local-sqlite/poc/
```

It is not wired into production finance flows. Use it only as a development
spike for proving local SQLite drivers.

Verification commands:

```powershell
npm.cmd run verify
npm.cmd run build
npm.cmd exec cap sync android
```

Android native POC entry point:

```ts
import { runAndroidSqlitePoc } from '@/data/local-sqlite/poc/android-sqlite-poc'
```

Web SQLite WASM POC entry point:

```ts
import { runWebSqlitePoc } from '@/data/local-sqlite/poc/web-sqlite-poc'
```

If a temporary harness is needed, keep it development-only and remove it before
shipping. Do not add a production route or settings control for this POC.

For durable Web OPFS testing, serve the app with cross-origin isolation:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Do not enable these headers blindly in production without checking third-party
assets and Supabase auth behavior.

## Local SQLite Schema Foundation

Milestone 3A.2 adds the real local SQLite schema and migration foundation under:

```text
src/data/local-sqlite/
```

The POC remains isolated under:

```text
src/data/local-sqlite/poc/
```

The real schema foundation is not connected to finance runtime yet. Do not add
local read/write paths, repository switching, offline CRUD, or Supabase replay
while working in this area unless a later milestone explicitly asks for it.

Useful verification commands:

```powershell
npm.cmd run test -- src/tests/local-sqlite-migrations.test.ts
npm.cmd run verify
npm.cmd run build
npm.cmd exec cap sync android
```

Local migration files live in:

```text
src/data/local-sqlite/migrations/
```

The first real migration is:

```text
0001_initial_local_sqlite_schema
```

Future local schema changes should add a new ordered migration instead of
editing applied migrations once an offline-capable APK or Web build has shipped.

## Local SQLite Drivers

Milestone 3A.3 adds real local SQLite driver implementations:

```text
src/data/local-sqlite/drivers/android-sqlite-driver.ts
src/data/local-sqlite/drivers/web-sqlite-wasm-driver.ts
src/data/local-sqlite/drivers/web-sqlite-wasm-worker.ts
src/data/local-sqlite/drivers/create-local-sqlite-driver.ts
```

The initializer lives at:

```text
src/data/local-sqlite/initialize-local-sqlite.ts
```

The development-only smoke helper lives at:

```text
src/data/local-sqlite/local-sqlite-smoke-test.ts
```

Smoke helper entry point:

```ts
import { runLocalSqliteSmokeTest } from '@/data/local-sqlite/local-sqlite-smoke-test'
```

Only call the smoke helper from a temporary development harness. Do not wire it
to app startup, production UI, finance repositories, or Supabase sync.

Useful driver verification commands:

```powershell
npm.cmd run test -- src/tests/local-sqlite-drivers.test.ts
npm.cmd run verify
npm.cmd run build
npm.cmd exec cap sync android
```

If native SQLite driver behavior changes, also build the Android project:

```powershell
cd android
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
.\gradlew.bat :app:assembleDebug --no-daemon --console=plain --stacktrace
```

Web SQLite OPFS persistence still requires these deployment headers before it
can be trusted for durable browser offline data:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## Local SQLite Finance Mapping and Read Repositories

Milestone 3A.4 adds local SQLite row types, mappers, read-only repositories, and
a local finance data source scaffold.

Key files:

```text
src/data/local-sqlite/local-finance-row-types.ts
src/data/local-sqlite/mappers/
src/data/local-sqlite/repositories/
src/data/local-sqlite/local-sqlite-finance-data-source.ts
```

The scaffold is intentionally not wired into app runtime. Do not switch
providers, hooks, or `createFinanceDataSource(...)` to SQLite until a later
milestone explicitly asks for it.

Useful mapping/repository test command:

```powershell
npm.cmd run test -- src/tests/local-sqlite-finance-mappers.test.ts
```

Local SQLite repository writes are intentionally unavailable and should keep
throwing:

```text
Local SQLite write operations are not implemented yet.
```

## Local SQLite Cloud Hydration

Milestone 3A.5 adds an internal hydration module:

```text
src/data/local-sqlite/hydration/
```

The hydrator can copy the current Supabase-backed household projection into
local SQLite using a `FinanceDataSource`, a `LocalSqliteDriver`, and either a
Supabase client or an explicit household snapshot.

It is intentionally not wired into app startup, providers, or UI. Runtime reads
and writes remain Supabase-only.

Useful hydration test command:

```powershell
npm.cmd run test -- src/tests/local-sqlite-hydration.test.ts
```

The optional `runLocalHydrationSmokeTest(...)` helper is guarded with
`import.meta.env.DEV`. Use it only for development experiments after the local
SQLite driver has been initialized and migrations have run.

## Gated Local SQLite Read Mode

Milestone 3A.6 adds a disabled-by-default local SQLite read mode for development
testing.

Default:

```env
VITE_LOCAL_SQLITE_READ_MODE=false
```

To test local reads, set this in `.env.local` and restart Vite:

```env
VITE_LOCAL_SQLITE_READ_MODE=true
```

Expected behavior when enabled:

- Supabase remains the source of truth.
- The app initializes local SQLite after cloud household bootstrap.
- Current household data hydrates from Supabase into SQLite.
- Finance reads use local SQLite repositories.
- Create/update/delete/pay/generate actions still write to Supabase.
- Successful Supabase writes trigger a best-effort local rehydration.
- If SQLite initialization or hydration fails, the app falls back to Supabase.

To disable local read mode, remove the variable or set it back to:

```env
VITE_LOCAL_SQLITE_READ_MODE=false
```

Useful test command:

```powershell
npm.cmd run test -- src/tests/finance-data-source-factory-local-read.test.ts
```

Limitations:

- This is not offline mode.
- Offline writes are not implemented.
- Realtime events invalidate queries as before, but do not yet automatically
  rehydrate SQLite.
- IndexedDB fallback remains in place.

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
