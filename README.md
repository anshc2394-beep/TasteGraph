# TasteGraph

**[Live demo →](https://YOUR-PROJECT.vercel.app/demo)** (no account needed)

A Next.js 16 / React 19 listening dashboard using your real Spotify profile and top music.

## Run locally

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:3000**, choose **Connect with Spotify**, and approve read access. The server must have outbound internet access to `accounts.spotify.com` and `api.spotify.com`.

Keep these server-only variables in the existing, gitignored `.env.local`:

- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `SPOTIFY_REDIRECT_URI`

For this local setup, the redirect URI must be **http://127.0.0.1:3000/api/auth/callback**, exactly matching the registered URI in the Spotify developer dashboard. Never use `NEXT_PUBLIC_` for credentials. No environment values are included in this repository's UI, tests, or logs.

## Features

- Cinematic public product demonstration with ten user-supplied covers, each assigned once through `src/lib/demo-artwork.ts`; they never appear as account data.
- A personalized dashboard hero that assembles the artist constellation, identity typography, and Taste Drift, followed by editorial artist spreads, a featured track sleeve, and an interactive rank journey.
- Self-hosted Barlow Condensed display type and Manrope utility type, a consistent black/green system, and reduced-motion alternatives.
- Profile, top artists, and up to 50 top tracks, linked back to Spotify.
- Instant 4-weeks / 6-months / 1-year switching after the initial fetch.
- Rank-based rising artists, persistent favorites, fading artists, and artist overlap.
- A Taste Drift story, rank-journey chart, and interactive artist constellation, all derived from Spotify's returned rankings and genre tags.
- Taste Drift score with its methodology available directly in the dashboard.
- Responsive layouts, loading skeletons, missing-artwork fallbacks, empty states, partial-data warnings, retry, and reconnect.
- Read-only Spotify permissions: `user-read-private` and `user-top-read`.
- Disconnect clears TasteGraph's cookies. To revoke the Spotify grant completely, remove TasteGraph in your Spotify account's Apps settings.

Spotify's windows are approximate: short term ~4 weeks, medium term ~6 months, long term ~1 year. Results reflect Spotify's affinity rankings, not exact play counts. See [Spotify's top-items reference](https://developer.spotify.com/documentation/web-api/reference/get-users-top-artists-and-tracks).

## Authentication and data flow

`src/proxy.ts` canonicalizes page and API requests to the origin configured in `SPOTIFY_REDIRECT_URI` before cookies are created. A browser arriving on `localhost` is redirected to `127.0.0.1`; redirects never derive their destination from untrusted host values.

The login route creates a random 256-bit OAuth state in a ten-minute httpOnly cookie, then redirects to Spotify. The callback compares state in constant time, exchanges the one-use code on the server, clears state, and redirects to the configured origin's `/dashboard`. Codes, state values, and token responses are never logged; development request logging excludes the callback.

Access and refresh tokens stay in host-only, httpOnly, SameSite=Lax cookies. Access cookies expire slightly before Spotify's token lifetime. Refresh cookies last 30 days. Cookies are Secure on HTTPS; explicit HTTP loopback addresses are supported for local development. All other non-HTTPS redirect origins are rejected.

The dashboard API refreshes an absent or rejected access token, stores any rotated refresh token, and preserves the existing refresh token if Spotify omits it. Invalid refresh grants clear the session; transient failures preserve it. Profile retrieval validates the session before the six top-music requests run concurrently. Unavailable individual sections are marked unavailable, never silently treated as empty. Responses are private and not cached. Logout requires a same-origin POST.

Login uses PKCE (S256) in addition to the client secret, so an authorization code is useless without the verifier held in the initiating browser's httpOnly cookie. On HTTPS deployments every cookie uses the `__Host-` prefix. `src/proxy.ts` sends a per-request nonce Content-Security-Policy (`strict-dynamic`, `frame-ancestors 'none'`, images only from Spotify's CDNs), HSTS on HTTPS, and `Permissions-Policy`, `X-Frame-Options`, `nosniff`, and `no-referrer` headers.

## Live demo

Spotify limits Development Mode apps to a few allowlisted accounts, so visitors explore `/demo` instead: the real dashboard rendering a fixed, anonymized snapshot, with no cookies and no Spotify calls. To refresh it:

1. Run locally, sign in, open `http://127.0.0.1:3000/api/spotify/dashboard`, and save the response as `snapshot.raw.json` in the project root (gitignored).
2. Run `npm run demo:build`. `scripts/make-demo.mjs` replaces the profile with "Demo Listener", keeps only the fields the UI renders, accepts images only from Spotify's CDNs, and refuses to write if your user id, name, photo, or profile link would survive.
3. Delete `snapshot.raw.json`, then commit `src/data/demo-dashboard.json`.

Until then, `/demo` shows labeled sample data.

## Deploying

1. Push to GitHub. `.env*` and `snapshot.raw.json` are ignored; enable GitHub secret scanning and push protection.
2. Import the repo in Vercel. Add `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` (mark it Sensitive), and `SPOTIFY_REDIRECT_URI=https://<your-domain>/api/auth/callback`, scoped to **Production** only. Never prefix them with `NEXT_PUBLIC_`.
3. In the Spotify developer dashboard, add that exact redirect URI and allowlist the accounts that may sign in.
4. In Vercel, keep Deployment Protection on for previews, don't add log drains, and enable 2FA on GitHub, Vercel, and Spotify.
5. Verify: sign in on the live URL, open `/demo` in a private window, and check headers at securityheaders.com.

## Analytics

All metrics are computed from up to 50 unique artists in each window, with no historical snapshots or database.

- **Rising:** recent top 20, up at least five positions versus long term, or absent from the long-term top 50.
- **Persistent:** top 20 in all three windows, ordered by average rank.
- **Fading:** long-term top 20, down at least five positions recently, or absent from the recent list.
- **Overlap:** shared artists / unique artists across the two lists (Jaccard similarity).
- **Taste Drift:** 100 × (1 − weighted Jaccard similarity). Weights are `1 / log2(rank + 1)`, normalized within each list. Identical ranks score 0; disjoint artists score 100. The selected window's displayed score averages its distance from each of the other two windows; the baseline `drift` metric remains the short-versus-long comparison.

Empty or missing artist windows produce no analytics score. Small samples are flagged. These are descriptive heuristics over overlapping windows, not evidence that an artist has gained or lost actual listening minutes. “New” means newly present in the compared list. The rank journey compares overlapping Spotify windows, not historical snapshots; constellation links denote shared first genre tags, not measured listening relationships. The range switch changes top music and the selected drift lens; analytics always compare all three windows.

## Project structure

- `src/lib/spotify/`: typed data contracts, configuration, Spotify requests, and cookie lifecycle.
- `src/lib/analytics.ts`: pure, independently tested rank comparisons.
- `src/app/api/auth/`: login, callback, and logout.
- `src/app/api/spotify/dashboard/`: authenticated data and token refresh.
- `src/components/`: dashboard, listening insights, shared presentation, and loading UI.
- `src/components/dashboard-hero.tsx`, `taste-graph.tsx`, and `rank-journey.tsx`: independent, interactive data compositions. `music-motion.tsx` centralizes animation presets and number/title primitives.
- `src/app/product.css`: current typography, dashboard compositions, and responsive rules. The landing retains its composition in `cinematic.css` and `dark-direction.css`.
- `src/lib/demo-artwork.ts` and `public/covers/`: explicit public-demo artwork assignments. No cover is repeated across the landing compositions.
- `src/app/demo/`, `src/data/demo-dashboard.json`, and `scripts/make-demo.mjs`: the anonymized public demo and the sanitizer that builds it.
- `src/app/privacy/`: what TasteGraph reads, keeps, and how to revoke access.
- `tests/`: OAuth/session, security-header, demo-sanitizer, and analytics regression tests.

## Verification

```powershell
npm test
npm run lint
npm run build
```

Tests use dummy credentials and mocked network responses; they never read `.env.local` or contact Spotify. A real login is still required to verify Spotify account access.
