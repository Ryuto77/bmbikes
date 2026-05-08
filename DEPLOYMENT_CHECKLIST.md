# Production Checklist

## Recommended Hosting Shape

- Frontend: `frontend/` on Vercel
- Backend: `backend/` on Render
- Database: Supabase PostgreSQL
- Domain:
  - `yourdomain.in` -> Vercel
  - `www.yourdomain.in` -> Vercel
  - `api.yourdomain.in` -> Render

## Files Added For Deployment

- [render.yaml](./render.yaml)
- [frontend/vercel.json](./frontend/vercel.json)
- [backend/.env.example](./backend/.env.example)
- [frontend/.env.example](./frontend/.env.example)

## Before You Deploy

1. Buy your real domain, for example `bestmotors.in`.
2. Push this repo to GitHub.
3. Prepare real SMTP credentials for password reset emails.
4. Prepare real Supabase database credentials.

## Frontend on Vercel

Create a Vercel project with:

- Root directory: `frontend`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Set frontend environment variable:

```env
VITE_API_BASE_URL=https://api.yourdomain.in/api/
```

`frontend/vercel.json` is already added so React routes like `/vehicle/...` and `/login` work after refresh.

## Backend on Render

Create a Render Web Service with:

- Blueprint file: `render.yaml`
- Root directory: `backend`
- Runtime: Python

The backend health endpoint is:

```text
/api/health/
```

## Backend Environment Variables

Copy values from [backend/.env.example](./backend/.env.example) into Render environment settings.

Important values:

```env
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=replace-with-a-long-random-secret
DJANGO_ALLOWED_HOSTS=api.yourdomain.in

CORS_ALLOWED_ORIGINS=https://yourdomain.in,https://www.yourdomain.in
CSRF_TRUSTED_ORIGINS=https://yourdomain.in,https://www.yourdomain.in

DB_ENGINE=postgresql
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=replace-with-supabase-db-password
DB_HOST=your-supabase-host
DB_PORT=5432
DB_SSLMODE=require

FRONTEND_BASE_URL=https://yourdomain.in

DEFAULT_FROM_EMAIL=Best Motors <no-reply@yourdomain.in>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_HOST_USER=your-smtp-user
EMAIL_HOST_PASSWORD=your-smtp-password
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_TIMEOUT=15
PASSWORD_RESET_TIMEOUT=3600

DJANGO_SESSION_COOKIE_SECURE=True
DJANGO_CSRF_COOKIE_SECURE=True
DJANGO_SESSION_COOKIE_SAMESITE=None
DJANGO_CSRF_COOKIE_SAMESITE=None
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=True
DJANGO_SECURE_HSTS_PRELOAD=True
DJANGO_SECURE_PROXY_SSL_HEADER=True
```

## Python Dependencies

Install from the repo root file:

```bash
pip install -r requirements.txt
```

Do not use `backend/requirements.txt`. That file does not exist.

## Build And Runtime Notes

- Backend static files are collected during Render build.
- Django migrations run during Render build.
- Gunicorn is already in [requirements.txt](./requirements.txt).
- Uploaded files are not safe on ephemeral storage.

## Media Storage

Your app stores:

- vehicle cover images
- gallery images/videos
- uploaded documents

Recommended production setup: Supabase Storage via the S3-compatible endpoint.

Code is already prepared for this. To enable it:

1. In Supabase Storage, create a public bucket such as `media`
2. Enable S3 access keys in Supabase Storage settings
3. Add these backend env vars in Render:

```env
SUPABASE_STORAGE_ENABLED=True
SUPABASE_STORAGE_BUCKET=media
SUPABASE_STORAGE_REGION=ap-south-1
SUPABASE_STORAGE_S3_ENDPOINT=https://your-project-ref.storage.supabase.co/storage/v1/s3
SUPABASE_STORAGE_PUBLIC_URL=https://your-project-ref.supabase.co/storage/v1/object/public/media
SUPABASE_STORAGE_ACCESS_KEY_ID=your-storage-access-key
SUPABASE_STORAGE_SECRET_ACCESS_KEY=your-storage-secret-key
```

Important notes:

- the bucket must be public if you want direct file URLs to work without signed URLs
- existing local files in `backend/media/` are not auto-migrated
- after enabling Supabase Storage, new uploads go to Supabase Storage automatically

Fallback option if you do not use Supabase Storage: Render persistent disk mounted to `DJANGO_MEDIA_ROOT`.

## Domain DNS

After Vercel and Render projects exist:

1. Connect `yourdomain.in` and `www.yourdomain.in` in Vercel
2. Connect `api.yourdomain.in` in Render
3. Add the DNS records requested by both platforms

Final URLs should look like:

- Frontend: `https://yourdomain.in`
- Backend API: `https://api.yourdomain.in/api/`
- Health check: `https://api.yourdomain.in/api/health/`

## Production Validation

Test all of these after deploy:

1. Open `https://yourdomain.in`
2. Refresh on a nested route like `/vehicle/ABC123`
3. Login
4. Logout
5. Add vehicle
6. Edit vehicle
7. Upload image
8. Upload PDF/JPG/JPEG document
9. Open document preview
10. Password reset request
11. Password reset email arrives
12. Reset link opens `yourdomain.in`, not `localhost`

## Cleanups Already Done

- Added frontend SPA rewrite config for Vercel
- Added backend health endpoint
- Limited document uploads to PDF/JPG/JPEG
- Removed local debug reset-link exposure from login UI
- Password reset flow now uses user-facing copy only
