from django.conf import settings
from django.utils.encoding import filepath_to_uri
from storages.backends.s3 import S3Storage


class SupabaseMediaStorage(S3Storage):
    default_acl = None
    file_overwrite = False
    querystring_auth = False

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("bucket_name", settings.SUPABASE_STORAGE_BUCKET)
        kwargs.setdefault("endpoint_url", settings.SUPABASE_STORAGE_S3_ENDPOINT)
        kwargs.setdefault("access_key", settings.SUPABASE_STORAGE_ACCESS_KEY_ID)
        kwargs.setdefault("secret_key", settings.SUPABASE_STORAGE_SECRET_ACCESS_KEY)
        kwargs.setdefault("region_name", settings.SUPABASE_STORAGE_REGION)
        kwargs.setdefault("default_acl", self.default_acl)
        kwargs.setdefault("file_overwrite", self.file_overwrite)
        kwargs.setdefault("querystring_auth", self.querystring_auth)
        kwargs.setdefault("addressing_style", "path")
        super().__init__(*args, **kwargs)

    def url(self, name, parameters=None, expire=None, http_method=None):
        clean_name = self._normalize_name(self._clean_name(name))
        return f"{settings.SUPABASE_STORAGE_PUBLIC_URL.rstrip('/')}/{filepath_to_uri(clean_name)}"
