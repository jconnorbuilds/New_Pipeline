# Generated by Django 3.2.15 on 2023-02-19 13:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main_app', '0030_alter_job_relatedjobs'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='relatedJobs',
            field=models.ManyToManyField(null=True, related_name='_main_app_job_relatedJobs_+', to='main_app.Job'),
        ),
    ]