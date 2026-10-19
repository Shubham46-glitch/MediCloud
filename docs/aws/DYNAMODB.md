# Amazon DynamoDB

## Purpose and verification

`backend/src/repository/dynamo.repository.js` implements the persistent repository. The checked-in schema is documented in [`backend/src/config/dynamo-schema.md`](../../backend/src/config/dynamo-schema.md). It specifies table default `medicloud-local` and example defaults, not a confirmed deployed resource. The supplied deployment context names `MediCloud` in `eu-north-1`; verify both in the AWS Console before connecting.

## Table and indexes

The main key is string `PK` (partition key) and `SK` (sort key). Add string index key attributes as applicable:

| Index | Partition key | Sort key | Source-described purpose |
|---|---|---|---|
| GSI1 | `GSI1PK` | `GSI1SK` | User email, doctor and specialty directory, patient appointments, document index |
| GSI2 | `GSI2PK` | `GSI2SK` | Admin appointment listing |
| GSI3 | `GSI3PK` | `GSI3SK` | Appointment ID lookup |

The schema guide recommends `ALL` projection. Verify projection and active index status before enabling the adapter. Repository code queries these index names and key attributes.

## Entity patterns

| Entity | Main keys | Index/access pattern |
|---|---|---|
| User profile | `USER#<userId>` / `PROFILE` | GSI1 `USER#<lowercase-email>` / `PROFILE`; email uniqueness item `EMAIL#<email>` / `UNIQUE` |
| Doctor | `DOCTOR#<doctorId>` / `PROFILE` | GSI1 `DOCTORS` / `STATUS#<status>#NAME#<name>` |
| Specialty | `SPECIALTY#<specialtyId>` / `PROFILE` | GSI1 `SPECIALTIES` / `NAME#<name>` |
| Appointment | `DOCTOR#<doctorId>` / `APT#<date>#<time>#<appointmentId>` | GSI1 patient, GSI2 all appointments, GSI3 appointment ID |
| Slot reservation | `SLOT#<doctorId>` / `DATE#<date>#TIME#<time>` | Transactional conditional put/delete for unique active slot |
| Document metadata | `USER#<userId>` / `DOC#<documentId>` | GSI1 `DOCUMENTS` / `UPLOADED#<timestamp>`; application lists by main key |
| Upload intent | `USER#<userId>` / `UPLOAD#<uploadId>` | `expiresAt` is checked in code; schema recommends TTL cleanup |

The code soft-deletes document metadata by setting `status=deleted`; it does not delete the DynamoDB item. This differs from a physical delete. Conditional writes and transactions are used for uniqueness and appointment slot lifecycle. `_queryAll` continues from DynamoDB's `LastEvaluatedKey`.

## Provisioning

In DynamoDB Console, select the verified region, create a table with string partition key `PK`, string sort key `SK`, and on-demand billing unless the operator has measured capacity needs. Add GSI1–GSI3 using the table above and the schema guide projection. Wait for each index to become active. Configure TTL on `expiresAt` only if upload intent cleanup is desired; application confirmation checks expiry independently. PITR is an operational recovery recommendation, not an application prerequisite. Migrate preexisting records to index key attributes before relying on a new index.

Set backend `DB_PROVIDER=dynamodb`, `AWS_REGION`, and `DYNAMODB_TABLE_NAME` in protected runtime config. AWS SDK calls use the default credential provider chain; prefer an EC2 instance role to static credentials.

## IAM and operations

Runtime permissions should be limited to the named table and its `/index/*` resources, with operations the repository actually calls: `GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`, and `TransactWriteItems`. The precise IAM action set and resource policy are not present in the repository and must be verified. Console provisioning permissions belong to an operator, not the application role.

Enable and test backups under the data owner's retention policy. Restore into a separate table, check indexes/TTL configuration, then validate access patterns before switching runtime configuration. DynamoDB GSIs are eventually consistent; do not infer strong consistency from an index query.

## Troubleshooting

- **AccessDenied:** inspect the active runtime identity and CloudTrail event; ensure the table ARN and index ARNs are scoped and `dynamodb:Query` / transaction actions are allowed.
- **ValidationException / missing index:** compare key attribute names and types, index status, and names with the schema above.
- **Empty lookup:** verify key prefix/case, item GSI attributes, and migration; inspect the base item using an authorized operator identity.
- **Booking conflict:** a conditional transactional slot claim may correctly reject an occupied slot; distinguish this from permissions/service errors.
- **Expired upload intent:** `expiresAt` is a Unix epoch number; application rejects expired intents even if TTL deletion has not run.
