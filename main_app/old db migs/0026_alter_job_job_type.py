# Generated by Django 3.2.15 on 2023-02-17 13:08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('main_app', '0025_job_allvendorinvoicesreceivd'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='job_type',
            field=models.CharField(choices=[('ORIGINAL', 'Original'), ('RENEWAL', 'Renewal'), ('LIBRARY', 'Library'), ('LICENSING', 'Licensing'), ('MISC', 'Misc'), ('RETAINER', 'Retainer')], default='Original', max_length=15),
        ),
    ]