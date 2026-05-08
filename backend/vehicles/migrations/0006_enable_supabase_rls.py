from django.db import migrations


TABLES = [
    "auth_group",
    "auth_group_permissions",
    "auth_permission",
    "auth_user",
    "auth_user_groups",
    "auth_user_user_permissions",
    "django_admin_log",
    "django_content_type",
    "django_migrations",
    "django_session",
    "transactions_expense",
    "transactions_purchase",
    "transactions_sale",
    "vehicles_activitylog",
    "vehicles_vehicle",
    "vehicles_vehicledocument",
    "vehicles_vehicleimage",
]


API_ROLES = ["anon", "authenticated"]


def enable_rls(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT rolname
            FROM pg_roles
            WHERE rolname IN (%s, %s)
            """,
            API_ROLES,
        )
        existing_api_roles = [row[0] for row in cursor.fetchall()]

        for table in TABLES:
            cursor.execute(f'ALTER TABLE IF EXISTS public."{table}" ENABLE ROW LEVEL SECURITY')

            for role in existing_api_roles:
                cursor.execute(f'REVOKE ALL PRIVILEGES ON TABLE public."{table}" FROM "{role}"')

        for role in existing_api_roles:
            cursor.execute(f'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM "{role}"')


def disable_rls(apps, schema_editor):
    with schema_editor.connection.cursor() as cursor:
        for table in reversed(TABLES):
            cursor.execute(f'ALTER TABLE IF EXISTS public."{table}" DISABLE ROW LEVEL SECURITY')


class Migration(migrations.Migration):

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("admin", "0003_logentry_add_action_flag_choices"),
        ("contenttypes", "0002_remove_content_type_name"),
        ("sessions", "0001_initial"),
        ("transactions", "0002_rename_labour_expense_amount_remove_expense_service_and_more"),
        ("vehicles", "0005_vehicle_archived_at_vehicle_is_archived"),
    ]

    operations = [
        migrations.RunPython(enable_rls, disable_rls),
    ]
