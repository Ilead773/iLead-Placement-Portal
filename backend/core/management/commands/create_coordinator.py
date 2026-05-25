# core/management/commands/create_coordinator.py
"""
Management command to create a placement coordinator user.
Usage: python manage.py create_coordinator --login-id coord1 --email coord1@ilead.edu --password Coord@1234
"""
from django.core.management.base import BaseCommand
from core.models import User


class Command(BaseCommand):
    help = 'Create a placement coordinator user'

    def add_arguments(self, parser):
        parser.add_argument('--login-id', type=str, required=True, help='Coordinator login ID')
        parser.add_argument('--email', type=str, required=True, help='Coordinator email')
        parser.add_argument('--name', type=str, default='Coordinator', help='Coordinator name')
        parser.add_argument('--password', type=str, default='Coord@1234', help='Password')

    def handle(self, *args, **options):
        login_id = options['login_id']
        email = options['email']

        if User.objects.filter(login_id=login_id).exists():
            self.stdout.write(self.style.WARNING(f'User "{login_id}" already exists.'))
            return

        User.objects.create_user(
            login_id=login_id,
            email=email,
            password=options['password'],
            name=options['name'],
            role='coordinator',
            is_staff=True,
            temp_password_flag=False,
            password_reset_required=False,
        )
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Coordinator created!\n'
            f'   Login ID : {login_id}\n'
            f'   Email    : {email}\n'
            f'   Password : {options["password"]}\n'
        ))
