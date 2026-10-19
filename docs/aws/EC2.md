# Amazon EC2, security groups, and Elastic IP

> **Verification status:** EC2 deployment details below were supplied as context or are reproduction guidance. No AWS Console, EC2 instance, security group, Elastic IP, or host configuration was inspected. Do not treat example values/rules as recorded settings.

## A. Purpose

The deployment context describes EC2 as the host for the Node.js/Express API, with a reverse proxy and process manager. The repository has no EC2 provisioning code, PM2 configuration, or Nginx site. The backend listens on port 5000 by default; if Nginx is used as the public entry point, keep that application port private to the host/proxy.

## B. Prerequisites

- AWS account access to view EC2, VPC, IAM instance profiles, networking, and Elastic IPs.
- Confirm the account and region. `eu-north-1`, instance name `MediCloud-Server`, role `MediCloud-EC2-Role`, and public IP `16.171.203.67` are supplied context only.
- Confirm approved VPC/subnet, AMI, instance size, storage, admin access path, domain, ports, and maintenance owner before creating/changing resources.
- IAM permissions to inspect/modify the instance and network resources; do not use application runtime role for administration.

## C. Console navigation

Typical console paths (labels can vary): `AWS Console → EC2 → Instances`; instance role: `Instance → Actions → Security → Modify IAM role`; security group: `Instance → Security tab → Security groups`; Elastic IP: `EC2 → Network & Security → Elastic IPs`.

## D. Inspect an existing instance

1. Open **EC2 → Instances** and select `MediCloud-Server` only if that name appears in the verified account/region. Record the instance ID and state before any action.
2. On **Details**, record AMI/platform, instance type, VPC, subnet, public IPv4, and IAM role. Do not infer values from the instance name.
3. On **Security**, inspect attached security groups and each inbound/outbound rule. Record protocol, port range, source/destination, and description. Do not edit rules during an audit.
4. On **Storage**, record root volume type, size, encryption status, and delete-on-termination setting.
5. Check **Networking** for public address and any Elastic IP association. A public IPv4 address alone does not prove it is an Elastic IP.
6. Record key pair metadata from instance launch details where available; a private key is never displayed by AWS and must not be copied into documentation.
7. Verify the attached instance profile in the **IAM role** field and compare its role/trust/policies in IAM. Save evidence in the operator's secure inventory, not this public guide, if it contains account identifiers.

Expected result: an evidence-backed resource record. If a requested field is unavailable in the console history/current instance, mark it unknown instead of guessing.

## E. Create an instance (reproduction procedure, not the historical configuration)

Creating compute can incur charges. Obtain the owner's operational approval and select the correct account/region before proceeding.

| Screen / field | Selection | Action and reason |
|---|---|---|
| EC2 → Instances → Launch instance | New instance workflow | Start only after cost, region, and owner approval. |
| Name and tags | `MediCloud-Server` only if approved and available | Enter a descriptive name; tags support ownership/cost tracking. |
| AMI | Owner-approved supported Linux image | Verify security updates and Node/Nginx support; no AMI is confirmed by source. |
| Instance type | Owner-approved size | Select from measured memory/CPU needs; none is verified. |
| Key pair / access | Approved admin access mechanism | Select an existing approved key or managed access method. Do not create/distribute an unmanaged private key. |
| Network settings | Approved VPC/subnet and public reachability design | Do not assume public IP or default VPC. |
| Security group | Dedicated group with minimum inbound rules | Example only: TCP 443 from intended clients; TCP 80 only if required for redirect/certificate validation; SSH restricted to admin CIDR or omit when using managed access. Do not expose TCP 5000 publicly. |
| Storage | Owner-approved size/type/encryption | Set adequate capacity and encryption consistent with policy; actual values unknown. |
| Advanced details → IAM instance profile | Verified least-privilege role | Select approved profile after it exists; do not attach broad managed policies. |
| Review and launch | Verify every prior value | Launch only under approved change process; record instance ID and verify status checks. |

Console wizard fields and defaults may change. The table is a safe reproduction checklist, not a statement of historical selections. Confirm each saved value on the resulting instance details page.

## F. Attach an existing role

Select the verified instance → **Actions → Security → Modify IAM role** (label may vary) → choose the approved instance profile → **Update IAM role**. Reopen instance details and confirm the attached role. See [IAM](IAM.md) for policy verification. Do not attach IAM administrator permissions.

## G. Security groups and Elastic IP

No inbound rules or Elastic IP association were confirmed. Record the actual configured rules rather than copying the suggested examples. Never add public ingress on port 5000 when a local reverse proxy is intended.

If an Elastic IP is required, open **EC2 → Network & Security → Elastic IPs → Allocate Elastic IP address**, review allocation domain/region, then select **Associate Elastic IP address**, choose the correct instance/network interface/private address, review, and associate. This allocation may incur charges; verify current pricing and whether a static address is required first. Confirm the resulting association on both the Elastic IP page and instance networking details. The supplied public IP is not proof of an Elastic IP allocation.

## H. Verification and mistakes

From an authorized server shell, `aws sts get-caller-identity` can identify the active CLI credentials, but may differ from the service account's SDK chain. Run identity checks in the backend's actual runtime context without printing credential values. Confirm health locally and over the approved HTTPS endpoint after proxy setup.

Common errors: wrong account/region; instance profile selected instead of intended role; role trust does not allow EC2; port 5000 exposed publicly; broad SSH source; changing a public IP without updating DNS; stopping/replacing an instance while a dynamic public address is in use; assuming a public IPv4 is an Elastic IP. Compare against [deployment](../DEPLOYMENT.md) and [HTTPS](../HTTPS.md).
