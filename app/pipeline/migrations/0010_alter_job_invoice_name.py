# Generated by Django 4.2.9 on 2024-05-08 08:47

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pipeline', '0009_remove_job_is_extension_of_job_is_extension_of'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='invoice_name',
            field=models.CharField(max_length=100, null=True),
        ),
    ]