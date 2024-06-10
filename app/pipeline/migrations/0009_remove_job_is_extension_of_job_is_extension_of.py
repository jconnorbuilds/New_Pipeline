# Generated by Django 4.2.9 on 2024-04-27 07:09

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pipeline', '0008_job_is_extension_of_alter_cost_currency_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='job',
            name='is_extension_of',
        ),
        migrations.AddField(
            model_name='job',
            name='is_extension_of',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='pipeline.job'),
        ),
    ]