# Generated by Django 4.2.1 on 2023-11-22 06:35

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pipeline', '0006_alter_job_vendors'),
    ]

    operations = [
        migrations.AlterField(
            model_name='vendor',
            name='jobs',
            field=models.ManyToManyField(blank=True, null=True, to='pipeline.job'),
        ),
    ]
