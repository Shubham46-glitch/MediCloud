# AWS setup and deployment guide

This is a reproduction guide, not confirmation that the listed services currently exist. The checked-in manual guide is [manual-aws-and-ec2.md](manual-aws-and-ec2.md). Its environment example conflicts with supplied deployment context: source defaults to `ap-south-1`, while supplied context says `eu-north-1`. Choose one region and create/configure all regional resources consistently.

## 1. Prepare and provision AWS resources

1. Confirm account, region, budget, ownership, data classification, domain, recovery plan, and rollback operator. Avoid real patient data until security review.
2. Create a dedicated EC2 instance role/instance profile with only required runtime permissions. See [IAM](aws/IAM.md). Attach the instance profile to the instance; do not use user access keys.
3. Create the DynamoDB table and three indexes from the verified [schema](aws/DYNAMODB.md). Enable on-demand billing and configure backup/PITR according to owner policy.
4. Create/select a Cognito User Pool and app client supporting the backend `USER_PASSWORD_AUTH` flow. The current backend requires a client secret when Cognito is enabled; provision it as backend-only secret material. See [Cognito](aws/COGNITO.md).
5. Create a private S3 bucket in the intended region with Block Public Access enabled. Configure encryption and retention with the data owner. Add the CORS rule from [S3 guide](aws/S3.md), substituting the exact Vercel origin.
6. Configure backend runtime values securely. Although deployment context mentions SSM Parameter Store, this codebase has no SSM loader. Either inject values using an approved service environment/secret mechanism or implement and review a loader as a separate code change. Do not claim SSM integration is active based only on an IAM permission.
7. Create/verify an EC2 instance in the selected region, attach the instance profile, restrict inbound traffic to the reverse proxy requirements, and keep the Node API port private to the host/proxy.

The deployment identifiers (EC2 `MediCloud-Server`, role `MediCloud-EC2-Role`, table `MediCloud`, Cognito pool ID, bucket, public IP and Vercel URL) were supplied as context but not verified against AWS. Treat each as a value to confirm.

## 2. Backend runtime configuration

Set these values in protected backend runtime configuration, adapting the environment to the actual resources:

```dotenv
NODE_ENV=production
PORT=5000
FRONTEND_ORIGIN=https://<approved-frontend-host>
AWS_REGION=<selected-region>
DYNAMODB_TABLE_NAME=<table-name>
COGNITO_USER_POOL_ID=<region_pool-id>
COGNITO_CLIENT_ID=<app-client-id>
COGNITO_CLIENT_SECRET=<backend-only-secret>
S3_BUCKET_NAME=<private-bucket>
BREVO_API_KEY=<backend-only-secret>
BREVO_SENDER_EMAIL=<verified-sender>
BREVO_SENDER_NAME=MediCloud Notifications
DB_PROVIDER=dynamodb
AUTH_PROVIDER=cognito
STORAGE_PROVIDER=s3
EMAIL_PROVIDER=brevo
```

Production validation requires real providers and configured values. The backend `dotenv` loader reads `.env`; an EC2 service should use a protected environment file/service manager or an explicitly implemented secret loader. Never commit the production file.

## 3. Install and deploy backend

The repository does not pin the EC2 OS, Node installation method, PM2 ecosystem file, or deployment artifact workflow. Choose a supported Node runtime compatible with the lockfile, then deploy reviewed source using your approved transfer method:

```bash
node --version
npm --version
cd backend
npm ci --omit=dev
NODE_ENV=production npm start
```

For long-running service operation, PM2 is mentioned in supplied context but no configuration file is checked in. If PM2 is selected, run it as an unprivileged service user, configure startup persistence and log rotation, and preserve a previous release for rollback. Do not expose port 5000 publicly.

## 4. Reverse proxy, HTTPS, and frontend

Nginx and HTTPS are deployment-context assumptions; no site configuration, domain, certificate issuer, or renewal job is present in repository. Configure the selected reverse proxy to terminate TLS and forward to the local API port, set firewall rules for only required public ports, and verify certificate renewal ownership before traffic. Do not copy a guessed certificate command/configuration into production.

For frontend hosting, set `VITE_API_URL=https://<approved-api-host>` as a Vercel build environment variable and redeploy after changes. The supplied Vercel URL and API IP are unverified. The code requires a valid HTTP(S) URL; an HTTPS frontend must not target a plain HTTP API due browser mixed-content restrictions. Ensure backend `FRONTEND_ORIGIN` matches exactly.

## 5. Validate and operate

1. Check `GET https://<api-host>/api/health` through the reverse proxy.
2. Confirm from the backend runtime identity that AWS SDK calls resolve through the intended instance role.
3. Use a synthetic Cognito account to register/confirm/sign in and call `/api/auth/me`.
4. Exercise doctor listing and an appointment using test data; verify transactional conflict handling.
5. Upload/download/delete a non-sensitive test file from the exact frontend origin. Confirm S3 CORS, signature headers, metadata, and cleanup behavior.
6. Verify Brevo only using an approved test recipient. Inspect redacted application logs, service logs, reverse-proxy logs, and CloudTrail.
7. Keep a known-good release and document rollback. Recheck backups, alarms, storage retention, certificate renewal, and security group rules after deployment.

PM2, Nginx, TLS, Vercel, EC2, AWS service state, and SSM parameter loading remain unverified from repository inspection.
