# ParcelFlow — API Documentation

Complete reference for the ParcelFlow backend API.

- **Base URL:** `/api/v1`
- **Content type:** `application/json` (except file uploads, which use `multipart/form-data`)
- **Auth:** send the JWT as an `accessToken` cookie **or** an `Authorization: Bearer <token>` header.

---

## Conventions

### Access levels

| Badge | Who can call it |
| --- | --- |
| 🌐 Public | No authentication |
| 🔒 Any | Any logged-in user (`SUPER_ADMIN`, `ADMIN`, `MERCHANT`, `RIDER`) |
| 👑 Admin | `ADMIN` or `SUPER_ADMIN` |
| ⭐ Super admin | `SUPER_ADMIN` only |
| 🏪 Merchant | `MERCHANT` only |
| 🛵 Rider | `RIDER` only |

### Success response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "…",
  "data": {},
  "meta": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 }
}
```

`meta` appears only on paginated list endpoints.

### Error response

```json
{
  "success": false,
  "statusCode": 400,
  "name": "…",
  "message": "…"
}
```

In development, the response also includes `error` and `stack` for debugging.

### Common list query parameters

Most list endpoints accept: `page` (default `1`), `limit` (default `10`), `sortBy` (default `createdAt`), `sortOrder` (`asc` | `desc`, default `desc`), and `searchTerm`. Extra filters are noted per endpoint.

### Password rules

Passwords must be **at least 8 characters** and contain at least one lowercase letter, one uppercase letter, one number, and one special character.

---

## 1. Auth — `/api/v1/auth`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/register` | 🌐 Public | Register a merchant; sends an OTP to the email |
| POST | `/verify-otp` | 🌐 Public | Verify the OTP and create the merchant account |
| POST | `/login` | 🌐 Public | Log in with email + password |
| POST | `/google` | 🌐 Public | Log in / register with a Google ID token |
| POST | `/refresh` | 🌐 Public | Issue new tokens from the `refreshToken` cookie |
| POST | `/logout` | 🌐 Public | Clear the auth cookies |
| POST | `/forgot-password` | 🌐 Public | Send a password-reset OTP |
| POST | `/reset-password` | 🌐 Public | Reset the password with the OTP |
| POST | `/resend-otp` | 🌐 Public | Resend the registration OTP |
| GET | `/me` | 🔒 Any | Get the current user's profile |
| POST | `/change-password` | 🔒 Any | Change the current user's password |

**POST `/register`**
```json
{
  "name": "Acme Store",
  "email": "owner@acme.com",
  "password": "Secret@123",
  "merchantProfile": { "phone": "01700000000", "businessName": "Acme" }
}
```
`merchantProfile` is optional; when present, `phone` is required.

**POST `/verify-otp`**
```json
{ "email": "owner@acme.com", "otp": "123456" }
```
Returns the user, merchant profile, and tokens (also set as cookies).

**POST `/login`**
```json
{ "email": "owner@acme.com", "password": "Secret@123" }
```

**POST `/google`**
```json
{ "idToken": "<google-id-token>" }
```

**POST `/forgot-password`**
```json
{ "email": "owner@acme.com" }
```

**POST `/reset-password`**
```json
{ "email": "owner@acme.com", "newPassword": "Secret@123", "otp": "123456" }
```

**POST `/resend-otp`**
```json
{ "email": "owner@acme.com" }
```

**POST `/change-password`**
```json
{ "currentPassword": "Old@1234", "newPassword": "New@1234" }
```

---

## 2. User — `/api/v1/user`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| PATCH | `/profile-image` | 🔒 Any | Upload / replace the profile image |

**PATCH `/profile-image`** — `multipart/form-data` with a single file field named `profileImage`.

---

## 3. Admin — `/api/v1/admin`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | 👑 Admin | Create an admin |
| GET | `/` | 👑 Admin | List admins (filters: `role`) |
| POST | `/super-admin` | ⭐ Super admin | Create a super admin |
| GET | `/super-admin` | ⭐ Super admin | List super admins |
| PATCH | `/` | 👑 Admin | Update the current admin's name (returns new tokens) |
| PATCH | `/:userId/status` | ⭐ Super admin | Toggle an account between `ACTIVE` and `BLOCKED` |

**POST `/` and POST `/super-admin`**
```json
{
  "name": "Jane Admin",
  "email": "jane@parcelflow.com",
  "password": "Secret@123",
  "personalEmail": "jane.personal@gmail.com"
}
```
Credentials are emailed to `personalEmail`.

**PATCH `/`**
```json
{ "name": "New Name" }
```

---

