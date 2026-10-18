# MediCloud: Manual AWS and EC2 Runbook

This is a preparation guide for an operator who has access to the AWS account.
No AWS resources have been inspected, created, changed, or deployed as part of
this code work. Keep the EC2 instance stopped until deployment is explicitly
approved. Do not put production secrets in source control or the frontend.

## Before switching out of local mode

1. Confirm the AWS account, region, budget, required approvals, domain, and
   rollback owner with the account owner. The backend example uses
   `ap-south-1`; the S3 bucket name in `.env.example` is only a suggested value
   and may not exist or be available.
2. Review [the DynamoDB schema](../backend/src/config/dynamo-schema.md). Create
   the table with string keys `PK` and `SK`, GSI1/2/3 with the documented string
   key attributes and `ALL` projection, on-demand billing, point-in-time
   recovery, and TTL on `expiresAt`. GSI3 and slot reservations require a
   migration plan for any pre-existing appointments. Existing user profiles
   also need the email-uniqueness item expected by new registrations.
3. Create a Cognito user pool and a public app client with no client secret.
   Enable the password authentication flow required by the backend, configure
   email verification, and record the pool ID and app client ID. Public sign-up
   creates patients only. Do not accept a user-editable role claim; doctor and
   administrator roles belong in trusted DynamoDB profile records.
4. Create a private S3 bucket in the same region. Keep Block Public Access on,
   enable default encryption and versioning as required by the data owner,
   and configure CORS only for the deployed frontend origin, `PUT`, and the
   headers the browser upload uses (including `Content-Type` and
   `x-amz-server-side-encryption`). Set a lifecycle/retention policy with the
   data owner. The app uses short-lived presigned URLs and checks uploaded
   object size and type before recording metadata.
5. Create an EC2 instance role for the backend. Scope DynamoDB permissions to
   the table and its indexes (`GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`,
   `Query`, and `TransactWriteItems`). Scope S3 permissions to the intended
   bucket/object prefix for upload, head, download, and deletion. Add only the
   CloudWatch permissions needed for the chosen logging setup. Do not install
   long-lived AWS access keys on the instance.
6. Configure Brevo with a verified sender/domain and create an API key. Keep
   the key server-side. Confirm transactional email content and recipient
   behavior before enabling `EMAIL_PROVIDER=brevo`.
7. Create the CloudWatch log group, retention policy, and instance log
   forwarding configuration if centralized logs are required. Application
   logs are structured and redact common credential fields; confirm that log
   retention and access meet the operator's policy.

## Backend environment

Set the backend environment on the host, not in Vite files:

```dotenv
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://<approved-frontend-host>
FRONTEND_ORIGIN=https://<approved-frontend-host>
AWS_REGION=ap-south-1
DYNAMODB_TABLE_NAME=<created-table>
COGNITO_USER_POOL_ID=<pool-id>
COGNITO_CLIENT_ID=<app-client-id>
S3_BUCKET_NAME=<private-bucket>
BREVO_API_KEY=<secret-from-secret-store>
BREVO_SENDER_EMAIL=<verified-sender>
BREVO_SENDER_NAME=MediCloud Notifications
DB_PROVIDER=dynamodb
AUTH_PROVIDER=cognito
STORAGE_PROVIDER=s3
EMAIL_PROVIDER=brevo
```

Use the instance role for AWS credentials. Store secrets in an approved secret
store or a root/service-owned environment file with restrictive permissions.
Production startup intentionally rejects mock providers or missing provider
configuration. CORS must use the exact approved frontend origin.

## Manual deployment (only after approval)

1. Run `npm.cmd test` from `backend`, and `npm.cmd run lint` plus
   `npm.cmd run build` from `frontend`. Review the changes and ensure production
   environment values are ready.
2. In the AWS Console, verify the target instance ID, region, state, role,
   security group, disk, and operating system. Start the EC2 instance only
   after explicit deployment approval. Confirm it is healthy before connecting.
3. Connect using the account's approved access method. Install a Node.js version
   supported by both package manifests and the current Vite build. Check with
   `node --version` and `npm --version`; do not assume the OS package default is
   recent enough.
4. Transfer only reviewed source/build artifacts over SSH/SCP. On the host,
   install backend production dependencies with `npm ci --omit=dev`. Put the
   protected production environment in place, then run the backend under the
   approved service manager (systemd or PM2) as an unprivileged service user.
5. Configure the approved HTTPS reverse proxy and firewall rules. Expose only
   required ports; keep the API process bound behind the proxy. Deploy the
   frontend to the separately approved static hosting target and set its
   `VITE_API_URL` at build time to the HTTPS API URL.
6. Check `/api/health`, inspect service and CloudWatch logs, verify CORS and
   login with a designated test account, and verify one appointment flow. Test
   document upload/download only with an approved non-sensitive test file.
   Confirm no real recipient is contacted during email checks.
7. Keep the prior release available. If health checks or smoke tests fail,
   stop the service, restore the previous release/configuration, and document
   the rollback. Stop the instance afterward if the approved operating plan
   requires it.

## Current verification boundary

Local backend tests use mocks; frontend lint and build are local checks. They
do not establish that Cognito, DynamoDB indexes/migrations, S3 CORS and
permissions, Brevo delivery, CloudWatch, DNS/TLS, or EC2 are configured or
working. No deployment, AWS API call, live email, or real medical document test
is part of this runbook's preparation.
