# Security and privacy checklist

This checklist describes source behavior and operational checks. It is not a compliance assessment or certification.

## Verified in repository

- [x] Cognito adapter verifies access JWTs using pool/client configuration; user roles come from server-side profiles.
- [x] Authenticated document workflows scope metadata reads to the current user and generate short-lived presigned URLs (15-minute upload, 5-minute download).
- [x] S3 keys are generated server-side under `medical-records/<userId>/`; file types and 10 MiB maximum are checked before URL generation.
- [x] S3 upload requests specify `AES256` server-side encryption.
- [x] Public registration assigns patient role; doctor/admin role assignment is intended for trusted backend operations.
- [x] `.gitignore` and examples indicate environment files should not be committed; never place secrets in frontend `VITE_` values.
- [x] Logger redacts common token, password, authorization, API-key, and presigned URL fields.

These are code facts, not proof of AWS resource state or a successful deployment.

## Verify before real data use

- [ ] Attach least-privilege EC2 instance role; verify temporary role credentials from the running service. Do not install long-lived keys.
- [ ] Keep S3 Block Public Access enabled; verify bucket policy, encryption settings, access logging/monitoring, versioning and retention with the data owner.
- [ ] Scope S3 CORS to the deployed origin and only necessary methods/headers. CORS does not authorize access.
- [ ] Verify S3 URL signing and expiry in a non-sensitive test. Treat URLs as bearer secrets.
- [ ] Review all ownership checks and role transitions; grant admin/doctor roles through a trusted operator workflow.
- [ ] Limit DynamoDB actions and resources; enable backup/PITR and test restoration.
- [ ] Use an approved secret store for Cognito client secret and Brevo key. SSM loading is not implemented in checked-in code.
- [ ] Confirm HTTPS certificate hostname, termination, renewal ownership, and monitoring. Repository does not configure TLS.
- [ ] Review logs and retention for personal/health information; redaction filters do not guarantee de-identification.
- [ ] Patch dependencies regularly and review lockfile changes.
- [ ] Document incident contacts, containment steps, audit sources, recovery, and any applicable reporting duties with the service owner.
- [ ] Test deletion/reconciliation: source deletes S3 first then soft-deletes DynamoDB metadata, so partial failure can leave inconsistency.
- [ ] Do not make claims of HIPAA or other regulatory compliance based on this repository.
