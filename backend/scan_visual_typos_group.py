import os, django
import requests
import openpyxl
import io
import boto3

os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

# R2 Configuration
AWS_ACCESS_KEY_ID = "a90d0f2aa32c6cd80cb190dd7ea989b4"
AWS_SECRET_ACCESS_KEY = "f089021b643dc75cc51a580f9ae624fc51f8c9fb2e36ee924eebdea7b297dec3"
AWS_S3_ENDPOINT_URL = "https://ab9b5823c0dc84b7a80379d26b932ace.r2.cloudflarestorage.com"
AWS_STORAGE_BUCKET_NAME = "ilead-portal-media"

print("Connecting to R2 to look up original generated temp passwords...")
s3 = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    endpoint_url=AWS_S3_ENDPOINT_URL
)

from core.models import CSVUploadLog
logs = CSVUploadLog.objects.filter(status='success').order_by('-uploaded_at')

targets = ['28943224012', '28943224035'] # Swapnanil, Shamir
temp_pws = {}

for log in logs:
    key = f"private_credentials/credentials_{log.id}.xlsx"
    try:
        response = s3.get_object(Bucket=AWS_STORAGE_BUCKET_NAME, Key=key)
        data = response['Body'].read()
        wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
        ws = wb.active
        for row in ws.iter_rows(values_only=True):
            if len(row) >= 5 and str(row[1]).strip() in targets:
                temp_pws[str(row[1]).strip()] = row[4]
    except Exception:
        pass

print("\n=== SCANNING SWAPNANIL AND SHAMIR ===")

for reg_no in targets:
    u = User.objects.get(login_id=reg_no)
    orig_pw = temp_pws.get(reg_no, "UNKNOWN")
    print(f"\nStudent: {u.name} ({reg_no})")
    print(f"  Original Temp PW in Excel: {orig_pw}")
    
    if orig_pw != "UNKNOWN":
        # Check standard visual variations
        variations = [orig_pw]
        # Replace 0/O/o
        for c in ['0', 'O', 'o']:
            for p in ['1', 'l', 'I']:
                variations.append(orig_pw.replace('0', c).replace('O', c).replace('o', c).replace('1', p).replace('l', p).replace('I', p))
        
        # Remove duplicates
        variations = list(set(variations))
        
        matched = False
        for v in variations:
            if u.check_password(v):
                print(f"  MATCH FOUND: '{v}' works!")
                matched = True
                break
        if not matched:
            print("  No visual variations matched. The password might have been manually changed or re-seeded.")
    else:
        print("  Could not find original password in R2 logs.")
