# SnapIt project audit

Reviewed 13 November 2026 (Asia/Kolkata).

The latest checks pass: 117 regression tests, 50 isolated HTTP checks, frontend lint, production build, and browser smoke checks. Both package dependency audits report zero known vulnerabilities. Database connectivity, live backend checks, and saved-place integration checks now pass; the earlier TLS blocker is resolved. Google Translate still needs configuration.

## Issues fixed

| Area | Problem found | Change |
| --- | --- | --- |
| Uploaded file safety | Place cleanup could resolve a stored image path outside the uploads directory. | Places and trips now share a backend utility that only accepts filenames inside `Backend/uploads/images`. Invalid paths are ignored during cleanup. |
| Public profile privacy | The public user list included email addresses and IDs of private trips. | The response now selects only public profile fields and place IDs. |
| Place permissions | Editing/deleting another user's place returned 401, which could trigger session expiry. | Ownership failures return 403. Missing places still return 404. |
| Duplicate accounts | Existing emails and duplicate names could return server errors. | Duplicate accounts return HTTP 409 with a useful message. |
| Request validation | Malformed IDs, non-text fields, invalid coordinates, dates, expense arrays, and itinerary JSON could cause 500s or unintended coercion. Requests without a body could also crash controllers. | Router ID validation, normalized empty bodies, and shared backend input parsing reject invalid data with client errors. Zero coordinates remain valid. |
| Stop photos | An edit could retain ten photos and add another ten. Frontend/backend size limits differed, and Multer error codes were treated as server errors. | The combined stop limit is ten photos; both limits use 5 MiB per photo. Upload size/count errors return HTTP 400. |
| Saved trip/stop data | A successful save followed by a failed summary read could delete the saved trip/stop and leave references behind. | Cleanup rolls back only uncommitted records. A failed response read preserves saved records and their uploaded photos. |
| HTTP request state | Concurrent requests could hide the loading indicator early; completed controllers remained registered; empty successful responses failed JSON parsing. | The request hook tracks every pending request, cleans up in `finally`, handles 204 responses, reports unreadable responses, and cancels work on unmount. |
| Active trip state | A delayed response could restore a stopped trip or a previous session's trip. | Active-trip refreshes are cancelled/versioned; local trip changes invalidate pending refreshes. |
| Session handling | Blocked browser storage could crash authentication or create a reload loop. An old token's delayed rejection could sign out a newer session. | Storage access is guarded, and session rejections identify the token they belong to. Existing expiry/navigation behavior is retained. |
| Trip drafts | Storage quota/privacy restrictions could interrupt draft saves or successful trip actions. | Optional draft writes/removals are guarded inside the frontend utility. |
| Photo previews and GPS | FileReader completion order could reorder selected images. Old callbacks could replace new previews; older EXIF work could overwrite a new photo selection's GPS. | Preview order follows selection order, obsolete readers are cancelled, and stop GPS extraction checks the current selection. |
| Translation state | Changing languages quickly could show the previous language's delayed response. | Place details, trip feed cards, and trip review only apply the latest translation response. |
| External providers | Geocoding/translation requests could wait indefinitely or expose raw provider failures. | Both use ten-second timeouts, validate provider responses, and return useful errors. Missing configuration returns 503. |
| Page navigation | Switching between parameterized place/user/trip routes could retain another page's local state. | Pages remount when their relevant ID changes. The active-trip page only initializes from a matching context trip. |
| Browser/API connection | Opening the frontend through `127.0.0.1` lacked CORS support, and malformed JSON errors lacked CORS headers. | Both local origins are allowed by default. CORS runs before JSON parsing; deployments can set `FRONTEND_ORIGINS`. |
| Dependencies and build | The original audits found 11 backend and 53 frontend advisories, including critical findings. The old React build tool left advisories after compatible updates. | Updated compatible dependencies, removed unused packages, and replaced `react-scripts` with Vite. Added explicit test/lint dependencies. Final audits: zero in each package. |
| Development startup | Backend startup pointed `main` to a missing file; native Node watching later missed edits made from Windows while running in WSL. | Declares its development watcher locally, uses polling for mounted Windows/WSL files, and provides a separate production start command. `main` and Node engine requirements match the application. |

Tests stay in `Backend/tests`; no separate validation folder was added. The existing card artwork, achievement styling, themes, navigation choices, and short local session expiry were preserved. Browser checks confirmed that all five card images load after the build-tool migration.

