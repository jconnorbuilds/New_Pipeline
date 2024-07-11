# Generated by Django 4.2.9 on 2024-04-17 15:34

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pipeline', '0007_alter_vendor_jobs'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='is_extension_of',
            field=models.ManyToManyField(blank=True, to='pipeline.job'),
        ),
        migrations.AlterField(
            model_name='cost',
            name='currency',
            field=models.CharField(choices=[('JPY', '¥'), ('USD', '$'), ('CAD', 'CA$'), ('AUD', 'AU$'), ('EUR', '€'), ('GBP', '£'), ('THB', '฿')], default='¥', max_length=10),
        ),
        migrations.AlterField(
            model_name='cost',
            name='pay_period',
            field=models.DateField(blank=True, null=True),
        ),
    ]
