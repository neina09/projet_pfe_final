# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A service marketplace platform for Mauritania connecting clients with local workers (electricians, plumbers, cleaners, etc.). Users create tasks, workers submit offers or get booked directly. Identity is **phone-number-based** throughout — no email login.

**Current branch `new-web-design`**: The Frontend directory was deleted from the working tree as part of a redesign. Files are preserved in git history. To restore: `git restore Frontend/`

---

## Commands

### Backend (from `Backend/`)
```bash
./mvnw spring-boot:run          # Dev server on port 8081
./mvnw test                     # All tests (uses H2 in-memory DB)
./mvnw test -Dtest=AuthenticationServiceTest  # Single test class
./mvnw clean package            # Build JAR
./mvnw clean package -DskipTests
```

### Frontend (from `Frontend/`)
```bash
npm install
npm run dev       # Vite dev server at http://localhost:5173 (proxies API to :8081)
npm run build     # Production build to dist/
npm run lint      # ESLint
npm run preview   # Preview production build
```

### Docker (from root)
```bash
docker compose -f docker-compose.prod.yml --env-file .env up --build -d
```

---

## Architecture

### Stack
- **Backend**: Spring Boot 3.4.3 / Java 21 / Maven, MySQL (H2 for tests)
- **Frontend**: React 19 / Vite / Tailwind CSS 4 / React Router 7
- **Auth**: JWT (JJWT) stateless, stored in `localStorage` on the frontend
- **Real-time**: WebSocket STOMP at `/ws`
- **SMS**: Twilio (primary) or Chinguisoft (Mauritania-local fallback)
- **File storage**: Local filesystem via `FileStorageService`

### Backend Package Layout (`com.backend.Projet`)
```
config/       → SecurityConfiguration, WebSocketConfig, OpenApiConfiguration
controller/   → AuthenticationController, WorkerController, TaskController,
                BookingController, RatingController, NotificationController, AdminController
service/      → Business logic (one service per domain)
model/        → JPA entities: User, Worker, Task, Offer, Booking, Rating, Notification
dto/          → ~27 DTOs separating API contracts from entities
repository/   → Spring Data JPA repositories
mapper/       → Entity ↔ DTO conversion
exception/    → GlobalExceptionHandler (@RestControllerAdvice), custom exception types
```

### Authentication Flow
1. `POST /auth/signup` → creates unverified user
2. `POST /auth/verify` → validates 6-digit SMS code → user becomes active
3. `POST /auth/login` → returns `{ token, expiresIn }` JWT (1-hour expiry)
4. All protected requests: `Authorization: Bearer <token>` header
5. `JwtAuthenticationFilter` validates token, loads `UserDetails` by **phone number** (stored as JWT subject)

**Rate limits**: 5 login attempts / 15 min, 5 verify attempts / 15 min, 3 password-reset / 15 min → HTTP 429

### Roles & Access Control
- `USER`, `WORKER`, `ADMIN` — a user can hold multiple roles
- Spring Security method-level: `@PreAuthorize("hasRole('ADMIN')")`
- Public routes: `GET /api/workers`, `GET /api/tasks/open`, `/uploads/users/images/**`, `/uploads/workers/images/**`
- Identity documents are **not** served publicly

### Frontend API Client (`Frontend/src/api.js`)
Axios wrapper that injects the stored JWT automatically. Asset URLs include cache-busting version parameters. Environment variable `VITE_API_URL` sets the base URL (dev default: `http://localhost:8081`).

### Frontend Routing (`Frontend/src/App.jsx`)
- `/`, `/workers`, `/tasks` → public landing/listing pages
- `/auth`, `/login`, `/signup`, `/verify`, `/forgot-password`, `/reset-password` → auth flows
- `/dashboard/*` → authenticated user (tasks, bookings, profile)
- `/worker/*` → authenticated worker dashboard, offers, requests
- `/admin/*` → ADMIN-only (pending workers, pending tasks)
- `<ProtectedRoute>` component gates authenticated routes

### Internationalization
`Frontend/src/i18n/LanguageContext.jsx` provides a React Context for Arabic/French. Arabic is currently the default (`dir="rtl"`). Always account for RTL layout when building or editing components.

### File Uploads
- Max size: 10 MB (configured via `APP_STORAGE_MAX_UPLOAD_BYTES`)
- Worker profile images and user avatars: served publicly at `/uploads/...`
- Worker identity documents: private, never exposed via public endpoint
- Multipart upload endpoints use `POST .../upload-image` and `.../upload-identity-document`

---

## Environment Configuration

### Backend Profiles
| Profile | DB | Docs | SMS |
|---------|-----|------|-----|
| `dev` (default) | Local MySQL `neyna_db` on port 3306 | Swagger enabled at `/swagger-ui/index.html` | Disabled (logs only) |
| `prod` | `DB_URL` env var | Disabled unless `APP_SECURITY_PUBLIC_DOCS_ENABLED=true` | Enabled |
| `test` | H2 in-memory | — | Disabled |

### Key Environment Variables

**Required in prod**:
- `JWT_SECRET_KEY` — base64-encoded 256+ bit secret
- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`

**Optional with defaults**:
- `APP_SECURITY_ALLOWED_ORIGINS` — CORS (default: `http://localhost:5173,http://localhost:3000`)
- `APP_SMS_ENABLED` — default `false`
- `CHINGUISOFT_VALIDATION_KEY` / `CHINGUISOFT_VALIDATION_TOKEN` — local SMS provider
- `TWILIO_ACCOUNT_SID`, `TWILIO_API_KEY`, `TWILIO_API_SECRET`, `TWILIO_FROM_NUMBER`
- `APP_UPLOAD_DIR` — default `uploads`
- `APP_SEED_ADMIN=true` + `APP_SEED_ADMIN_PHONE/USERNAME/PASSWORD` — bootstrap admin user

**Frontend**:
- `VITE_API_URL` — backend base URL

See `.env.production.example` for a full template.

---

## Key Domain Workflows

### Task lifecycle
`PENDING` → `ACCEPTED` → `COMPLETED` / `CANCELLED`
- Workers submit `Offer` on a task; user accepts one offer → task becomes `ACCEPTED`
- Or user books a worker directly via `POST /api/bookings`

### Booking lifecycle
`PENDING` → worker accepts/rejects → `ACCEPTED` → user marks done → `COMPLETED` / `CANCELLED`
- After `COMPLETED`, user can submit a `Rating`

### Worker verification (admin)
Worker registers → status `PENDING` → admin reviews identity documents → `VERIFIED` or `REJECTED`
- Queue: `GET /api/workers/admin/pending`, action: `PATCH /api/workers/admin/{id}/verify|reject`

---

## API Documentation
Swagger UI (dev only): `http://localhost:8081/swagger-ui/index.html`  
OpenAPI JSON: `http://localhost:8081/v3/api-docs`
