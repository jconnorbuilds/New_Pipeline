# Generated by Django 4.2.1 on 2023-06-24 03:17

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pipeline', '0016_rename_paid_to_job_invoice_recipient'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='job',
            name='invoice_recipient',
        ),
        migrations.AlterField(
            model_name='job',
            name='client',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='jobs_by_client', to='pipeline.client'),
        ),
    ]
