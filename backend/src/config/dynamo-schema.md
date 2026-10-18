# MediCloud — DynamoDB Single-Table Design

## Overview

MediCloud uses a **single DynamoDB table** for all application entities.
The table name is configured via the `DYNAMODB_TABLE_NAME` environment variable.
The local mock repository does not use DynamoDB.

All entities share the same table using a **composite key pattern** (`PK` + `SK`)
with **Global Secondary Indexes (GSIs)** for additional query patterns.
This avoids the need for joins and keeps read costs predictable.

> The table and all GSIs must be created in the AWS Console (or via IaC) before
> the application is deployed. The application **never creates AWS resources
> at startup**.

---

## Table Definition

| Attribute | Type | Role |
|---|---|---|
| `PK` | String | Partition key (main table) |
| `SK` | String | Sort key (main table) |
| `GSI1PK` | String | Partition key for GSI1 |
| `GSI1SK` | String | Sort key for GSI1 |
| `GSI2PK` | String | Partition key for GSI2 |
| `GSI2SK` | String | Sort key for GSI2 |
| `GSI3PK` | String | Partition key for GSI3 (appointment ID lookup) |
| `GSI3SK` | String | Sort key for GSI3 |

### Global Secondary Indexes

| Index Name | Partition Key | Sort Key | Projected Attributes | Purpose |
|---|---|---|---|---|
| `GSI1` | `GSI1PK` | `GSI1SK` | ALL | Email lookup, doctor list, specialty list, patient appointments, document index |
| `GSI2` | `GSI2PK` | `GSI2SK` | ALL | Admin: list all appointments across all doctors |
| `GSI3` | `GSI3PK` | `GSI3SK` | ALL | Direct appointment lookup by ID |

**Billing mode:** On-demand (PAY_PER_REQUEST) — appropriate for a college project
with unpredictable traffic. Switch to provisioned capacity if usage becomes regular.

---

## Entities and Key Patterns

### 1. User Profile (Patient, Doctor, or Admin)

Stores authentication-adjacent profile data. Cognito manages the credentials;
DynamoDB stores the extended profile (name, phone, address, role, etc.).

| Field | Value |
|---|---|
| `PK` | `USER#<userId>` |
| `SK` | `PROFILE` |
| `GSI1PK` | `USER#<email>` |
| `GSI1SK` | `PROFILE` |

**Required attributes:**

| Attribute | Type | Notes |
|---|---|---|
| `userId` | String | Matches Cognito `sub` in production |
| `email` | String | Unique, lowercase |
| `role` | String | `patient`, `doctor`, or `admin` — server-controlled only |
| `name` | String | Display name |
| `status` | String | `active` or `inactive` |
| `createdAt` | String | ISO 8601 timestamp |

**Optional attributes (patient):** `phone`, `bloodGroup`, `dateOfBirth`, `gender`,
`address`, `emergencyContact`, `allergies`, `insuranceProvider`, `policyNumber`

**Optional attributes (doctor):** `title`, `specialty`, `hospital`, `licenseNumber`,
`department`, `officeLocation`, `consultationFee`, `experience`

**Authorization:** Users may only read and update their own profile.
Role changes are not permitted through the profile update endpoint.

An internal uniqueness item uses `PK=EMAIL#<lowercase email>` and `SK=UNIQUE`.
User creation writes this item and the profile in one transaction, preventing
concurrent registrations from claiming the same email. It has no GSI fields.

---

### 2. Doctor Profile

Separate from the User profile because doctors appear in the public directory
and have availability/slot data not relevant to regular users.

| Field | Value |
|---|---|
| `PK` | `DOCTOR#<doctorId>` |
| `SK` | `PROFILE` |
| `GSI1PK` | `DOCTORS` |
| `GSI1SK` | `STATUS#<status>#NAME#<name>` |

**Required attributes:**

| Attribute | Type | Notes |
|---|---|---|
| `doctorId` | String | Unique identifier |
| `name` | String | Full display name |
| `title` | String | Professional title (e.g. `MD, FACC`) |
| `specialty` | String | Medical specialty |
| `hospital` | String | Primary affiliated hospital |
| `location` | String | City, State |
| `fee` | Number | Consultation fee in USD |
| `experience` | Number | Years of experience |
| `status` | String | `active` or `inactive` |

