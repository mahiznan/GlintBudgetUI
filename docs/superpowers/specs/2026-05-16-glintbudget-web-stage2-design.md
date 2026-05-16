# GlintBudget Web — Stage 2 Design

**Status:** Design drafted 2026-05-16 — **awaiting owner review** before implementation planning.
**Companion iOS project:** `/Users/rajeshkumar/workspace/GlintBudget` (SwiftUI + Firebase — source of truth for data models and Firestore schema)
**This project (web):** `/Users/rajeshkumar/workspace/GlintBudgetUI`
**Stage 1 spec:** `docs/superpowers/specs/2026-05-16-glintbudget-web-stage1-design.md`
**Production URL:** `https://budget.learnerandtutor.com`

---

## 1. Scope

Stage 2 ships **Firebase SDK + Authentication UI + React Router as a read-only shell**. No transaction CRUD (Stage 3), no preferences sync (Stage 4), no reports (Stage 5), no PWA (Stage 6). The dashboard exists, but it is a placeholder that proves auth + protected routing work end-to-end.

## 2. Auth providers

**Google only** for Stage 2. The iOS app supports Google, Apple, Email/Password, and Anonymous; the web will add the others in later stages. Rationale: Google Sign-In is the lowest-setup web provider (popup via Firebase Auth's `GoogleAuthProvider`), most existing iOS users likely chose it, and we avoid Apple's web-specific configuration burden (Service ID, return URL, private key in Firebase console) until we need it.

**Sign-in flow:** `signInWithPopup`. Simplest code, snappiest desktop UX, no SPA reload. If popup-blocked or mobile-browser-incompatible cases surface in usage, we can add `signInWithRedirect` as a fallback in a follow-up. Out of scope for Stage 2.

## 3. Route shape

| Path             | Public?   | Purpose                                                                                 |
| ---------------- | --------- | --------------------------------------------------------------------------------------- |
| `/`              | public    | Marketing landing page (current Stage 1 page). Always served at this URL.               |
| `/signin`        | public    | Google sign-in button. On success → redirect to `/app`.                                 |
| `/app`           | protected | Read-only dashboard shell. If accessed while signed out → redirect to `/signin`.        |

- The landing-page CTA flips based on auth state: signed-out → "Sign in" (links to `/signin`); signed-in → "Open dashboard" (links to `/app`).
- The landing page itself is **not** auto-redirected for signed-in users; `/` stays as the marketing surface even when authenticated. Rationale: keeps marketing vs. product surfaces cleanly separated; a signed-in user can re-share the marketing URL without it bouncing to their private dashboard.
- Router: **React Router v7** (data router APIs). The `.htaccess` SPA fallback shipped in Stage 1 already supports any future deep route under `/app/*` — no infra changes needed.

Future stages will add nested routes under `/app` (e.g., `/app/transactions`, `/app/reports`, `/app/settings`).

## 4. Dashboard MVP (the protected `/app` page)

Minimal placeholder, deliberately small to avoid locking in layout before Stage 3:

- **Top bar:** GlintBudget wordmark on the left; user avatar + name + dropdown on the right. Dropdown contains "Sign out".
- **Body:** a welcome card (`Welcome back, <name> 👋`) and a short note that Transactions / Reports / Preferences are coming in later stages.
- No sidebar nav, no Firestore reads beyond what Firebase Auth gives us about the current user (uid, name, email, photoUrl).

Rationale: lowest risk of rework. Stage 3 will redesign this surface once CRUD lands; pre-building sidebar nav or a Firestore-backed preferences read now would either be thrown away or constrain Stage 3's choices.

## 5. Firebase configuration

Web Firebase config (`apiKey`, `authDomain`, `projectId`, `appId`, `messagingSenderId`, `storageBucket`) lives in **Vite environment variables** prefixed `VITE_FIREBASE_*`. (Firebase web config is **not** a secret — it ships to every browser. The security boundary is Firestore rules, which live in the iOS repo.)

- **Local dev:** `.env.local` (gitignored) holds dev-project values.
- **CI/CD:** GitHub Actions secrets (`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, ...) injected as `VITE_FIREBASE_*` env vars in the build step.
- **No `.env.example` committed** with real values — committed `.env.example` may list variable names only.

Choosing env vars (over committing a config file) makes future dev/staging/prod project splits cheap.

## 6. Bundle / performance strategy

Firebase Auth SDK is ~70-90 KB gzipped. To honor Stage 1's "lightning fast" landing-page commitment:

- **`/` route loads zero Firebase code.** The landing page stays at its current size — Stage 1 budget (initial payload < 50 KB gzipped) holds.
- **`/signin` and `/app` lazy-load Firebase** via dynamic import (`React.lazy` + `Suspense`). Each route gets its own chunk; Firebase becomes a shared async chunk used only by those two routes.
- **Stage 2 budget additions:**
  - `/` (landing): unchanged — **< 50 KB gzipped initial** (same as Stage 1).
  - `/signin` + Firebase shared chunk: **< 150 KB gzipped combined initial load** on cold cache.
  - `/app` (with Firebase already cached from `/signin`): **< 60 KB gzipped** for the route chunk itself.
  - Lighthouse Performance for `/` must remain ≥ 95.

This matches the Stage 1 cache strategy: hashed chunks get `Cache-Control: public, max-age=31536000, immutable`; the user pays the Firebase download cost exactly once until a new release ships.

## 7. Testing strategy

- **Vitest + React Testing Library only**, same as Stage 1.
- `firebase/auth` is mocked via `vi.mock('firebase/auth', ...)` in tests that touch auth-dependent components. Tests can flip the mocked `onAuthStateChanged` callback to simulate signed-in / signed-out / loading states.
- **No Firebase Auth Emulator** in CI (avoids the Java dep and ~30s extra test time).
- **No Playwright / E2E** in Stage 2. The Stage 1 spec deferred E2E "once auth lands"; we are deferring further until Stage 3 (transaction CRUD), where there is real state worth exercising end-to-end.
- Every new component sits in `src/components/<Name>.tsx` with a co-located `<Name>.test.tsx` (Stage 1 convention).

## 8. Architecture (proposed — pending design review)

### 8.1 Module layout

The existing Stage 1 `App.tsx` (which composes Header + Hero + FeatureStrip + Footer) is **extracted into `src/routes/Landing.tsx`** unchanged. `App.tsx` becomes the router + `<AuthProvider>` wrapper. No component code changes inside Landing — only its file location and its CTA wiring (Header reads `useAuth()`).

```
src/
├── main.tsx
├── App.tsx                           # Router setup, top-level <AuthProvider>
├── firebase/
│   ├── client.ts                     # initializeApp(); exports app + auth instances
│   └── auth.ts                       # signInWithGoogle(), signOut() thin wrappers
├── auth/
│   ├── AuthContext.tsx               # React context: { user, status }
│   ├── AuthProvider.tsx              # subscribes to onAuthStateChanged, hydrates context
│   ├── useAuth.ts                    # hook returning AuthContext
│   ├── RequireAuth.tsx               # route guard: redirects to /signin if anon
│   └── *.test.tsx
├── routes/
│   ├── Landing.tsx                   # = current Stage 1 App composition; lifted from App.tsx
│   ├── SignIn.tsx                    # Google sign-in button + loading/error UI
│   └── AppShell.tsx                  # Top bar + welcome card (the /app page)
├── components/
│   ├── Header.tsx                    # existing; CTA becomes auth-aware
│   ├── Hero.tsx
│   ├── FeatureStrip.tsx
│   ├── Footer.tsx
│   └── UserMenu.tsx                  # NEW: avatar + dropdown w/ Sign out
└── styles/index.css
```

### 8.2 Auth state model

Single React Context holding:

```ts
type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthState =
  | { status: "loading"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: BudgetUser };

type BudgetUser = {
  uid: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
};
```

`AuthProvider` subscribes once to `onAuthStateChanged` on mount; the rest of the app reads `useAuth()`. No Zustand / Jotai / Redux — Context is sufficient for a single global value that changes infrequently.

The web `BudgetUser` shape is **intentionally a subset** of the iOS `BudgetUser` (which includes `isAnonymous`, `createdDate`, `isPremium`, `preferences`, `favoriteMovie`). Stage 2 only needs identity fields that Firebase Auth gives us synchronously; the additional fields require Firestore reads from `/users/{uid}` and land with Stage 3 / Stage 4. Field names match the iOS `CodingKeys` (e.g., `user_id`, `photo_url`) when reading from Firestore later.

### 8.3 Data flow

1. App boot: `<AuthProvider>` mounts, subscribes to `onAuthStateChanged`. Status = `"loading"` until the first callback fires.
2. **Anonymous:**
   - Visiting `/` → Landing page renders with "Sign in" CTA.
   - Visiting `/app` → `<RequireAuth>` redirects to `/signin`.
   - Visiting `/signin` → SignIn page renders Google button.
3. **Click "Sign in with Google":** `signInWithPopup(auth, googleProvider)` → on resolve, `onAuthStateChanged` fires with the new user; AuthContext flips to `"authenticated"`; SignIn page redirects to `/app`.
4. **Authenticated:**
   - Visiting `/` → Landing page renders with "Open dashboard" CTA.
   - Visiting `/app` → AppShell renders welcome card + user menu.
   - Click "Sign out" in UserMenu → `signOut(auth)` → context flips to `"anonymous"` → router redirects to `/`.

### 8.4 Loading and error states

- **`status === "loading"`** (initial app boot, ~1 frame in practice):
  - `/` renders Landing with the CTA in a "loading skeleton" state (or simply hidden) to avoid CTA flicker.
  - `/app` shows a spinner; `<RequireAuth>` waits before deciding to redirect (does not redirect while loading).
- **Sign-in popup errors:**
  - `auth/popup-closed-by-user` → silent (user cancelled, no message needed).
  - `auth/popup-blocked` → inline message: "Popup blocked. Please allow popups for this site and try again."
  - Network / unknown errors → generic message: "Sign-in failed. Please try again." with a retry button. No raw error message exposed to user.
- **Sign-out errors:** rare; treat as no-op with a console warning.

## 9. Performance budget (Stage 2)

| Surface                                   | Target              |
| ----------------------------------------- | ------------------- |
| `/` initial payload (HTML + CSS + JS)     | < 50 KB gzipped     |
| `/signin` cold load (incl. Firebase)      | < 150 KB gzipped    |
| `/app` cold load (with Firebase cached)   | < 60 KB gzipped     |
| Lighthouse Performance (`/`)              | ≥ 95                |
| Lighthouse Accessibility (`/`, `/signin`, `/app`) | ≥ 95        |
| Lighthouse Best Practices (all routes)    | ≥ 95                |

These are gates the implementation plan should verify before claiming Stage 2 done.

## 10. CI/CD changes

- Add required GitHub Actions secrets: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_STORAGE_BUCKET`.
- Update `.github/workflows/deploy.yml` build step to pass them as `VITE_FIREBASE_*` env vars.
- No other CI changes (no Playwright, no emulator).

## 11. Out of scope for Stage 2 (deliberate)

- Apple, Email/Password, and Anonymous sign-in (future stages).
- `signInWithRedirect` fallback for blocked-popup environments.
- Transaction CRUD (Stage 3).
- Preferences sync (Stage 4).
- Reports / charts (Stage 5).
- PWA / offline (Stage 6).
- E2E tests (Stage 3 at earliest).
- Account linking / multi-provider flows (post-MVP).
- Sign-up of new accounts via Email/Password (not relevant — Stage 2 is Google-only).

## 12. Session-resume cheat sheet

If a fresh Claude (or human) session opens cold on Stage 2 work:

1. Read this spec.
2. Read `CLAUDE.md`.
3. `git log --oneline -20` to see where work stopped.
4. Check the in-progress plan in `docs/superpowers/plans/` for unchecked tasks.

Key decisions already locked: Google-only auth, `signInWithPopup`, `/`-`/signin`-`/app` routes, lazy-loaded Firebase, env-var config, Vitest-only testing, no E2E yet. Do not re-litigate without explicit owner direction.
