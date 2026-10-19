# Troubleshooting

Commands below assume authorized operator access. Never paste tokens, presigned URLs, credentials, or patient data into logs or tickets. No live AWS/deployment diagnostic was run; historical deployment context is not treated as a current incident.

## `crypto is not defined`

- **Symptom:** Node reports a missing global `crypto` while importing a dependency or generating UUIDs.
- **Likely cause:** Runtime is older/incompatible with dependencies that expect Node's Web Crypto global.
- **Diagnose:** `node --version`; reproduce from backend with `npm start` and inspect Node stack.
- **Fix:** Use a current Node LTS compatible with the lockfile. Do not monkey-patch browser globals blindly.
- **Verify:** Restart service and exercise the failing route; confirm runtime version in service logs.

## S3 CORS preflight or upload failure

- **Symptom:** Browser console shows preflight/CORS error or PUT failure.
- **Likely cause:** Bucket CORS origin/method/headers mismatch, signed headers differ from browser request, URL expired, or IAM/signature issue.
- **Diagnose:** Inspect browser Network preflight and PUT; inspect S3 **Permissions > CORS**. Request uses `PUT`, `Content-Type`, and `x-amz-server-side-encryption`.
- **Fix:** Allow exact frontend origin, `PUT`, and required headers. Keep bucket private. Check signature expiry and exact request headers.
- **Verify:** Repeat with a non-sensitive file from the deployed origin, then call confirm-upload and download.

## S3 `AccessDenied` on delete

- **Symptom:** Delete endpoint returns an error and document remains.
- **Likely cause:** Runtime role lacks `s3:DeleteObject` for the object's key/prefix, or bucket policy/SCP denies it.
- **Diagnose:** Confirm service identity; inspect CloudTrail event and IAM role policy/resource ARN.
- **Fix:** Add only the missing object-level permission for `arn:aws:s3:::<bucket>/medical-records/*`, subject to policy review.
- **Verify:** Delete a synthetic test object through the application and confirm object and metadata state.

## DynamoDB `AccessDenied` on Query/transaction

- **Symptom:** Directory, profile, appointment, or upload workflow fails.
- **Likely cause:** Missing table/index ARN permission, wrong region/table, or permissions boundary/policy denial.
- **Diagnose:** Check service runtime identity and region; inspect CloudTrail action/resource; compare GSI names with [schema](aws/DYNAMODB.md).
- **Fix:** Correct exact table/index resource scope and required operation. Do not grant wildcard access as a workaround.
- **Verify:** Retry a non-sensitive read and the intended workflow.

## Cognito login or token verification failure

- **Symptom:** Login fails, API returns 401, or profile lookup fails after successful login.
- **Likely cause:** Wrong pool region/client, wrong client secret/hash, disabled `USER_PASSWORD_AUTH`, unconfirmed user, token is not access token, expired token, or absent DynamoDB profile.
- **Diagnose:** Inspect redacted backend error name/stage; verify pool/app-client settings and backend config; check token issuer/expiry without copying the JWT into logs.
- **Fix:** Align pool/client/region and auth flow, confirm account, and provision server-side profile/role through trusted workflow. The current adapter requires a client secret.
- **Verify:** Sign in with a synthetic confirmed user and call `/api/auth/me` and one protected endpoint.

## Missing SSM parameters

- **Symptom:** Operator expects startup to load Parameter Store values but values are absent.
- **Likely cause:** No SSM SDK integration/loader exists in checked-in source; `.env` is loaded with dotenv.
- **Diagnose:** Search runtime code/config and service unit; inspect startup environment without printing secret values.
- **Fix:** Configure a protected runtime environment or implement a separately reviewed SSM loader and grant scoped read permissions.
- **Verify:** Restart and confirm required variable names validate without printing their values.

## PM2 crash or restart loop

- **Symptom:** API process repeatedly exits.
- **Likely cause:** Invalid production environment, unsupported Node version, port conflict, module/dependency failure, or AWS configuration error.
- **Diagnose:** `pm2 status`, `pm2 logs medicloud-backend --lines 100`, `node --version`; redact output before sharing.
- **Fix:** Resolve the first startup error; check protected environment, permissions, ownership, port and installed production dependencies.
- **Verify:** `pm2 status` remains online and `curl http://127.0.0.1:5000/api/health` succeeds. PM2 setup itself is unverified and no config is checked in.

## Nginx 502/504

- **Symptom:** Proxy cannot return API response.
- **Likely cause:** Backend stopped, wrong upstream/port, local firewall/socket issue, or upstream timeout.
- **Diagnose:** `systemctl status nginx`, inspect Nginx error log, `curl http://127.0.0.1:5000/api/health`, inspect service manager.
- **Fix:** Restore backend service and align upstream with actual bind address/port; keep API port private.
- **Verify:** Test local health, then public HTTPS health. No Nginx config is in repository.

## HTTPS certificate error

- **Symptom:** Browser certificate warning or TLS handshake error.
- **Likely cause:** Hostname mismatch, expired/uninstalled certificate, incomplete chain, or failed renewal.
- **Diagnose:** Check certificate hostname/expiry and proxy TLS logs; inspect the actual certificate manager and renewal timer.
- **Fix:** Renew/install through the verified certificate mechanism and correct hostname/DNS. Mechanism is not specified in repository.
- **Verify:** Recheck certificate validity and API endpoint from an external client.

## Vercel API URL misconfiguration

- **Symptom:** Frontend reports missing/invalid API URL, network error, or mixed-content failure.
- **Likely cause:** `VITE_API_URL` missing, malformed, stale, or points from HTTPS page to HTTP API.
- **Diagnose:** Check Vercel build environment variable name/value (do not include credentials); inspect deployed bundle/network request.
- **Fix:** Set `VITE_API_URL` to the HTTPS API base URL without `/api` suffix, credentials, query, or fragment, then redeploy.
- **Verify:** Browser calls `<base>/api/health` and approved API CORS origin matches exact frontend origin.
