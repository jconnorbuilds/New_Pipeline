# Generated by Django 4.2.1 on 2023-06-24 03:21

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pipeline', '0017_remove_job_invoice_recipient_alter_job_client'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='invoice_recipient',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='pipeline.client'),
        ),
    ]