## 4. Merchant — `/api/v1/merchant`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | 👑 Admin | List merchants (filters: `email`, `status`) |
| GET | `/profile` | 🏪 Merchant | Get the current merchant's profile |
| PATCH | `/update-profile` | 🏪 Merchant | Update own profile (returns new tokens) |
| PATCH | `/:userId/status` | 👑 Admin | Toggle a merchant between `ACTIVE` and `BLOCKED` |

**PATCH `/update-profile`**
```json
{ "name": "Acme Store", "phone": "01700000000", "businessName": "Acme" }
```
All fields optional.

---

## 5. Rider — `/api/v1/rider`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/apply` | 🌐 Public | Apply as a rider (with document upload) |
| POST | `/apply/verify-email` | 🌐 Public | Verify the application email with an OTP |
| GET | `/` | 👑 Admin | List riders (filters: `email`, `licenseNumber`, `applicationStatus`) |
| GET | `/profile` | 🛵 Rider | Get the current rider's profile |
| POST | `/approve` | 👑 Admin | Approve or reject an application |
| PATCH | `/update-profile` | 🛵 Rider | Update own profile (returns new tokens) |
| GET | `/:riderId` | 👑 Admin | Get a rider profile by id |
| PATCH | `/:userId/status` | 👑 Admin | Toggle a rider between `ACTIVE` and `BLOCKED` |

**POST `/apply`** — `multipart/form-data` with:
- a file field named `vehiclePaper`
- a text field named `data` containing this JSON as a string:

```json
{
  "user": { "name": "Rider One", "email": "rider@example.com" },
  "riderProfile": {
    "phone": "01800000000",
    "address": "House 1, Road 2, Dhaka",
    "nid": "1234567890",
    "licenseNumber": "DL-123456",
    "vehicleType": "BIKE"
  }
}
```
`vehicleType`: `BIKE` | `BICYCLE` | `VAN`. `address` is optional. A temporary password is emailed to the rider.

**POST `/apply/verify-email`**
```json
{ "email": "rider@example.com", "otp": "123456" }
```

**POST `/approve`**
```json
{ "riderId": "<riderProfileId>", "applicationStatus": "APPROVED", "rejectionReason": "" }
```
`applicationStatus`: `APPROVED` | `REJECTED`. Include `rejectionReason` when rejecting.

**PATCH `/update-profile`**
```json
{ "name": "Rider One", "phone": "01800000000", "address": "New address" }
```
All fields optional.

---

## 6. Pricing rules — `/api/v1/rule`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | 👑 Admin | Create a pricing rule |
| GET | `/` | 👑 Admin | List all pricing rules |
| PATCH | `/:ruleId` | 👑 Admin | Update a pricing rule |

A rule is unique per (`zoneType`, `parcelCategory`).

**POST `/`**
```json
{
  "name": "Inside city — parcel",
  "zoneType": "INSIDE_CITY",
  "parcelCategory": "PARCEL",
  "baseWeightKg": 1,
  "baseCharge": 60,
  "perKgCharge": 20,
  "expressSurcharge": 30,
  "sameDaySurcharge": 60,
  "riderPickupCharge": 10,
  "codFeePercent": 1,
  "isActive": true
}
```
- `zoneType`: `INSIDE_CITY` | `SUB_CITY` | `OUTSIDE_CITY`
- `parcelCategory`: `DOCUMENT` | `PARCEL`
- Required: `name`, `zoneType`, `parcelCategory`, `baseCharge`, `perKgCharge`. Others optional.
- For `DOCUMENT` rules: `perKgCharge`, `codFeePercent`, and a non-default `baseWeightKg` are rejected (documents are flat-rate, no COD).

**PATCH `/:ruleId`** — any subset of the create fields.

---

