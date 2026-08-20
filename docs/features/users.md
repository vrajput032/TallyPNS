# Users (admin)

**Routes:** `/users`  
**Frontend:** `frontend/src/features/users/`  
**Backend:** `backend/src/modules/auth/`  
**API:** `GET/POST /api/auth/users`, `DELETE /api/auth/users/:id` · **DB:** `User`

Admin-only screen.

- List all users (id, username, email, name, role, created)
- Create ADMIN or STAFF (password min 8 characters). Email is auto `{username}@pnsenterprises.com`
- Delete users except yourself and the last remaining admin
