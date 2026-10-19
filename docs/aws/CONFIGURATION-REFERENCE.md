# MediCloud infrastructure configuration reference

This inventory separates repository facts from external deployment context and unknown AWS settings. No AWS, EC2, Vercel, or host console was inspected. “Requires console verification” means the value cannot be certified from this repository.

## Status legend

- **Verified from repository:** present in source, examples, or checked-in runbook (does not prove deployed state).
- **Provided deployment context:** supplied by the project owner outside repository evidence.
- **Requires console verification:** current resource value/state must be checked in the service console.
- **Not configured:** no implementation/configuration found in repository.
- **Not applicable:** no relevant component was found.

## Resource inventory

| Service | Resource/name | Region | Important settings and evidence | IAM / dependency | Status | Guide |
|---|---|---|---|---|---|---|
| IAM | `MediCloud-EC2-Role` | Global role; resources regional | Name supplied; no trust/policy JSON available | EC2 role needs least-privilege app access | Provided deployment context; requires verification | [IAM](IAM.md) |
| IAM | `MediCloud-S3-Access` | Global policy; S3 resource regional | Policy name supplied; actual policy/attachment unknown | `PutObject`, Get/Head, `DeleteObject` from source; exact policy unknown | Provided deployment context; requires verification | [IAM](IAM.md) |
| Cognito | User Pool `eu-north-1_NeFNNPZvU` | `eu-north-1` supplied; source default is `ap-south-1` | Backend uses `USER_PASSWORD_AUTH`, app client secret hash, access-token verification; pool settings unknown | Cognito API permissions and backend env | Pool identifier provided; all saved console options require verification | [Cognito](COGNITO.md) |
| S3 | `medicloud-medical-files-0234` | Context says `eu-north-1`; source example says `ap-south-1` | Code signs direct PUT/GET, owner-scoped keys, 15/5 minute expiry, requests AES256; bucket controls/CORS unknown | S3 object permissions | Bucket name in source default/context; live bucket and settings require verification | [S3](S3.md) |
| DynamoDB | Table `MediCloud` | Context says `eu-north-1`; source example table is `medicloud-local` | `PK`/`SK`, GSI1/2/3 attributes in schema doc; billing/encryption/PITR/deletion protection unknown | Table and index actions | Table name provided; existence/settings/index status require verification | [DynamoDB](DYNAMODB.md) |
| EC2 | `MediCloud-Server` | `eu-north-1` supplied | AMI, type, VPC, subnet, public address, storage, key pair unknown | Instance profile expected by proposed topology | Name provided; instance state/config requires verification | [EC2](EC2.md) |
| Security Groups | Unknown | Depends on VPC | No ingress/egress rules found in repository | Public ingress should not expose backend port 5000 behind proxy | Requires console verification | [EC2](EC2.md) |
| Elastic IP | `16.171.203.67` supplied as backend public IP | `eu-north-1` supplied | Allocation/association unverified; public IP does not establish Elastic IP | None for app auth; network dependency | Provided context; requires console verification | [EC2](EC2.md) |
| SSM Parameter Store | Parameter paths unknown | Unverified | Context says used, but no SSM SDK loader or parameter names found; backend uses dotenv/process env | Any SSM policy attachment unknown | Provided deployment context; source integration not configured | [Parameter Store](SSM-PARAMETER-STORE.md) |
| CloudWatch | Unknown | Region unknown | Logger emits structured logs; source comments mention possible CloudWatch ingestion; no agent/group config in repo | Log write permissions depend on actual agent | Use/configuration not confirmed; requires operator verification | [Manual runbook](../manual-aws-and-ec2.md) |
| Nginx / HTTPS | Unknown host/domain/certificate | Not applicable | Runbook/context only; no site config or certificate automation found | Network and host permissions | Provided deployment context; actual configuration requires host verification | [HTTPS](../HTTPS.md) |
| Vercel | URL `https://medicloud-sv.vercel.app` supplied | N/A | `VITE_API_URL` confirmed; `vercel.json` has SPA rewrite; project settings unverified | Frontend API CORS/S3 CORS dependencies | URL provided; project/deploy variables require console verification | [Vercel](../VERCEL.md) |

## Console evidence checklist

Before marking any external setting verified, record the AWS account/region, resource ARN/ID, console location, inspection date, and evidence owner. Redact secret values and private key material. Update relevant service guides only from direct observation or exported non-secret configuration.

- [ ] IAM role trust relationship, managed/inline policy documents, and attachment to instance profile.
- [ ] Cognito user pool sign-in, verification, MFA, recovery, app client type/secret, auth flows, token settings, and current IDs.
- [ ] S3 region, ownership, block-public-access, versioning, default encryption, CORS, lifecycle, and test upload/delete.
- [ ] DynamoDB table/index key schemas, projections, status, capacity, encryption, TTL, PITR, and deletion protection.
- [ ] EC2 instance details, profile, security group rules, volumes, public IP/EIP association, and host OS.
- [ ] Parameter names/types/KMS key metadata (never secret values) and whether a loader actually consumes them.
- [ ] CloudWatch log group/agent, retention, access, and redaction behavior if used.
- [ ] Nginx upstream/listeners, certificate issuer/expiry/renewal, and public health endpoint.
- [ ] Vercel project, deployment URL, `VITE_API_URL` environment selection, and successful HTTPS API call.
