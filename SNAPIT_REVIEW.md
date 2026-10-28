# SnapIt fixes and validation

Updated 28 October 2026 (Asia/Kolkata).

Project: `C:\MERN PROJECT\Social-Networking-app`.

## Result

The reported application defects are fixed. All 52 regression checks, 26 isolated API checks, 5 live backend checks, and the database connectivity/index checks pass. The production build also passes with CI enabled and no ESLint warnings.

The prior deletion of `Backend/.env.example` and modification of `Frontend/package-lock.json` were preserved. No dependency versions were changed. The backend's ignored `.env` gained only the project-local DNS setting described below. No test accounts or application documents were created, changed, or deleted during verification.

## UI refresh

SnapIt now uses a travel photo-journal visual style. Its dark palette, violet signature, script wordmark, and masonry feed are retained, with warm off-white type, serif display headings, small monospaced annotations, restrained green markers, and thin rules.

- **Navigation:** labeled desktop rail, clearer active states, a new-entry action in the rail, a signed-out join action in the header, a dedicated mobile search row, and Escape-to-close for the mobile drawer. Nearby is available in the feed controls and mobile drawer rather than the icon rail.
- **Feed:** editorial journal introduction, working All places / Near you controls, numbered photo frames, more readable captions, and quieter hover cues.
- **Post details:** larger desktop photo area, more distinct title/author/address hierarchy, calmer modal styling, stronger touch targets, and the existing Google search action.
- **Forms and authentication:** a journal-style sign-in composition, consistent labels and controls, dashed photo trays, clearer states, and corrected mobile gutters.
- **Profiles and dashboard:** a traveler journal header, ruled engagement totals, monthly activity, selected-place detail, and illustrated earned/locked milestone stamps.
- **Trips:** journey-stage headings, continuous statistics, numbered stop timelines, framed maps, and itinerary rows that fit narrow screens.
- **Loading:** photography quotes remain, with a quieter film-frame indicator and a shorter minimum display time.
- **Branding:** a SnapIt browser title, description, theme color, manifest, and custom viewfinder favicon replace the starter branding. Broken placeholder Leaflet tags were removed.
- **Accessibility and responsiveness:** keyboard focus, reduced-motion support, visible labels, larger controls, and layouts checked at 320px, 390px, and desktop widths.

Page introductions were subsequently reduced across the feed, profiles, authentication, place forms, dashboard, nearby page, and all trip screens: smaller headings and tighter vertical spacing bring the main content higher on the page. The duplicate signed-in New entry button was removed from the main header, and the mobile header now uses the freed space.

Verification after the refresh: all 52 regression checks pass, the production build passes with CI enabled and no lint warnings, and the main screens were inspected in an isolated local preview. Preview sign-in and actions used temporary fixture responses; no production records were changed. The existing server on port 3000 was serving an earlier version and needs to be restarted from this project folder to show the new UI.

## Application fixes

| Area | Resulting behavior |
| --- | --- |
| Trip image safety | Retained images must be an array of existing stop images. Malformed, foreign, and traversal paths are rejected before changing a stop. Every trip cleanup route restricts deletion to upload images, including when old database values contain unsafe paths. |
| Place creation | Photos start as a required invalid field. Submission stays disabled without a valid image; forced invalid submission shows a useful error and sends no request. Duplicate submissions are guarded. |
| Place editing | Loaded input validity is retained. Changing only the title or description can be saved. |
| Feed deletion | Home, nearby-filtered home, and the dedicated nearby page remove the deleted place from state. The selected preview closes. |
| Shared place links | A valid place fragment selects and opens its matching preview after loading, including when a prior search would hide it. Closing the preview clears the fragment and keeps it closed. Malformed or unknown fragments are harmless. |
| Stop GPS | Saving notes or expenses with an unchanged address preserves the stored GPS point and does not call geocoding. A changed address is geocoded; explicitly supplied coordinates retain priority. |
| Stop visited time | The editor displays local wall time and converts changes back to UTC without a timezone shift. Empty/invalid input is guarded, and invalid dates are rejected by the backend. |
| Authentication | Missing or blank JWT configuration fails closed. Signing and verification use the validated secret directly and restrict the algorithm. Malformed bearer headers are rejected. |
| Startup | Environment loading is anchored to Backend, regardless of launch directory. Required settings and port values are validated. The server waits for trip index initialization before listening and reports readable errors without connection secrets. Importing the app opens no database connection or port. |
| Build | App lint warnings were corrected. Maps use the installed Leaflet package and its CSS, retaining custom marker settings. |
| Test commands | Root and package-level `npm test` commands now execute real regression suites instead of reporting no tests or running a placeholder. |

## MongoDB DNS fix

The system DNS resolver refused the cluster's SRV lookup. Read-only diagnostics confirmed that Cloudflare and Google DNS resolve its records successfully.

The backend now supports optional `DATABASE_DNS_SERVERS`. The local ignored `Backend/.env` contains:

```dotenv
DATABASE_DNS_SERVERS=1.1.1.1,8.8.8.8
```

This changes DNS resolution only inside the Node backend process. It does not change the computer's DNS settings. Both the actual database connection and the live unique active-trip index now pass verification.

## Validation

| Command / check | Result |
| --- | --- |
| `npm test` | 52/52 pass: backend 16, frontend 8, trip 28 |
| `npm run test:api` | 26/26 isolated HTTP checks pass; database/provider effects mocked |
| `npm run test:database` | Live MongoDB connectivity and unique active-trip index pass |
| `npm run test:live` | 5/5 pass: actual startup/index initialization and GET requests for users, places, auth rejection, and unknown route |
| `$env:CI='true'; npm run build` | Production build passes with no ESLint warnings |
| Backend and validation syntax | All checked JavaScript files pass `node --check` |
| Diff whitespace check | Pass with the repository's existing CRLF line endings accounted for |

All regression scripts and diagnostic checks are stored in `Backend/tests/`. They exercise real source modules with isolated database, provider, and filesystem effects. Frontend tests mount actual React components in jsdom with visual components mocked. Trip tests cover legitimate cleanup, hostile and malformed paths, unchanged/changed addresses, unavailable geocoding, IST and Los Angeles timezone boundaries, and invalid dates.

The live check starts the real app on a temporary localhost port and closes it afterward. It performs GET requests only. Normal backend startup initializes declared indexes; it creates no test documents. Live signup, image upload/deletion, and external mapping/translation requests were not performed.

## Run from the project root

```powershell
npm test
npm run test:api
npm run test:database
npm run test:live
npm run build
```

Start the app in two terminals:

```powershell
npm run start:backend
npm run start:frontend
```

`npm --prefix Backend test` and `npm --prefix Frontend test` also run their package's regression checks. Network-dependent checks require localhost access and/or access to the configured database.

## Remaining external configuration

`GOOGLE_TRANSLATE_API_KEY` is still absent. Translation therefore returns its deliberate configuration-unavailable response. Enabling real Google translation requires a valid key in `Backend/.env`; no key was invented, borrowed from another service, or exposed in test output.
