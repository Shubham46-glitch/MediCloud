# AWS Systems Manager Parameter Store

> **Verification status:** Parameter Store use was mentioned in supplied deployment context, but no parameter names, paths, types, KMS settings, or backend loader exist in the checked-in source. No AWS account was inspected. Treat this document as a verification/reproduction procedure, not a record of current parameters.

## A. Purpose and application dependency

Parameter Store can hold backend runtime configuration and `SecureString` secrets. The checked-in backend currently reads process environment and `backend/.env` through `dotenv`; no SSM client or bootstrap loader was found. Therefore the application does **not** currently retrieve parameters from SSM at startup. Creating parameters alone will not configure this application.

## B. Prerequisites

- Confirm account, AWS region, parameter hierarchy, owning team, rotation policy, and whether values are secrets.
- A role authorized for `ssm:GetParameter`/`ssm:GetParameters` on exact parameter ARNs; add `kms:Decrypt` only for the customer-managed key used by SecureString.
- A separately implemented and reviewed loader or deployment mechanism that maps parameter names to the backend environment variable names. Never grant broad `ssm:*` to solve missing configuration.

## C. Console navigation and inspect existing parameters

Typical path: `AWS Console → Systems Manager → Parameter Store`. Select the verified region, then inspect parameter names and metadata without opening/decrypting secret values. The supplied deployment context has no verified path to enter here.

1. Search for a known approved prefix from the service owner. Do not enumerate or export unrelated account parameters.
2. Open a parameter's detail page and record only name, type, tier, last modified date, KMS key identifier (if shown), and description if non-sensitive.
3. Do not select **Show** or copy a SecureString value into docs, screenshots, shell history, or chat.
4. Compare names with the backend configuration variables in the root README; no mapping is currently configured in source.

## D. Create/update a parameter (reproduction procedure)

Only create parameters after the application loader and owner-approved naming scheme are in place.

1. Open **Systems Manager → Parameter Store → Create parameter**.
2. **Name:** enter an approved hierarchical path such as `/medicloud/<environment>/<VARIABLE_NAME>`. This is an example convention, not a verified existing path.
3. **Description:** add non-sensitive purpose and owner.
4. **Tier:** choose the tier justified by size/features and current account policy; do not assume the console default.
5. **Type:** select `String` for non-secret configuration. Select `SecureString` for secrets; do not use `StringList` unless the consuming loader expects a list.
6. **KMS key source:** for SecureString, select the owner-approved AWS managed or customer-managed key according to policy. If a customer key is used, ensure the runtime role has narrowly scoped decrypt permission. The current repository has no key selection to reproduce.
7. **Value:** enter the approved value in the console only. This documentation does not contain parameter values.
8. Review name, type, tier, and key; choose **Create parameter** (or save/update label shown in the current console).
9. Reopen the parameter details and verify metadata without revealing the value.

Expected result is a parameter with the chosen type and encryption metadata. This does not prove MediCloud reads it.

## E. Final configuration and integration summary

| Item | Current evidence |
|---|---|
| Region | Unverified; backend example region is `ap-south-1`, supplied deployment context says `eu-north-1` |
| Parameter path/name | Not found in source/context; requires account/owner verification |
| Parameter types and KMS key | Unverified |
| IAM role permission | No attached production policy inspected |
| Backend loader | Not configured in checked-in source |
| Application mapping | None found |

Do not document values or mark SSM integration active until the owner confirms names/types and a running backend demonstrably loads them.

## F. Verification, mistakes, and security

If a reviewed loader exists outside this repository, verify from the service role using a non-secret parameter first. Example CLI metadata-only command:

```bash
aws ssm describe-parameters --parameter-filters Key=Name,Option=BeginsWith,Values=/medicloud/<environment>/ --region <region>
```

Do not use commands that print decrypted values in shared terminal logs. Missing parameter errors may be caused by wrong region/path, role policy, KMS key policy, or loader mapping. Verify the error name and parameter ARN while redacting values. For secrets use SecureString, least privilege, controlled rotation, and CloudTrail; do not place credentials in frontend build variables. SSM reads are not a substitute for a functioning loader or safe process environment handling.
