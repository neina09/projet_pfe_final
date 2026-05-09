# Frontend Handoff For Antigravity

## Project Summary
Build a modern responsive frontend for a service marketplace platform in Mauritania.

The platform has 3 roles:
- `USER`: creates tasks and bookings
- `WORKER`: has a professional profile, receives bookings, and submits offers on tasks
- `ADMIN`: reviews workers and pending tasks

Backend base URL:
- `http://localhost:8081`

OpenAPI:
- `http://localhost:8081/v3/api-docs`

Swagger UI:
- `http://localhost:8081/swagger-ui/index.html`

## Product Goal
The product connects clients with workers such as electricians, plumbers, cleaners, and similar local service providers.

Core flows:
- User signs up with phone number
- User verifies account with SMS code
- User can browse workers and open tasks
- User can create a booking or publish a task
- Worker can register as worker, upload identity documents, receive requests, and manage offers
- Admin can verify workers and review tasks

## Design Direction
Please avoid generic dashboard styling.

Desired visual direction:
- Clean, premium, mobile-first UI
- Strong Arabic/French friendly layout support
- Warm and trustworthy colors, suitable for local services
- Cards with clear status badges
- Good empty states, loading states, and error states

Suggested palette:
- Primary: `#0F766E`
- Secondary: `#F59E0B`
- Surface: `#FFFDF8`
- Text: `#1F2937`
- Success: `#16A34A`
- Danger: `#DC2626`

Suggested style:
- Rounded cards
- Large search area on landing page
- Clear CTA buttons
- Status chips for `PENDING`, `ACCEPTED`, `COMPLETED`, etc.

## Required Pages

### Public Pages
- Home / landing page
- Worker listing page
- Worker details page
- Open tasks listing page
- Task details page
- Login page
- Signup page
- Verify account page
- Forgot password page
- Reset password page

### User Pages
- User dashboard
- My tasks
- Create task
- Edit task
- Task offers view
- My bookings
- Profile settings

### Worker Pages
- Worker onboarding / register as worker
- Worker dashboard
- My worker profile
- Edit worker profile
- Upload profile image
- Upload identity document
- My booking requests
- My offers
- Assigned tasks

### Admin Pages
- Admin dashboard
- Pending worker verifications
- Pending task reviews

## Authentication Flow
Auth is phone-based, not email-based.

### Signup
`POST /auth/signup`

Request:
```json
{
  "username": "youssef",
  "phone": "+22222123456",
  "password": "123456"
}
```

### Verify account
`POST /auth/verify`

### Login
`POST /auth/login`

Request:
```json
{
  "phone": "+22222123456",
  "password": "123456"
}
```

Response:
```json
{
  "token": "jwt-token",
  "expiresIn": 3600000
}
```

Frontend requirements:
- Store JWT token securely
- Send `Authorization: Bearer <token>` on protected requests
- If login succeeds after worker registration, role-aware navigation should update immediately
- Phone validation should support Mauritanian numbers

Phone regex used by backend:
```text
^(\+222|222)?[2-4][0-9]{7}$
```

## Main Data Models

### UserResponseDto
```json
{
  "id": 1,
  "username": "youssef",
  "phone": "+22222123456",
  "role": "USER"
}
```

### WorkerResponseDto
```json
{
  "id": 1,
  "name": "Ahmed",
  "job": "Electrician",
  "address": "Nouakchott",
  "salary": 1500,
  "imageUrl": "/uploads/...",
  "identityDocumentUrl": null,
  "phoneNumber": "+22222123456",
  "availability": "AVAILABLE",
  "averageRating": 4.5,
  "verificationStatus": "PENDING",
  "verificationNotes": null,
  "userId": 10,
  "verified": false
}
```

### TaskResponseDto
```json
{
  "id": 1,
  "title": "Need an electrician",
  "description": "Fix kitchen wiring",
  "address": "Nouakchott",
  "profession": "Electrician",
  "status": "OPEN",
  "userId": 3,
  "userName": "Ali",
  "assignedWorkerId": null,
  "assignedWorkerUserId": null,
  "assignedWorkerName": null,
  "createdAt": "2026-04-17T12:00:00",
  "latitude": 18.0735,
  "longitude": -15.9582,
  "distanceKm": 2.4
}
```

### BookingResponseDto
```json
{
  "id": 1,
  "userId": 5,
  "userName": "Ali",
  "workerId": 8,
  "workerUserId": 12,
  "workerName": "Mohamed",
  "workerJob": "Plumber",
  "status": "PENDING",
  "description": "Repair pipe",
  "address": "Nouakchott",
  "bookingDate": "2026-04-20T15:00:00",
  "price": 2500,
  "isRated": false,
  "createdAt": "2026-04-17T10:00:00"
}
```

