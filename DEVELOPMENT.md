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