## 7. Parcels — `/api/v1/parcel`

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/create-parcel` | 🏪 Merchant | Create a parcel (price computed server-side) |
| GET | `/my-parcels` | 🏪 Merchant | List the merchant's own parcels (filter: `status`) |
| POST | `/:parcelId/pay` | 🏪 Merchant | Start a bKash payment for a prepaid parcel |
| GET | `/payment/callback` | 🌐 Public | bKash redirect callback (query: `paymentID`, `status`) |
| POST | `/:parcelId/cancel` | 🏪 Merchant | Cancel own parcel (refunds if prepaid + paid) |
| GET | `/:parcelId/merchant` | 🏪 Merchant | Get one of the merchant's own parcels |
| GET | `/:trackingId/track` | 🏪 Merchant | Get a parcel's current status by tracking id |
| GET | `/:parcelId/invoice` | 🏪 Merchant | Download the parcel invoice (PDF) |
| DELETE | `/:parcelId` | 🏪 Merchant | Soft-delete a parcel (only while `CREATED`) |
| GET | `/` | 👑 Admin | List all parcels (filter: `status`; search by tracking id) |
| GET | `/:parcelId` | 👑 Admin | Get any parcel by id |
| PATCH | `/:parcelId/status` | 👑 Admin | Update hub status (`AT_HUB` / `IN_TRANSIT`) |
| POST | `/:parcelId/admin-cancel` | 👑 Admin | Cancel any in-flight parcel (refunds if applicable) |

**POST `/create-parcel`**
```json
{
  "pickupContactName": "Acme Warehouse",
  "pickupContactPhone": "01700000000",
  "pickupAddressLine": "Plot 5, Tejgaon",
  "pickupDistrict": "Dhaka",
  "pickupCity": "Dhaka",
  "pickupMode": "RIDER_PICKUP",
  "note": "Call before pickup",

  "recipientName": "John Doe",
  "recipientPhone": "01900000000",
  "recipientEmail": "john@example.com",
  "deliveryAddressLine": "House 10, Gulshan",
  "deliveryDistrict": "Dhaka",
  "deliveryCity": "Dhaka",
  "deliveryZoneType": "INSIDE_CITY",

  "parcelCategory": "PARCEL",
  "weightKg": 2.5,
  "itemDescription": "Books",
  "itemQuantity": 1,
  "declaredValue": 1500,
  "deliveryType": "REGULAR",

  "paymentType": "COD",
  "codAmount": 1500
}
```

Field reference:

| Field | Values / notes |
| --- | --- |
| `pickupMode` | `RIDER_PICKUP` (default) \| `MERCHANT_DROP` |
| `deliveryZoneType` | `INSIDE_CITY` \| `SUB_CITY` \| `OUTSIDE_CITY` |
| `parcelCategory` | `DOCUMENT` \| `PARCEL` |
| `deliveryType` | `REGULAR` (default) \| `EXPRESS` \| `SAME_DAY` |
| `paymentType` | `PREPAID` \| `COD` |
| `weightKg` | Number > 0 |
| `itemQuantity` | Integer ≥ 1 (default `1`) |
| `declaredValue` | Optional |
| `codAmount` | **Required** for `COD`, **forbidden** for `PREPAID` |

Rules: `DOCUMENT` parcels cannot be `COD`. For `PREPAID`, the response includes `requiresPayment: true` — call `/:parcelId/pay` next.

**POST `/:parcelId/pay`** — no body. Returns a bKash `paymentUrl` to redirect the merchant to.

**POST `/:parcelId/cancel`** and **POST `/:parcelId/admin-cancel`**
```json
{ "cancelReason": "Customer changed their mind" }
```
`cancelReason` is optional. Merchant cancel is allowed only before pickup (`CREATED` or `PICKUP_ASSIGNED`); admin cancel works on any parcel that isn't already delivered, returned, or cancelled.

**PATCH `/:parcelId/status`**
```json
{ "status": "AT_HUB" }
```
`status`: `AT_HUB` | `IN_TRANSIT` only. Other transitions happen through the assignment workflow.

**GET `/:parcelId/invoice`** — returns a PDF (`Content-Type: application/pdf`), not JSON.

---

## 8. Assignments — `/api/v1/assignment`

The pickup/delivery workflow. Admins assign a rider to a parcel leg; the rider then works the assignment through its states.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| POST | `/create-assignment` | 👑 Admin | Assign a rider to a parcel's pickup or delivery leg |
| GET | `/` | 👑 Admin | List assignments (filters: `status`, `leg`, `riderId`, `parcelId`) |
| PATCH | `/:assignmentId/cancel` | 👑 Admin | Cancel an active assignment |
| GET | `/my-assignments` | 🛵 Rider | List the rider's own assignments (filters: `status`, `leg`) |
| PATCH | `/:assignmentId/accept` | 🛵 Rider | Accept an offered assignment |
| PATCH | `/:assignmentId/start` | 🛵 Rider | Start the leg |
| PATCH | `/:assignmentId/complete` | 🛵 Rider | Complete the leg |
| PATCH | `/:assignmentId/fail` | 🛵 Rider | Mark the leg failed (reason required) |
| PATCH | `/:assignmentId/reject` | 🛵 Rider | Reject an offer before accepting |

**POST `/create-assignment`**
```json
{ "parcelId": "<parcelId>", "riderId": "<riderProfileId>", "leg": "PICKUP" }
```
- `leg`: `PICKUP` (parcel must be `CREATED`) | `DELIVERY` (parcel must be `AT_HUB` or `DELIVERY_FAILED`).
- Prepaid parcels must be paid first.
- Only one active assignment per parcel + leg at a time.
- A rider who has already **rejected** this parcel + leg cannot be assigned to it again.

**PATCH `/:assignmentId/fail`**
```json
{ "reason": "Recipient unreachable" }
```
`reason` is **required**.

**PATCH `/:assignmentId/reject`** and **PATCH `/:assignmentId/cancel`**
```json
{ "reason": "Too far from my area" }
```
`reason` is optional.

**Status flow.**

```
Assignment:  ASSIGNED → ACCEPTED → IN_PROGRESS → COMPLETED
                 │          │            └────────→ FAILED
                 │          └──────────────────────→ FAILED
                 └→ REJECTED        (admin) → CANCELLED
