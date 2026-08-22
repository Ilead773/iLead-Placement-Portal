import os, django
import boto3
import openpyxl
import io

# Set up Django
os.environ['DATABASE_URL'] = 'postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:6543/postgres'
os.environ['SECRET_KEY'] = 'yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP'
os.environ['DEBUG'] = 'False'
os.environ['ALLOWED_HOSTS'] = 'ilead-backend-production-20f7.up.railway.app'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

AWS_ACCESS_KEY_ID = "a90d0f2aa32c6cd80cb190dd7ea989b4"
AWS_SECRET_ACCESS_KEY = "f089021b643dc75cc51a580f9ae624fc51f8c9fb2e36ee924eebdea7b297dec3"
AWS_S3_ENDPOINT_URL = "https://ab9b5823c0dc84b7a80379d26b932ace.r2.cloudflarestorage.com"
AWS_STORAGE_BUCKET_NAME = "ilead-portal-media"

s3 = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    endpoint_url=AWS_S3_ENDPOINT_URL
)

targets = {
    '28943224029': 'Purbita Biswas',
    '28943224022': 'Md Mobashir Nawab',
    '28943224012': 'Swapnanil Maity',
    '28943224035': 'Sk md Shamir',
    '28941624057': 'Shirsha Das' # including Shirsha to double check
}

print("Searching all 17 R2 objects for our target students...")

response = s3.list_objects_v2(Bucket=AWS_STORAGE_BUCKET_NAME, Prefix="private_credentials/")
contents = response.get('Contents', [])

results = {}

for item in contents:
    key = item['Key']
    try:
        res = s3.get_object(Bucket=AWS_STORAGE_BUCKET_NAME, Key=key)
        data = res['Body'].read()
        wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
        ws = wb.active
        for row in ws.iter_rows(values_only=True):
            if len(row) >= 5:
                reg_no = str(row[1]).strip()
                if reg_no in targets:
                    results[reg_no] = {
                        'name': row[0],
                        'reg_no': reg_no,
                        'email': row[3],
                        'temp_pw': row[4],
                        'file': key,
                        'date': item['LastModified'].strftime('%Y-%m-%d %H:%M')
                    }
    except Exception as e:
        print(f"  Error reading {key}: {e}")

print("\n=== MATCHED ORIGINAL CREDENTIALS ===")
for reg_no, info in results.items():
    u = User.objects.get(login_id=reg_no)
    print(f"\nStudent: {info['name']} ({reg_no})")
    print(f"  Email:              {info['email']}")
    print(f"  Excel Temp PW:      {info['temp_pw']}")
    print(f"  Generated on:       {info['date']}")
    print(f"  Flag (temp_pass):   {u.temp_password_flag}")
    print(f"  Flag (reset_req):   {u.password_reset_required}")
    
    # Check if the original temp password actually works
    orig_pw = info['temp_pw']
    if orig_pw and orig_pw != '(UNCHANGED)':
        # Let's test standard visual typo variations as well
        variations = [orig_pw]
        for c in ['0', 'O', 'o']:
            for p in ['1', 'l', 'I']:
                variations.append(orig_pw.replace('0', c).replace('O', c).replace('o', c).replace('1', p).replace('l', p).replace('I', p))
        variations = list(set(variations))
        
        matched_var = None
        for v in variations:
            if u.check_password(v):
                matched_var = v
                break
                
        if matched_var:
            if matched_var == orig_pw:
                print("  => STATUS: Original temporary password works! (User is typing it wrong/different layout)")
            else:
                print(f"  => STATUS: Visual Typo match found! Correct string is: '{matched_var}'")
        else:
            print("  => STATUS: Original temporary password does NOT match DB hash. (User changed password, or database was re-seeded)")
    else:
        print("  => STATUS: No temporary password (flagged as UNCHANGED during this upload)")
