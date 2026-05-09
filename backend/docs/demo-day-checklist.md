# Demo Day Checklist

## Before The Committee

1. Start backend with the `dev` profile and confirm `http://localhost:8081/actuator/health` returns `UP`.
2. Start the frontend and open the landing page on a clean browser session.
3. Verify that SMS is disabled locally unless you explicitly want real messages:
   - `APP_SMS_ENABLED=false`
4. Prepare 3 accounts in advance:
   - normal user
   - worker account with verified profile
   - admin account
5. Make sure uploaded demo images are professional and non-sensitive.
6. Confirm there are no real identity documents left in the repository history or staged files.

## Recommended Demo Flow

1. Open the landing page and present the visual identity, Arabic-first UX, and responsive layout.
2. Log in as a normal user and create a task.
3. Show that a new user task goes to admin review instead of becoming public immediately.
4. Log in as admin and approve the task.
5. Log in as worker and submit an offer on the approved task.
6. Return to the user account and select the worker offer.
7. Return to the worker account and accept the task to move it into progress.
8. Finish the flow by marking the task completed and showing the rating path.

## Points To Highlight

- Worker identity documents are protected and not public.
- Public worker listings only expose safe information.
- Authentication and password reset endpoints are rate-limited.
- Admin approval exists for both sensitive worker onboarding and new tasks.
- File uploads are validated by type, size, and content.
- Swagger/OpenAPI is not left open by default outside development.

## If You Get A Question About Security

Say this clearly:

> "We separated public and sensitive files, limited brute-force attempts, tightened password policy, removed tracked secrets and uploaded documents from the repository, and verified the backend with automated tests."

## Final 30-Second Sanity Check

- No `.env` file staged
- No `uploads/` files staged
- No `.m2/` files staged
- Frontend builds successfully
- Backend tests pass
- Admin demo account credentials are known and not default
