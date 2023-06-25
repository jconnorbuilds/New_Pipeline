# Generated by Django 4.2.1 on 2023-06-20 06:02

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pipeline', '0013_alter_job_revenue'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='add_consumption_tax',
            field=models.BooleanField(default=True),
        ),
        migrations.AlterField(
            model_name='job',
            name='job_type',
            field=models.CharField(choices=[('ORIGINAL', 'Original'), ('RENEWAL', 'Renewal'), ('LIBRARY', 'Library'), ('LICENSING', 'Licensing'), ('MISC', 'Misc'), ('RETAINER', 'Retainer')], default='ORIGINAL', max_length=15),
        ),
    ]
