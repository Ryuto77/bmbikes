# Deployment Env Notes

Do not commit real secrets here. Keep actual values in the hosting provider's environment variables or secret manager.

## Backend Required

```env
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=replace-with-secret
DJANGO_ALLOWED_HOSTS=.onrender.com

FRONTEND_BASE_URL=https://bmbikes.vercel.app
CORS_ALLOWED_ORIGINS=https://bmbikes.vercel.app
CSRF_TRUSTED_ORIGINS=https://bmbikes.vercel.app

DB_ENGINE=postgresql
DB_NAME=postgres
DB_USER=replace-with-supabase-db-user
DB_PASSWORD=replace-with-supabase-db-password
DB_HOST=replace-with-supabase-pooler-host
DB_PORT=5432
DB_SSLMODE=require
DB_DISABLE_SERVER_SIDE_CURSORS=True

S3_STORAGE_ENABLED=True
S3_STORAGE_BUCKET=media
S3_STORAGE_REGION=auto
S3_STORAGE_ENDPOINT_URL=replace-with-r2-endpoint
S3_STORAGE_PUBLIC_URL=replace-with-r2-public-url
S3_STORAGE_ACCESS_KEY_ID=replace-with-r2-access-key-id
S3_STORAGE_SECRET_ACCESS_KEY=replace-with-r2-secret-access-key

DEFAULT_FROM_EMAIL=Best Motors <no-reply@example.com>
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_HOST_USER=replace-with-smtp-user
EMAIL_HOST_PASSWORD=replace-with-smtp-password
EMAIL_USE_TLS=True
```

## Frontend Required

```env
VITE_API_BASE_URL=https://your-render-api.onrender.com/api/
```

## Not Needed For Current Setup

Supabase Storage variables are not needed while `S3_STORAGE_ENABLED=True` and `SUPABASE_STORAGE_ENABLED=False`.
