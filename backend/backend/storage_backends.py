from django.conf import settings
from django.utils.encoding import filepath_to_uri
from storages.backends.s3 import S3Storage


class PublicS3MediaStorage(S3Storage):
    default_acl = None
    file_overwrite = False
    querystring_auth = False
    bucket_setting = ""
    endpoint_setting = ""
    access_key_setting = ""
    secret_key_setting = ""
    region_setting = ""
    public_url_setting = ""

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("bucket_name", getattr(settings, self.bucket_setting))
        kwargs.setdefault("endpoint_url", getattr(settings, self.endpoint_setting))
        kwargs.setdefault("access_key", getattr(settings, self.access_key_setting))
        kwargs.setdefault("secret_key", getattr(settings, self.secret_key_setting))
        kwargs.setdefault("region_name", getattr(settings, self.region_setting))
        kwargs.setdefault("default_acl", self.default_acl)
        kwargs.setdefault("file_overwrite", self.file_overwrite)
        kwargs.setdefault("querystring_auth", self.querystring_auth)
        kwargs.setdefault("addressing_style", "path")
        super().__init__(*args, **kwargs)

    def url(self, name, parameters=None, expire=None, http_method=None):
        clean_name = str(name).replace("\\", "/").lstrip("/")
        public_url = getattr(settings, self.public_url_setting).rstrip("/")
        return f"{public_url}/{filepath_to_uri(clean_name)}"


class SupabaseMediaStorage(PublicS3MediaStorage):
    bucket_setting = "SUPABASE_STORAGE_BUCKET"
    endpoint_setting = "SUPABASE_STORAGE_S3_ENDPOINT"
    access_key_setting = "SUPABASE_STORAGE_ACCESS_KEY_ID"
    secret_key_setting = "SUPABASE_STORAGE_SECRET_ACCESS_KEY"
    region_setting = "SUPABASE_STORAGE_REGION"
    public_url_setting = "SUPABASE_STORAGE_PUBLIC_URL"


class S3MediaStorage(PublicS3MediaStorage):
    bucket_setting = "S3_STORAGE_BUCKET"
    endpoint_setting = "S3_STORAGE_ENDPOINT_URL"
    access_key_setting = "S3_STORAGE_ACCESS_KEY_ID"
    secret_key_setting = "S3_STORAGE_SECRET_ACCESS_KEY"
    region_setting = "S3_STORAGE_REGION"
    public_url_setting = "S3_STORAGE_PUBLIC_URL"
