# Amazon Cognito

## Role and implementation

In Cognito mode, the backend mediates sign-up, email confirmation, sign-in, and user lookup through the AWS SDK. It verifies JWT access tokens using `aws-jwt-verify`; roles are loaded from the server-side user profile rather than trusted from a client claim. The frontend stores the access token in `sessionStorage` and attaches it as `Authorization: Bearer ...`.

The deployment context supplied with the documentation request names pool `eu-north-1_NeFNNPZvU`; this is not confirmed against AWS. Source defaults to `ap-south-1`. Use placeholders in setup and verify pool/client/region before use.

## Token and identity flow

The backend starts `USER_PASSWORD_AUTH`, retrieves an access token, calls Cognito `GetUser`, uses the Cognito `sub` as the application user ID, and creates/loads a DynamoDB profile. The verifier is configured for `tokenUse: 'access'`, pool ID, and client ID, validating token signature and claims. The middleware then resolves the current profile and server-managed role. The frontend does not decode or use an ID token. No refresh-token handling was found in the frontend API client.

Current backend validation requires `COGNITO_CLIENT_SECRET` when `AUTH_PROVIDER=cognito`; sign-up, confirmation, login and resend compute Cognito `SecretHash`. Keep this value in backend-only secret storage. A public browser client must never contain a confidential client secret. If using a client without a secret, backend validation and adapter behavior would need a code change; documentation alone cannot change that compatibility.

## Setup checklist

1. In the Cognito Console, create or select a User Pool in the same intended region as the backend AWS clients.
2. Configure email as a sign-in/verified attribute consistent with registration and confirmation routes.
3. Create an app client and configure the password authentication flow required by `USER_PASSWORD_AUTH`. Record the client ID. If it has a secret, provision it only to the backend's protected secret store.
4. Configure password policy, account recovery, MFA/risk controls, and token lifetimes to the operator's requirements.
5. Hosted UI callback/logout URLs and Cognito domain are not used by the current frontend-mediated API login flow; `COGNITO_DOMAIN` is defined but no usage was found. Set callback URLs only if a separate hosted UI flow is introduced.
6. Configure backend `AUTH_PROVIDER=cognito`, `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_CLIENT_SECRET`, and `AWS_REGION`. Grant the backend role only the Cognito operations needed by sign-up, confirmation, resend, authentication, user lookup, and sign-out.
7. Create a test user, confirm email, sign in through the application, and verify `/api/auth/me` and a protected endpoint. Never use a real patient's account for validation.

The actual user pool's policies, app client settings, token durations, MFA, and callback URLs require Console verification.

## Troubleshooting and security

- `NotAuthorizedException` / invalid credentials: verify pool region, client ID/secret pairing, secret hash, user state, and enabled auth flow. Do not log submitted passwords, tokens, or secret hashes.
- `UserNotConfirmedException`: complete email confirmation or request a new code; observe the application's throttling responses.
- JWT rejected: confirm token is an **access** token from the configured pool/client, and check issuer, expiry, region, and host clock.
- Profile unavailable: verify the authenticated Cognito `sub` has a compatible DynamoDB profile and repository permissions.
- Keep app-client secrets out of frontend bundles, source control, logs, and error reports. Keep roles server-side and grant elevated doctor/admin status only through trusted administrative procedures.
- `sessionStorage` limits persistence to a tab, but browser script execution can still access it. Apply CSP and dependency hygiene and avoid untrusted script injection.