## Enums To Support In UI

### Roles
- `USER`
- `WORKER`
- `ADMIN`

### Task status
- `PENDING_REVIEW`
- `OPEN`
- `IN_PROGRESS`
- `COMPLETED`
- `CLOSED`
- `CANCELLED`

### Booking status
- `PENDING`
- `ACCEPTED`
- `REJECTED`
- `COMPLETED`
- `CANCELLED`

### Worker availability
- `AVAILABLE`
- `BUSY`

### Worker verification
- `PENDING`
- `VERIFIED`
- `REJECTED`

## Core API Groups

### Auth
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/verify`
- `POST /auth/resend?phone=...`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

### Workers
- `GET /api/workers`
- `GET /api/workers/paged?page=0&size=10`
- `GET /api/workers/available`
- `GET /api/workers/{id}`
- `GET /api/workers/me`
- `POST /api/workers/register`
- `PUT /api/workers/{id}`
- `PATCH /api/workers/{id}/availability?availability=AVAILABLE`
- `POST /api/workers/{id}/upload-image`
- `POST /api/workers/{id}/upload-identity-document`

### Tasks
- `GET /api/tasks/open`
- `GET /api/tasks/open/search`
- `GET /api/tasks/{id}`
- `POST /api/tasks`
- `GET /api/tasks/my-tasks`
- `PUT /api/tasks/{id}`
- `DELETE /api/tasks/{id}`
- `GET /api/tasks/{id}/offers`
- `POST /api/tasks/{id}/offer`
- `PATCH /api/tasks/offers/{offerId}/select`
- `PATCH /api/tasks/offers/{offerId}/worker-accept`
- `PATCH /api/tasks/offers/{offerId}/worker-refuse`
- `PATCH /api/tasks/{id}/done`
- `PATCH /api/tasks/{id}/cancel`

### Bookings
- `POST /api/bookings`
- `GET /api/bookings/my-bookings`
- `GET /api/bookings/my-bookings/paged`
- `GET /api/bookings/my-requests`
- `GET /api/bookings/my-requests/paged`
- `PATCH /api/bookings/{id}/accept`
- `PATCH /api/bookings/{id}/reject`
- `PATCH /api/bookings/{id}/complete`
- `PATCH /api/bookings/{id}/cancel`

### Notifications
- `GET /api/notifications`
- `GET /api/notifications/unread-count`

### Ratings
- `POST /api/ratings/booking/{bookingId}`
- `POST /api/ratings/task/{taskId}`
- `GET /api/ratings/worker/{workerId}`

### Admin
- `GET /api/admin/dashboard`
- `GET /api/workers/admin/pending`
- `PATCH /api/workers/admin/{id}/verify`
- `PATCH /api/workers/admin/{id}/reject`
- `GET /api/tasks/admin/pending`
- `PATCH /api/tasks/{id}/approve`
- `PATCH /api/tasks/{id}/reject`

## Frontend Routing Suggestion
- `/`
- `/login`
- `/signup`
- `/verify`
- `/forgot-password`
- `/reset-password`
- `/workers`
- `/workers/:id`
- `/tasks`
- `/tasks/:id`
- `/dashboard`
- `/dashboard/tasks`
- `/dashboard/tasks/new`
- `/dashboard/bookings`
- `/worker/register`
- `/worker/dashboard`
- `/worker/profile`
- `/worker/requests`
- `/worker/offers`
- `/admin`
- `/admin/workers/pending`
- `/admin/tasks/pending`

## Important UX Rules
- Mobile-first is mandatory
- Arabic labels should fit well even if the first release is in French or English
- Use clear badges for statuses
- Add confirmation modals for destructive actions
- Show upload progress for files
- Show server validation errors near each field
- Handle empty lists gracefully
- Add skeleton loading for cards and tables

## Important Backend Constraints
- Backend server runs on port `8081`
- Frontend local origin is expected on `http://localhost:5173` or `http://localhost:3000`
- Multipart upload limit is `10MB`
- Identity documents are protected and should only be shown to the owner/admin flow
- Public worker images may be displayed in listings

## Priority Build Order
1. Authentication flow
2. Public landing and worker listing
3. User booking flow
4. Task creation and task marketplace
5. Worker onboarding and worker dashboard
6. Admin review pages
7. Notifications and polish

## Final Deliverable Expected
Please deliver:
- Responsive frontend screens
- Reusable component system
- Auth state management
- API service layer
- Role-based protected routes
- Production-ready forms with validation
- Clean loading, empty, success, and error states

If any endpoint details are unclear, use the backend OpenAPI as the source of truth.
