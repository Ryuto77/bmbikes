from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vehicles', '0006_enable_supabase_rls'),
    ]

    operations = [
        migrations.AlterField(
            model_name='vehicleimage',
            name='image',
            field=models.FileField(upload_to='vehicles/'),
        ),
    ]
