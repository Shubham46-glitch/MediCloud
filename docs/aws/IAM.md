# AWS IAM for MediCloud

> **Verification status:** Role `MediCloud-EC2-Role`, policy `MediCloud-S3-Access`, policy type, exact documents, and EC2 attachment were provided as deployment context but not inspected in IAM. Procedures below explain how to verify an existing setup and how to reproduce a least-privilege design; they do not claim these are historical console choices.

## Purpose and verification boundary

AWS SDK clients in the backend use the default credential provider chain. On EC2, an instance profile and attached IAM role are the recommended way to provide temporary credentials. The deployment context names `MediCloud-EC2-Role` and `MediCloud-S3-Access`; neither role nor policy contents were inspectable from this repository. Verify current attachments and effective policies in IAM and EC2 before relying on them.

IAM roles are assumed identities with temporary credentials. Avoid long-lived IAM user keys on the server. An instance profile is the EC2 container through which an instance receives an IAM role; the profile is attached to the instance, and the role's policies authorize API calls.

## Runtime permission categories

Based on actual adapter calls, a narrowly scoped role may need:

- DynamoDB table/index operations: `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, `TransactWriteItems` on the named table and indexes.
- S3 object operations: `PutObject`, `GetObject`/HeadObject authorization, and `DeleteObject` for the application prefix.
- Cognito user-pool operations used by registration, confirmation, resend, password auth, `GetUser`, and sign-out. These are not IAM roles for end users.
- SSM read operations only if an independently verified runtime loader uses Parameter Store. No such loader was found in this repository.

The precise AWS managed/inline policy attached in the target account is unknown. The EC2 role does not need IAM administration permissions to create roles or change policies.

## Console procedure: inspect or create the EC2 role

### Inspect the current role first

1. Open **IAM → Roles** and search for `MediCloud-EC2-Role`. If absent, record “not found in selected account”; do not create a duplicate during an audit.
2. Open the role and inspect **Trust relationships**. Verify the trusted service principal and conditions. An EC2 service principal is a common requirement for an EC2 instance role, but is not confirmed here.
3. Open **Permissions** and record each attached managed policy and inline policy name. Open each policy's JSON and compare actions and resources with the application calls described above.
4. Inspect **Last Accessed** as a clue only; it can be delayed/incomplete and is not proof a permission is unnecessary.
5. Check **Tags** and description if present. No actual tags or description are known.

### Create a new role only for a reviewed reproduction

1. Open **IAM → Roles → Create role**.
2. On **Trusted entity type**, select the AWS service option only if this role will be assumed by an AWS service. Select **EC2** as the use case only after confirming the target is an EC2 host. These are recommended choices, not verified existing selections.
3. On the permissions step, attach only reviewed runtime policies. Do not attach `AdministratorAccess` or IAM administration permissions. If no policy is ready, create and review scoped policies first rather than proceeding with broad permissions.
4. Enter `MediCloud-EC2-Role` only if that name is approved and available; provide an owner/purpose description and approved tags if required by account policy.
5. Review trusted entity and permissions, then choose **Create role**.
6. Reopen the role and verify the saved trust and policy documents. Console labels may change; confirm the resulting role ARN rather than relying on wizard wording.

## `MediCloud-S3-Access` policy verification

In **IAM → Policies**, search the exact policy name. Open it and record whether AWS labels it as customer managed or an inline role policy (inline policies are inspected from the role). Review policy JSON, version, resources, and attachment list. Then open `MediCloud-EC2-Role` and confirm attachment. No policy JSON is available in this repository, so the example below is not a copy of the account policy.

The current adapter uses `PutObject` to sign uploads; it calls `HeadObject` for validation/download checks (authorized by object read access in the typical API model), `GetObject` for download signing, and `DeleteObject` for deletion and cleanup. `ListBucket` is not called by the shown adapter and should not be granted unless another verified component needs it. Bucket-level actions use `arn:aws:s3:::<bucket>`; object actions use `arn:aws:s3:::<bucket>/medical-records/*`.

## Resource ARN distinction

S3 bucket-level actions use `arn:aws:s3:::<bucket>`. Object operations use `arn:aws:s3:::<bucket>/medical-records/*`. DynamoDB table actions use the table ARN; index queries also need `arn:aws:dynamodb:<region>:<account>:table/<table>/index/*`.

`s3:DeleteObject` is required because the S3 adapter calls `DeleteObject` for document deletion, failed upload cleanup, and abandoned uploads. Deleting an S3 object and soft-deleting its DynamoDB metadata are separate steps.

## Example policy fragment (not production policy)

Adapt region, account, table, bucket, and prefix after verification. Add Cognito and SSM statements only when the selected deployment needs them. This example is illustrative and is not a copy of any policy in the account.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "MediCloudTableAccess",
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:TransactWriteItems"],
      "Resource": [
        "arn:aws:dynamodb:<region>:<account-id>:table/<table-name>",
        "arn:aws:dynamodb:<region>:<account-id>:table/<table-name>/index/*"
      ]
    },
    {
      "Sid": "MediCloudMedicalObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<bucket-name>/medical-records/*"
    }
  ]
}
```

## Console inspection and role attachment

1. In IAM, open **Roles**, locate the expected EC2 role, and inspect trust relationship, attached managed policies, inline policies, and last-accessed data.
2. Locate `MediCloud-S3-Access` if that is the policy name in use; verify it is attached to the intended role and its resource ARN/prefix matches the actual bucket. A policy name alone does not prove effective access.
3. In EC2, select the target instance and inspect **Actions > Security > Modify IAM role**. Confirm its instance profile/role and region/account.
4. On the instance, use the SDK identity check below, then make a least-privilege smoke check for a non-sensitive test object/table path.

```bash
aws sts get-caller-identity
aws configure list
```

The CLI identity check reflects the CLI's active credential chain, which may differ from the Node service environment if the service runs under another user/container. Check from the service's actual runtime context. Do not print credential environment variables.

## Verification and AccessDenied

IAM Policy Simulator is useful for evaluating policy logic, but it may not represent resource policies, SCPs, permission boundaries, session policies, VPC endpoint policies, service-specific conditions, or the exact runtime session. Confirm using CloudTrail and a low-risk operation from the actual instance role. Do not test against patient data.

For a simulator check, open **IAM → Policy Simulator** (or the policy's simulation action if shown), select the role as principal, select the target service/action and exact resource ARN, then run simulation. `Allowed` means the evaluated identity policies allow that modeled request; it does not prove the live request succeeds. An implicit deny means no applicable allow was found in the evaluated policies; an explicit deny or an external control can still override an allow. Compare simulator inputs with CloudTrail's actual caller, action, resource, and denial context.

## Attach to EC2 and verify active identity

From **EC2 → Instances**, select the verified instance, then use **Actions → Security → Modify IAM role** (console wording can vary). Select the approved instance profile/role and update. Reopen instance details and confirm the role appears. The supplied path and names are context, not observed state.

On the host, `aws sts get-caller-identity` identifies the AWS identity used by that CLI invocation. The CLI may use a different profile/user than the Node service. To verify the service, execute the identity check using the service's actual runtime credentials without dumping environment credentials or metadata tokens. Do not paste credential values into a ticket.

For `AccessDenied`, capture operation name, resource ARN, AWS request ID, caller identity and region; inspect CloudTrail and effective policies; then correct the smallest missing permission or scope. Do not solve permission errors by granting `*` actions/resources.