```

Effect on the parcel:

| Rider action | Leg | Parcel becomes |
| --- | --- | --- |
| Accept | PICKUP | `PICKUP_ASSIGNED` |
| Complete | PICKUP | `PICKED_UP` |
| Start | DELIVERY | `OUT_FOR_DELIVERY` |
| Complete | DELIVERY | `DELIVERED` |
| Fail | DELIVERY | `DELIVERY_FAILED`, or `RETURNED_TO_MERCHANT` once max re-attempts are reached |

---

## 9. Transactions — `/api/v1/transaction`

Payment history and transaction lookup for merchants and admins.

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/my-transactions` | 🏪 Merchant | List the merchant's own transactions |
| GET | `/all-transactions` | 👑 Admin | List all platform transactions (filter: `merchantEmail`) |
| GET | `/:paymentId` | 🏪 Merchant, 👑 Admin | Get a single transaction by payment id |

**GET `/my-transactions`** returns the current merchant's payment history, including related parcel details and pagination metadata. It accepts the usual list query parameters: `page`, `limit`, `sortBy`, `sortOrder`.

**GET `/all-transactions`** returns all transactions in the system for admins. You can filter by `merchantEmail` in the query string and use the standard list pagination parameters.

**GET `/:paymentId`** fetches one transaction by its payment/transaction record id. Merchant users can only view their own transactions; admin users can access any transaction.

---

## 10. Dashboard stats — `/api/v1/stats`

Read-only analytics for each role's dashboard. Every response includes totals, status breakdowns (zero-filled across all statuses), and 30-day daily trend arrays (`{ date, count }`, Asia/Dhaka days).

| Method | Path | Access | Description |
| --- | --- | --- | --- |
| GET | `/admin` | 👑 Admin | Platform-wide metrics |
| GET | `/merchant` | 🏪 Merchant | Metrics for the merchant's own parcels |
| GET | `/rider` | 🛵 Rider | Metrics for the rider's own assignments |

**GET `/admin`** returns: counts (merchants, riders, admins, parcels, pending rider approvals, active assignments); parcel status breakdown; delivery performance + success rate; revenue (bKash paid / pending / refunded, realized delivery charge, COD collected vs outstanding); assignment status breakdown; and trends for parcels created and deliveries.

**GET `/merchant`** returns: own parcel totals + status breakdown; prepaid-vs-COD split; delivery performance; spend (total delivery charge, prepaid paid vs pending); COD collected vs pending; and a parcels-created trend.

**GET `/rider`** returns: own assignment totals + status breakdown; active pickups vs deliveries; completed pickups / deliveries; delivery success rate; and a completed-assignments trend.

---

## Enum reference

| Enum | Values |
| --- | --- |
| `Role` | `SUPER_ADMIN`, `ADMIN`, `MERCHANT`, `RIDER` |
| `AccountStatus` | `ACTIVE`, `BLOCKED` |
| `VehicleType` | `BIKE`, `BICYCLE`, `VAN` |
| `RiderApplicationStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `PickupMode` | `RIDER_PICKUP`, `MERCHANT_DROP` |
| `ParcelCategory` | `DOCUMENT`, `PARCEL` |
| `ZoneType` | `INSIDE_CITY`, `SUB_CITY`, `OUTSIDE_CITY` |
| `DeliveryType` | `REGULAR`, `EXPRESS`, `SAME_DAY` |
| `PaymentType` | `PREPAID`, `COD` |
| `ParcelStatus` | `CREATED`, `PICKUP_ASSIGNED`, `PICKED_UP`, `AT_HUB`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `DELIVERY_FAILED`, `RETURNED_TO_MERCHANT`, `CANCELLED` |
| `TransactionStatus` | `PENDING`, `PAID`, `FAILED`, `CANCELLED`, `REFUNDED` |
| `AssignmentLeg` | `PICKUP`, `DELIVERY` |
| `AssignmentStatus` | `ASSIGNED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `CANCELLED`, `REJECTED` |
