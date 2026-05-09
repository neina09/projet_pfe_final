# Projet Backend

Spring Boot backend for authentication, workers, tasks, bookings, ratings, chat, and notifications.

## Main Improvements Included

- Authentication now uses `phone` instead of `email`.
- Validation was tightened for auth and profile DTOs.
- Swagger UI and OpenAPI JSON are enabled in `dev` and disabled by default elsewhere.
- Environment configuration is split into `dev`, `prod`, and `test`.
- Automated tests were added for auth, task offers, booking acceptance, and auth controller behavior.

## Profiles

- `dev`: local MySQL with SQL logs enabled.
- `prod`: database settings come from environment variables.
- `test`: in-memory H2 database.

The application defaults to `dev` unless `SPRING_PROFILES_ACTIVE` is set.

## Required Environment Variables

At minimum, set a JWT secret before starting the app:

```powershell
$env:JWT_SECRET_KEY="replace-with-your-own-base64-secret"
```

For production, also set:

```powershell
$env:SPRING_PROFILES_ACTIVE="prod"
$env:DB_URL="jdbc:mysql://host:3306/db_backend"
$env:DB_USERNAME="your_user"
$env:DB_PASSWORD="your_password"
$env:APP_SECURITY_ALLOWED_ORIGINS="https://your-frontend.com"
```

To deliver SMS to real phones through Twilio:

```powershell
$env:APP_SMS_ENABLED="true"
$env:TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$env:TWILIO_API_KEY="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$env:TWILIO_API_SECRET="your_api_secret"
$env:TWILIO_FROM_NUMBER="+1xxxxxxxxxx"
```

If you use a Twilio Messaging Service instead of a direct sender number:

```powershell
$env:TWILIO_MESSAGING_SERVICE_SID="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Optional seeded admin values when `app.seed-admin=true`:

```powershell
$env:APP_SEED_ADMIN_PHONE="0660000000"
$env:APP_SEED_ADMIN_USERNAME="admin"
$env:APP_SEED_ADMIN_PASSWORD="change-this-password"
```

## Run the Project

From the backend folder:

```powershell
.\mvnw.cmd spring-boot:run
```

The wrapper now prefers a locally cached Maven distribution from `%USERPROFILE%\.m2\wrapper\dists`, which makes Windows startup more reliable when Maven was already downloaded before.

If Maven Wrapper is not available on your machine, run it from IntelliJ or install Maven and use:

```powershell
mvn spring-boot:run
```

## API Documentation

After the app starts:

- Swagger UI: [http://localhost:8081/swagger-ui/index.html](http://localhost:8081/swagger-ui/index.html)
- OpenAPI JSON: [http://localhost:8081/v3/api-docs](http://localhost:8081/v3/api-docs)

## Bruno Testing

### Option 1: Import OpenAPI directly

In Bruno:

1. Open Bruno.
2. Create or open a collection.
3. Choose import from OpenAPI.
4. Use `http://localhost:8081/v3/api-docs`.

This generates requests directly from your backend.

### Option 2: Manual requests

Set an environment variable in Bruno:

```json
{
  "baseUrl": "http://localhost:8081",
  "token": ""
}
```

Use these auth requests:

`POST {{baseUrl}}/auth/signup`

```json
{
  "username": "youssef",
  "phone": "+22222123456",
  "password": "Youss1234"
}
```

`POST {{baseUrl}}/auth/verify`

Take the verification code from the backend logs, then send:

```json
{
  "phone": "+22222123456",
  "verificationCode": "123456"
}
```

`POST {{baseUrl}}/auth/login`

```json
{
  "phone": "+22222123456",
  "password": "Youss1234"
}
```

Copy the returned token into Bruno environment as `token`.

For protected endpoints, send:

```text
Authorization: Bearer {{token}}
```

## Automated Tests

Test classes added:

- `AuthenticationServiceTest`
- `TaskServiceTest`
- `BookingServiceTest`
- `AuthenticationControllerTest`

Run tests with:

```powershell
.\mvnw.cmd test
```

or:

```powershell
mvn test
```

## Current Limitation

When `APP_SMS_ENABLED=true`, the application now sends verification and password reset codes through Twilio. If SMS is disabled, messages still fall back to logs for local development.

## Security Notes

- Public uploads are limited to worker profile images only. Identity documents are no longer exposed under `/uploads/**`.
- Swagger is disabled by default unless `APP_SECURITY_PUBLIC_DOCS_ENABLED=true`.
- Authentication endpoints now have basic request throttling for login, verification, and password reset flows.

## Production Deployment

The repository now includes:

- `backend/Dockerfile`
- `Frontend/Dockerfile`
- `Frontend/nginx.conf`
- `docker-compose.prod.yml`
- `.env.production.example`

For a production-style start:

1. Copy `.env.production.example` to `.env`.
2. Fill in database credentials, JWT secret, and allowed frontend origins.
3. Build and run:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env up --build -d
```

Recommended for real deployment in Mauritania:

- Put Nginx or Cloudflare in front of the stack.
- Serve both frontend and backend over HTTPS only.
- Use a managed MySQL instance with backups enabled.
- Store uploads on persistent disk or object storage.
- Keep `APP_SECURITY_ALLOWED_ORIGINS` limited to your real domain names.