**Optional attributes:** `bio`, `education`, `languages`, `rating`, `reviewCount`,
`featured`, `image`, `availableDays`, `availableSlots`

**Authorization:** Doctor list and individual profiles are public. Create, update,
and status changes require `admin` role. Slot updates require `doctor` (own only)
or `admin`.

---

### 3. Specialty

| Field | Value |
|---|---|
| `PK` | `SPECIALTY#<specialtyId>` |
| `SK` | `PROFILE` |
| `GSI1PK` | `SPECIALTIES` |
| `GSI1SK` | `NAME#<name>` |

**Required attributes:** `specialtyId`, `name`

**Optional attributes:** `description`, `icon`, `count`

**Authorization:** Listing specialties is public. Creating specialties requires `admin`.

---

### 4. Appointment

Appointments are stored under the **doctor's partition** for doctor views. GSIs
support patient, admin, and direct ID lookups.

| Field | Value |
|---|---|
| `PK` | `DOCTOR#<doctorId>` |
| `SK` | `APT#<date>#<time>#<appointmentId>` |
| `GSI1PK` | `PATIENT#<patientId>` |
| `GSI1SK` | `APT#<date>#<time>#<appointmentId>` |
| `GSI2PK` | `APPOINTMENTS` |
| `GSI2SK` | `STATUS#<status>#<date>#<time>` |
| `GSI3PK` | `APPOINTMENT#<appointmentId>` |
| `GSI3SK` | `PROFILE` |

The appointment sort key supports per-doctor listing. Active slot uniqueness is
enforced separately by a reservation item, written atomically with the
appointment.

**Required attributes:**

| Attribute | Type | Notes |
|---|---|---|
| `appointmentId` | String | Unique identifier |
| `patientId` | String | Foreign key → User |
| `patientName` | String | Denormalized for display |
| `patientEmail` | String | For confirmation email |
| `doctorId` | String | Foreign key → Doctor |
| `doctorName` | String | Denormalized for display |
| `doctorSpecialty` | String | Denormalized for display |
| `date` | String | `YYYY-MM-DD` |
| `time` | String | e.g. `10:00 AM` |
| `type` | String | `In-Person Consultation` or `Video Consultation` |
| `status` | String | `pending`, `confirmed`, `completed`, `cancelled`, `rejected` |
| `reason` | String | Reason for visit |
| `fee` | Number | Consultation fee at time of booking |
| `createdAt` | String | ISO 8601 timestamp |

**Authorization:** Patients can create and cancel their own appointments.
Doctors can view, confirm, reject, and complete their own appointments.
Admins can view and modify any appointment.

---

### 5. Medical Document Metadata

The actual file bytes are stored in S3. DynamoDB stores only the metadata
needed to list documents and generate presigned URLs.

| Field | Value |
|---|---|
| `PK` | `USER#<userId>` |
| `SK` | `DOC#<documentId>` |
| `GSI1PK` | `DOCUMENTS` |
| `GSI1SK` | `UPLOADED#<uploadedAt>` |

**Required attributes:**

| Attribute | Type | Notes |
|---|---|---|
| `documentId` | String | Unique identifier |
| `userId` | String | Owner — foreign key → User |
| `objectKey` | String | S3 object key (never exposed directly to client) |
| `fileName` | String | Original filename for display |
| `fileType` | String | MIME type |
| `uploadedAt` | String | ISO 8601 timestamp |

**Optional attributes:** `fileSizeBytes`, `description`, `status`

**Authorization:** Users can only access their own documents. The `objectKey` is
never sent to the client — only a short-lived presigned URL is returned.

Pending upload intents use `PK=USER#<userId>` and `SK=UPLOAD#<uploadId>`.
They store the server-generated object key, expected file metadata, and
`expiresAt` (Unix epoch seconds). Confirmation transactionally creates document
metadata and consumes the intent. Configure DynamoDB TTL on `expiresAt` to clean
up abandoned requests; confirmation enforces expiry independently of TTL cleanup.

---

## Access Patterns Summary

