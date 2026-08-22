import os, django

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

print("=== UNLOCKING ACCOUNTS ===")

locked_users = ['28943224035', '28943224022', '28941624057'] # Shamir, Mobashir, Shirsha

for login_id in locked_users:
    try:
        u = User.objects.get(login_id=login_id)
        u.failed_login_attempts = 0
        u.locked_until = None
        u.save(update_fields=['failed_login_attempts', 'locked_until'])
        print(f"  Successfully UNLOCKED: {u.name} ({login_id})")
    except Exception as e:
        print(f"  Error unlocking {login_id}: {e}")
