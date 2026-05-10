seperate page from login for password reset
/django-admin for django login (my site name/django-admin)
remove touchable mark as sold and mark as unsold from dashboard
make pages dynamic, some things only update after a refresh
change page title accordingly with Best Motors or BM
chnage the web title logo
should not be able to touch the tiles on slide show in dashboard only open when clicked on image or other than the tiles


are all these required in render env?
{
    CORS_ALLOWED_ORIGINS=https://bmbikes.vercel.app
CSRF_TRUSTED_ORIGINS=https://bmbikes.vercel.app
DB_DISABLE_SERVER_SIDE_CURSORS=True
DB_ENGINE=postgresql
DB_HOST=aws-1-ap-south-1.pooler.supabase.com
DB_NAME=postgres
DB_PASSWORD=BestMotors@8080
DB_PORT=5432
DB_SSLMODE=require
DB_USER=postgres.ahylerycccltyzwmucol
DEFAULT_FROM_EMAIL="Best Motors <zackff256@gmail.com>"
DJANGO_ALLOWED_HOSTS=.onrender.com,localhost,127.0.0.1
DJANGO_CSRF_COOKIE_SAMESITE=None
DJANGO_CSRF_COOKIE_SECURE=True
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=cz6!%*24m6aw^y26k8&4
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=True
DJANGO_SECURE_HSTS_PRELOAD=True
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_PROXY_SSL_HEADER=True
DJANGO_SECURE_SSL_REDIRECT=True
DJANGO_SESSION_COOKIE_SAMESITE=None
DJANGO_SESSION_COOKIE_SECURE=True
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=in-v3.mailjet.com
EMAIL_HOST_PASSWORD=be9613a0f0d7429b1e261cf4936cc35d
EMAIL_HOST_USER=0570898b0d3090e0962aae56c02c6926
EMAIL_PORT=587
EMAIL_TIMEOUT=15
EMAIL_USE_SSL=False
EMAIL_USE_TLS=True
FRONTEND_BASE_URL=https://bmbikes.vercel.app
PASSWORD_RESET_TIMEOUT=3600
S3_STORAGE_ACCESS_KEY_ID=39bf55624536f46dcd218cdf2ee2dded
S3_STORAGE_BUCKET=media
S3_STORAGE_ENABLED=True
S3_STORAGE_ENDPOINT_URL=https://a94ba531723fdd76ac91c48dade6898e.r2.cloudflarestorage.com
S3_STORAGE_PUBLIC_URL=https://pub-e9461cc4e2c64693a7073c9ff7743585.r2.dev
S3_STORAGE_REGION=auto
S3_STORAGE_SECRET_ACCESS_KEY=a2b6722ffffcf760a7749d95c60dcf4bc338a4c8c5935f5961d0143ea84ab593
SUPABASE_STORAGE_ACCESS_KEY_ID=9ae20bba4d15760ba2227b3b0e0d1c7f
SUPABASE_STORAGE_BUCKET=media
SUPABASE_STORAGE_ENABLED=False
SUPABASE_STORAGE_PUBLIC_URL=https://ahylerycccltyzwmucol.supabase.co/storage/v1/object/public/media
SUPABASE_STORAGE_REGION=ap-south-1
SUPABASE_STORAGE_S3_ENDPOINT=https://ahylerycccltyzwmucol.storage.supabase.co/storage/v1/s3
SUPABASE_STORAGE_SECRET_ACCESS_KEY=06a2cb2709c8a8c214b82bd960de3583988153e9582bf44f6a8b31141ead3b1d
}