## Verification

| Check | Result |
| --- | --- |
| `npm test` | **128/128 pass**: 32 backend, 46 frontend, 38 trip, 12 saved-place checks, including nested cases |
| `npm run test:api` | **51/51 pass** using the real Express routes with database/provider effects mocked |
| `npm run build` in WSL | Pass; ESLint reports zero warnings/errors and Vite produces `Frontend/build` |
| Headless Edge, development server | Pass: home, theme toggle/persistence, authenticated dashboard, all five card images, card click, 390px layout fit, authenticated deep-route refresh; no page errors |
| Headless Edge, production preview | Same browser checks pass against the generated build |
| `npm --prefix Backend audit` | **0 vulnerabilities** |
| `npm --prefix Frontend audit` | **0 vulnerabilities** |
| Backend source/test syntax | All checked `.js`/`.cjs` files pass `node --check` |
| Git whitespace check | Pass with CRLF line endings accounted for |
| `npm run test:database` | Pass: live MongoDB connection and active-trip uniqueness index |
| `npm run test:live` | **8/8 pass**: actual startup/index initialization, public reads, and authentication rejection for protected saved-place/collection routes |
| `npm run test:running` | **7/7 pass** against the backend already serving the browser on localhost:5000 |
| `npm run test:production` | **16/16 pass**: real production static/HTTP handling, mocked database, health/readiness, routing, cache policies, and graceful shutdown |
| `npm run test:saved-database` | Pass: real MongoDB collection/save/move/rename/removal operations in an always-aborted transaction; fixture absence verified afterward |

Browser checks used fixture API responses. Connectivity diagnostics were read-only; the live harness performed normal index initialization and GET requests. The new saved-place integration check used isolated fixture documents inside one transaction, then aborted it and verified that no fixture users or places persisted. Existing account and application documents were not modified. Secrets were not printed or changed. Known-vulnerability results describe the npm advisory database at review time.

## Outstanding external issues

1. **MongoDB connection — resolved at the feature follow-up:** earlier checks returned `ERR_SSL_TLSV1_ALERT_INTERNAL_ERROR` after successful public DNS resolution. The latest database, live API, and rollback-only saved-place integration checks all pass. Database credentials and account/network settings were not changed by this work; the precise cause of the earlier remote/network failure remains unconfirmed.
2. **Google Translate:** `GOOGLE_TRANSLATE_API_KEY` is absent from the backend configuration. Translation returns a clear 503 until a working key is supplied and the backend is restarted. `MAP_API_KEY` is present; geocoding behavior was tested with mocked provider responses, without making paid provider calls.

## Running after the changes

Use Node 24.15 or newer in the 24.x release line; this review used Node 24.16.0. Frontend test dependencies also support Node 22.22.2+ in the 22.x line and Node 26+. Backend alone requires Node 20.19+.

```powershell
npm --prefix Backend ci
npm --prefix Frontend ci
npm run start:backend
```

In another terminal:

```powershell
npm run start:frontend
```

Frontend development remains on port 3000, backend defaults to 5000, and the production output remains `Frontend/build`. Existing `REACT_APP_BACKEND_URL` and `PUBLIC_URL` configuration names remain supported. Production hosting must serve `build/index.html` for client-side routes. Restart an older running frontend process to load the new tooling.

