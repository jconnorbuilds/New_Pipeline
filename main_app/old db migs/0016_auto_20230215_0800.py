# Generated by Django 3.2.15 on 2023-02-15 08:00

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main_app', '0015_alter_job_calc_date'),
    ]

    operations = [
        migrations.RenameField(
            model_name='job',
            old_name='calc_date',
            new_name='job_date',
        ),
        migrations.AlterField(
            model_name='vendor',
            name='unique_id',
            field=models.CharField(default='NEW00', max_length=10),
        ),
    ]