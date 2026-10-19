# Vercel frontend configuration

> **Verification status:** `frontend/vercel.json` contains a single-page-app rewrite to `/index.html`. No Vercel account/project settings were inspected. The supplied frontend URL is deployment context only.

## A. Purpose and integration

Vercel can build and serve the React/Vite frontend. The frontend API client reads `VITE_API_URL` at build time and appends `/api` to requests. The variable is public browser configuration, not a secret. The API's `FRONTEND_ORIGIN` must match the deployed site origin, and S3 CORS must separately allow browser uploads if S3 mode is active.

## B. Prerequisites

- Access to the correct Vercel team/project and repository connection.
- Confirmed HTTPS API base URL (without trailing `/api`, credentials, query, or fragment) and allowed environment(s).
- Backend CORS configured for the exact Vercel origin. Do not configure an HTTP API for an HTTPS frontend because browsers block mixed content.
- Never place AWS credentials, Cognito client secret, Brevo key, tokens, or other secrets in `VITE_` variables.

## C. Console procedure

1. Open the Vercel dashboard and select the verified MediCloud project.
2. Open **Settings → Environment Variables** (console label may change).
3. Add or edit `VITE_API_URL`.
4. Set its value to `https://<approved-api-host>` (placeholder only; supplied IP/URL is unverified). Do not add `/api` because `frontend/src/utils/api.js` appends that path.
5. Select only the deployment environments where the value is intended (Production, Preview, Development). Do not assume all environments share the same backend.
6. Save the variable. Verify its name and environment selection without exposing unrelated secrets.
7. Redeploy the project so Vite rebuilds the static assets with the updated value. Existing deployments do not automatically change when a build-time variable changes.
8. Open the deployed site, inspect its network requests, and confirm calls go to `<API base>/api/...` over HTTPS. Test `GET /api/health` and a synthetic authenticated flow.

## D. Summary, mistakes, security

| Setting | Value/status |
|---|---|
| Project name / deployed URL | Requires Vercel account verification; supplied URL is not verified |
| Build framework/output | Vite indicated by repository; confirm project build settings in console |
| SPA rewrite | Repository `frontend/vercel.json` rewrites all paths to `/index.html` |
| API variable | `VITE_API_URL`, confirmed in frontend source |
| API host | HTTPS placeholder until the deployed backend hostname is confirmed |
| Redeploy after edits | Required because Vite embeds variables during build |

Common issues: misspelling variable name; setting it for the wrong environment; including `/api` twice; setting `http://` behind HTTPS; backend CORS origin mismatch; forgetting to redeploy. Verify the final deployed request URL in browser DevTools. All `VITE_` values are visible to visitors.
