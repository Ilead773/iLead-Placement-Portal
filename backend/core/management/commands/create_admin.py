# core/management/commands/create_admin.py
"""
Management command to create the first admin user.
Usage: python manage.py create_admin
"""
from django.core.management.base import BaseCommand
from core.models import User


class Command(BaseCommand):
    help = 'Create an admin user for initial setup'

    def add_arguments(self, parser):
        parser.add_argument('--login-id', type=str, default='admin', help='Admin login ID (default: admin)')
        parser.add_argument('--email', type=str, default='admin@ilead.edu', help='Admin email')
        parser.add_argument('--name', type=str, default='System Admin', help='Admin name')
        parser.add_argument('--password', type=str, default='Admin@1234', help='Admin password')

    def handle(self, *args, **options):
        login_id = options['login_id']
        email = options['email']
        name = options['name']
        password = options['password']

        if User.objects.filter(login_id=login_id).exists():
            self.stdout.write(self.style.WARNING(f'Admin "{login_id}" already exists. Skipping.'))
            return

        user = User.objects.create_superuser(
            login_id=login_id,
            email=email,
            password=password,
            name=name,
        )
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Admin created successfully!\n'
            f'   Login ID : {login_id}\n'
            f'   Email    : {email}\n'
            f'   Password : {password}\n'
            f'   Role     : admin\n'
        ))
