# Generated by Django 3.2.15 on 2023-02-16 00:08

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('main_app', '0018_auto_20230216_0002'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='client',
            name='name_japanese',
        ),
        migrations.RemoveField(
            model_name='client',
            name='proper_name',
        ),
        migrations.RemoveField(
            model_name='client',
            name='proper_name_japanese',
        ),
    ]