| Pattern | Key Strategy | Operation |
|---|---|---|
| Get user profile by ID | `PK=USER#<id>`, `SK=PROFILE` | `GetItem` |
| Get user by email | GSI1: `GSI1PK=USER#<email>`, `GSI1SK=PROFILE` | `Query` GSI1 |
| List all doctors | GSI1: `GSI1PK=DOCTORS` | `Query` GSI1 |
| Filter doctors by status | GSI1: `GSI1PK=DOCTORS`, then filter `status` | `Query` GSI1 |
| Get doctor by ID | `PK=DOCTOR#<id>`, `SK=PROFILE` | `GetItem` |
| List specialties | GSI1: `GSI1PK=SPECIALTIES` | `Query` GSI1 |
| Create appointment (no double-book) | Transactionally put appointment plus unique slot reservation | `TransactWriteItems` |
| List doctor's appointments | `PK=DOCTOR#<id>`, `begins_with(SK, APT#)` | `Query` |
| List patient's appointments | GSI1: `GSI1PK=PATIENT#<id>`, `begins_with(GSI1SK, APT#)` | `Query` GSI1 |
| List all appointments (admin) | GSI2: `GSI2PK=APPOINTMENTS` | `Query` GSI2 |
| Get appointment by ID | GSI3: `GSI3PK=APPOINTMENT#<id>`, `GSI3SK=PROFILE` | `Query` GSI3 |
| Update appointment status | Query by appointment ID, then conditionally update its current key | `TransactWriteItems` |
| Reschedule appointment | Query by appointment ID, move appointment and slot reservation | `TransactWriteItems` |
| Cancel appointment | Update status and release slot reservation | `TransactWriteItems` |
| List user's documents | `PK=USER#<id>`, `begins_with(SK, DOC#)` | `Query` |
| Get document by ID | `PK=USER#<id>`, `SK=DOC#<documentId>` | `GetItem` |
| Delete document | Soft-delete: set `status = deleted` | `UpdateItem` |

### Slot reservation items

Each active booking has a slot reservation item with `PK=SLOT#<doctorId>` and
`SK=DATE#<YYYY-MM-DD>#TIME#<time>`. Creation writes the appointment and
reservation in one `TransactWriteItems` operation with an
`attribute_not_exists(PK)` condition on the reservation. Cancellation and
rejection release the reservation transactionally; rescheduling claims a new
reservation and moves the appointment item transactionally.

Doctor profiles reference their login with the `doctorId` attribute on the
server-side user profile. The profile must be assigned by a trusted operator.

---

## Atomic Slot Reservation

An active appointment claims `PK=SLOT#<doctorId>` and
`SK=DATE#<YYYY-MM-DD>#TIME#<time>`. Appointment creation writes the reservation
and appointment in one transaction with an `attribute_not_exists(PK)` condition.
The transaction ensures only one concurrent booking can claim a slot. Cancel,
reject, and reschedule use transactions to release or move the reservation.

The mock repository simulates slot conflict checks in process memory; only the
DynamoDB adapter provides cross-process transactional reservation guarantees.

---

## Denormalization Strategy

DynamoDB does not support joins. Appointment items therefore store denormalized
copies of the patient's name/email/phone and the doctor's name/specialty/hospital
at the time of booking. This means:

- If a doctor's name changes after booking, old appointments still show the
  original name. This is intentional — it preserves the historical record.
- The authoritative doctor profile is always in `PK=DOCTOR#<id>`, `SK=PROFILE`.

---

## Table Provisioning (Manual — Do Not Auto-Create)

When ready to activate DynamoDB:

1. Create the table in the AWS Console with `PK` (String) + `SK` (String).
2. Add GSI1 with `GSI1PK` (String) + `GSI1SK` (String), `ALL` projection.
3. Add GSI2 with `GSI2PK` (String) + `GSI2SK` (String), `ALL` projection.
4. Add GSI3 with `GSI3PK` (String) + `GSI3SK` (String), `ALL` projection.
5. Configure TTL on `expiresAt` for pending upload cleanup.
6. Set billing mode to `PAY_PER_REQUEST`.
7. Enable point-in-time recovery (PITR) for data safety.
8. Migrate existing appointment records to include GSI3 keys before enabling direct ID lookup.
9. Set `DYNAMODB_TABLE_NAME` and `DB_PROVIDER=dynamodb` in the backend `.env`.

**Do not provision the table without explicit approval.**