The Vite configuration follows the official [configuration reference](https://vite.dev/config/shared-options.html) and [JavaScript transform API](https://vite.dev/guide/api-javascript.html), including support for the project's existing JSX inside `.js` files.

## Layout and UI follow-up

Checked 13 November 2026 using populated browser fixtures, including long unbroken titles, addresses, URLs, author names, comments, and large counts.

| Finding | Fix |
| --- | --- |
| Dashboard selected-place headings and comments forced flex children wider than their columns. Descriptions and large engagement counts also spilled. | Flexible text columns now shrink correctly; long text wraps, statistics use bounded columns, and engagement bars leave room for their values. Large dashboard totals use compact notation with the full count available in the title. |
| Long stop titles extended beyond the trip timeline. | Stop content can shrink within the grid, and titles wrap inside the card. |
| Long post titles displaced the modal close button; captions, descriptions, and comments overflowed internally. | The modal title truncates while the complete title remains in the details. Caption text is limited to two lines; body text wraps. |
| A tall portrait could consume almost the entire mobile post preview. | Portraits remain fully visible within a height bounded by the viewport. The slider reports its actual rendered height so the desktop details panel stays aligned. |
| Duplicate hide/close buttons cluttered an already-expanded post preview. | The preview uses its single dialog close button. The separate expandable-card controls remain available outside the dialog. |
| Translation and comment controls were cramped on narrow screens. | Translation controls stack, comment controls wrap when necessary, and mobile detail padding is tighter. |
| Modal widths based on `vw` could extend into reserved scrollbar space. | Dialog widths use the available container width; dynamic viewport height bounds their vertical size. Stable scrollbar space prevents layout jumps when opening dialogs. |
| Background scrolling and keyboard focus could escape a modal. | Open dialogs lock background scrolling, contain Tab focus, close the topmost dialog with Escape, and restore focus and scrolling after closure. Nested map dialogs were checked. Explicit transition refs also remove the deprecated DOM lookup warning. |
| Navigation could become unreachable in short windows. | The mobile drawer scrolls within the viewport, and the desktop icon rail uses tighter spacing in short windows. |

The existing serif headings, monospaced annotations, violet accent, light/dark palettes, and black playing-card faces were retained.

Verification covered 13 screens/states: All places, dashboard, user journal, place creation/editing, trip creation/progress/review, nearby places, the creation panel, post details, login, and signup. Widths checked were 320, 390, 640, 641, 768, 850, 901, 1024, 1199, 1200, and 1440px, with light-mode checks at mobile and desktop sizes. No unexpected horizontal container overflow remained in the checked fixtures. Short-window navigation was also checked at 844×390 and 1280×320. Modal focus, nested Escape handling, and scroll restoration pass. All 93 regression tests, lint, and the production build pass after these changes. These browser checks use fixture API responses and do not modify live records.

## Saved places and achievement features

- **Next card to unlock:** the achievement section shows the closest unfinished milestone, its remaining requirement, and a progress bar outside the playing-card faces. A complete deck receives its own state.
- **New-card reveal:** newly earned artwork brightens with a brief accent sweep and a text announcement. Per-account history prevents replay on each visit; the first view establishes a baseline for existing achievements. Navigation's existing analytics refresh also updates an open dashboard. Reduced motion keeps the announcement and skips animation. Locked fronts remain dim, and fronts still contain only the card artwork.
- **Saved places:** a bookmark control in place details opens a collection picker. A place can be saved to Unsorted or a named collection, moved later, or removed from the saved library.
- **Private collections:** `/saved` is available from the signed-in navigation rail/drawer. Users can filter collections, create and rename them, and remove them. Removing a collection also unsaves all places in that collection. Other collections and Unsorted keep their saved places. Saving the same place repeatedly does not duplicate it. Unavailable/deleted places are omitted on the next library load.
- **Backend persistence:** collections and bookmark references are embedded in the owning User document. Every endpoint derives ownership from the authenticated session. Collection names are normalized and unique within an account; IDs and input types are validated. Existing users receive empty defaults without a migration.
- **Build reliability:** the missing Windows Rolldown binding is recorded as an optional frontend dependency so Windows installations include it. Other platforms can skip that package.

Authenticated API routes are under `/api/users/me/saved`: `GET /`, `PUT /:pid`, `DELETE /:pid`, `POST /collections`, `PATCH /collections/:cid`, and `DELETE /collections/:cid`.

Verification: all 105 regression tests and 50 isolated HTTP checks pass. Added checks cover account isolation, repeated/concurrent saves, moving/removing bookmarks, collection rename/delete behavior, invalid names and IDs, deleted-place references, real Mongoose query casting, next-goal selection, first-visit behavior, one-time reveals, and failed-save state preservation. The production build and lint pass. Development and production browser flows pass at 320, 390, 768, and 1440px across light/dark mode, including refresh persistence, reduced motion, and deliberately long content without overflow. Live database and backend checks pass. The explicit saved-place database test verifies all key operations against MongoDB, always aborts the transaction, and confirms that no fixtures persisted.

## Bug check after the feature additions

The original 105 tests passed at the start of this check. Additional edge-case tests exposed defects that were then fixed:

| Problem | Fix |
| --- | --- |
| Saved place details stayed stale after editing or deleting a place elsewhere in the app. | Successful edits and deletions update the saved library immediately. Opening Saved and returning to a visible tab also refresh current server data. In-flight older reads cannot undo a local change. |
| Old saved-place callbacks could send another request after sign-out/unmount, including the second step of creating a collection and saving a place. | Actions check that their provider and session are still active before sending requests and before applying responses. Ended-session actions abort rather than continuing into the next step. |
| Overlapping analytics polls could apply an older response, and the dashboard's initial load could overwrite a newer poll. | Navigation publishes only its latest analytics request. The dashboard versions incoming analytics and ignores an older initial result. This also prevents progress from briefly going backward and triggering repeated reveals. |
| Concurrent library reads duplicated work; refreshing could interrupt an open preview or hide cached places on failure. | Reads are deduplicated, background refreshes stay quiet, and cached cards/previews remain available with a retry message when refresh fails. |
| A collection deleted elsewhere left stale rename/delete controls or an unusable selected collection in the save picker. | Missing collections close obsolete editing controls and reset the page selection. The picker falls back to Unsorted. HTTP 404/409 responses trigger a library refresh before retrying. |
| The HTTP hook discarded status codes, preventing callers from distinguishing conflicts from network failures. | Rejected responses retain their HTTP status for recovery decisions. |
| Re-saving/moving a place returned a new save timestamp even though the stored bookmark kept its original timestamp. | Responses use the existing bookmark's saved date. |
| Valid uppercase collection IDs were rejected during ownership comparisons. | Save/rename operations normalize those IDs before comparison and return canonical IDs. |

Verification after the fixes: **117/117 regression tests**, **50/50 isolated API checks**, lint, and the production build pass. Real-browser scenarios pass in dark mode at 320px and light mode at 1440px, covering edits with a delayed older library read, deletion from Explore, remote collection removal, conflict recovery, offline refresh with an open preview, and deliberately out-of-order analytics. Live backend GET checks pass. The rollback-only MongoDB integration check also passes with uppercase IDs and timestamp preservation assertions; no fixture records persisted. The local installation's missing optional Windows build package was restored from the existing dependency configuration. Existing user uploads were preserved.

## Save dialog failure — 14 November 2026

The browser's running backend returned HTTP 404 with `something unexpected happen` for `GET /api/users/me/saved`. The frontend consequently could not load the library and disabled saving. Both servers used the current project folder, but the WSL backend's native Node watcher still had older routes loaded after Windows edits. Starting a separate server in earlier tests had not detected that stale process.

The outdated backend was stopped and the current backend is now running in the background on Windows Node at port 5000. The replacement WSL process did not become ready during the restart; Windows startup and MongoDB checks pass. Development startup now uses a locally installed, audit-clean nodemon version with polling, restricted to backend source/configuration paths. Production startup uses `npm --prefix Backend run start:production` without a development watcher.

Added `npm run test:running` to check the server already serving the browser. It reproduced the original missing-route failure before restart and passes all seven checks afterward. The live startup suite now also checks the saved-library, collection-create, and place-save endpoints reject unauthenticated requests. Changing a route file's timestamp from Windows triggered an automatic reload and the saved-place route remained registered afterward.

Verification in this follow-up: **117/117 regression tests**, **50/50 isolated HTTP checks**, **8/8 live startup/API checks**, **7/7 running-server checks**, and the rollback-only MongoDB collection/save/move/rename/delete integration check pass. Installation reports zero known backend dependency vulnerabilities. No existing account, place, bookmark, collection, or upload was changed. The app can reload the library by refreshing or using the save dialog's **Try again** control.

## Removing a collection also unsaves its places — 14 November 2026

Collection removal now removes the collection and all bookmark references assigned to it in one atomic update to the owning user. Other collections, Unsorted bookmarks, and the original published places remain intact. The frontend removes those bookmarks after a successful response, immediately updates counts and bookmark controls, and returns to All saved. Failed requests retain the collection and its bookmarks. The confirmation explains that the collection's places will also be unsaved; the missing-collection message now refers to remaining saved places.

Added coverage for multiple affected places, unrelated collections and Unsorted, empty/missing/foreign collections, uppercase IDs, deletion failures, confirmation wording, counts, and the return to All saved. The rollback-only MongoDB test also verifies deletion against actual ObjectId fields and confirms original places remain available.

The running WSL frontend was serving cached older modules after Windows edits. Vite now polls when running in WSL, and that server was restarted. Both updated components are now served by localhost:3000. A temporary standalone module verified that a subsequent Windows edit invalidates Vite's cached response; the probe was removed afterward.

Verification: **120/120 regression tests**, **7/7 running-backend checks**, and the rollback-only MongoDB checks pass. Lint and the production build pass in the frontend's existing WSL environment. A Windows build attempt lacked the Windows native Rolldown binding in the current Linux dependency installation; dependency files were left unchanged, and verification used the installed Linux binding. Existing user records and uploads were not changed by testing.

## Final bug pass — 14 November 2026

| Finding | Fix |
| --- | --- |
| Valid JSON with malformed draft fields could crash trip forms (`trim`, `map`, or `reduce` on the wrong type). | Draft loading now restores known fields with safe types, retains valid text, itinerary entries, and expenses, and replaces invalid values with editable defaults. Previously fetched location data is still excluded when restoring a trip draft. |
| Repeated form submissions could send duplicate trip-start or stop-save requests before the loading state rendered. | Immediate submission guards block overlapping requests. Stop saving also shows its pending state, and failures release the guard while retaining entered details and selected photos for retry. |
| A non-JSON error response discarded its HTTP status, preventing callers from recognizing errors for recovery. | Unreadable responses keep their HTTP status alongside the readable error message. |
| Uppercase ObjectId strings bypassed the self-follow comparison. | Following compares canonical user IDs before doing database work; the HTTP suite checks the uppercase case. |

Final verification: **124/124 regression tests**, **51/51 isolated HTTP checks**, **8/8 live startup checks**, **7/7 running-backend checks**, and the rollback-only MongoDB saved-place/collection checks pass. Lint and the production build pass in WSL. Both npm audits report **zero known vulnerabilities**.

Headless Edge checks at 390px verify collection deletion and remaining counts, malformed trip/stop draft recovery, repeat-submit guards for both forms, stop-form reset after success, and no page errors or horizontal page overflow in the checked flow. Browser API responses were fixtures; database integration fixtures were rolled back and their absence verified. The temporary browser harness was removed. Existing records and uploads were preserved.

Configuration still required: `GOOGLE_TRANSLATE_API_KEY` is absent. Translation continues to return a clear 503 until that key is configured. The requested short local session lifetime remains unchanged.

## Deployment preparation — 14 November 2026

- Added a production entry point and root `npm start`. Production serves the built frontend and API together, supports SPA deep-route refreshes, and keeps API/image/asset 404s separate from the HTML fallback. API/health responses prevent caching; hashed assets are immutable, and the HTML shell is revalidated.
- Production frontend URLs default to the site's origin. The tracked frontend `.env` now contains configuration guidance; its existing local API setting is retained in ignored development-only configuration. Explicit backend origins remain supported for separate frontend hosting.
- Added liveness/readiness endpoints, request draining on SIGTERM/SIGINT, database disconnection during shutdown, signing-secret validation, and redaction of unexpected production errors. Development session expiry remains short; production configuration uses a one-hour lifetime.
- Added `.env.example` files, Node version selection, ignore rules, and GitHub Actions verification. Fresh upload directories are created when needed.
- Rewrote the README to explain account/session handling, places and private collections, trip lifecycle, achievement thresholds, data/API structure, local setup, environment variables, production deployments, persistence, and verification.

Verification: **128/128 regressions**, **51/51 isolated API checks**, **16/16 production checks**, **8/8 live startup checks**, **7/7 running-backend checks**, lint, and the WSL production build pass. A separate production-mode server successfully connected to the configured MongoDB instance, served `/saved`, reported ready, and enforced saved-place authentication using read-only requests. The first isolated check used a temporary signing key; a final check also passed with the prepared production configuration itself. No account data was changed.

Headless Edge loaded the actual production bundle at 390px, refreshed an authenticated deep route, loaded all five card assets after scrolling them into view, and sent every checked API request to the deployment origin. API responses in that browser check were fixtures. Relative imports in 106 application source files passed exact filename-casing checks. CI workflow configuration passed parsing in WSL. Temporary check scripts were removed; existing uploads were preserved.

Before hosting, supply the deployment's database URI, strong JWT secret, domain/allowed origins, durable uploads, and provider keys as described in the README.

The existing development signing key was too short for production. One ignored `Backend/.env` now holds the existing development values and production-specific overrides, including a generated signing key, a one-hour lifetime, and the localhost:8080 allowed origin. `Backend/.env.example` documents both sets without secrets. Hosting-provider environment variables take precedence. The development key and sessions were preserved. No secret values were printed or added to Git. Set the public domain/origin before using those public-host features.
