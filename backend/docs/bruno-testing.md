# Bruno Testing Guide

## Recommended Method

Import the backend OpenAPI description from:

`http://localhost:8081/v3/api-docs`

This is the fastest way to generate a Bruno collection that stays aligned with the backend routes.

## Environment Example

```json
{
  "baseUrl": "http://localhost:8081",
  "token": ""
}
```

## Suggested Request Order

1. `POST /auth/signup`
2. `POST /auth/verify`
3. `POST /auth/login`
4. Protected routes with `Authorization: Bearer {{token}}`

## Important Notes

- Verification codes and reset tokens are logged by the backend.
- In `prod`, JWT and database credentials must come from environment variables.
- Swagger UI is available at `http://localhost:8081/swagger-ui/index.html`.
