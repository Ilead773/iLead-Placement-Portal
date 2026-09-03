import os
import sys
import time
import django
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')

from pathlib import Path
try:
    import dotenv
    prod_env = Path(__file__).resolve().parent / '.env.production'
    if prod_env.exists():
        dotenv.load_dotenv(prod_env, override=True)
except ImportError:
    pass

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, User

excel_path = r"c:\Users\shahi\OneDrive\Documents\iLEAD_Placement_portal\RedApple_166 students.xlsx"
primary_output_path = r"c:\Users\shahi\OneDrive\Documents\iLEAD_Placement_portal\RedApple_166_Students_Status_Report.xlsx"
fallback_output_path = r"c:\Users\shahi\OneDrive\Documents\iLEAD_Placement_portal\RedApple_166_Students_Status_Report_v2.xlsx"

print("=== READING REDAPPLE 166 STUDENTS EXCEL FILE ===", flush=True)
df = pd.read_excel(excel_path)
total_count = len(df)
print(f"Total rows in Excel: {total_count}", flush=True)

print("=== BULK LOADING DATABASE RECORDS ===", flush=True)

# Fetch with retries in case of DNS glitch
all_students = []
all_users = []
max_retries = 3

for attempt in range(1, max_retries + 1):
    try:
        all_students = list(Student.objects.select_related('user').all())
        all_users = list(User.objects.all())
        print(f"Successfully loaded {len(all_students)} students and {len(all_users)} users from DB.", flush=True)
        break
    except Exception as err:
        print(f"DB connection attempt {attempt} failed: {err}. Retrying in 2 seconds...", flush=True)
        time.sleep(2)
        if attempt == max_retries:
            raise err

student_by_roll = {str(s.registration_number).strip().lower(): s for s in all_students if s.registration_number}
student_by_email = {str(s.email).strip().lower(): s for s in all_students if s.email}

user_by_login = {str(u.login_id).strip().lower(): u for u in all_users if u.login_id}
user_by_email = {str(u.email).strip().lower(): u for u in all_users if u.email}

logged_in_list = []
not_logged_in_list = []
no_account_list = []

for idx, row in df.iterrows():
    sl_no = row.get('SL No')
    name = str(row.get('Students Name', '')).strip()
    email = str(row.get('Email ID', '')).strip().lower()
    
    roll_val = row.get('Roll Number')
    if pd.isna(roll_val):
        roll = ''
    else:
        try:
            roll = str(int(roll_val)).strip()
        except Exception:
            roll = str(roll_val).strip()

    course = str(row.get('Course Nmae', '')).strip()
    semester = row.get('Semester')
    school = str(row.get('School', '')).strip()
    phone = str(row.get('Phone Number', '')).strip()

    roll_key = roll.lower()
    user = user_by_login.get(roll_key) or user_by_email.get(email)
    student = student_by_roll.get(roll_key) or student_by_email.get(email)

    if not user and student:
        user = getattr(student, 'user', None)

    item_data = {
        'SL No': sl_no,
        'Students Name': name,
        'Roll Number': roll,
        'Email ID': email,
        'Phone Number': phone,
        'Course Name': course,
        'Semester': semester,
        'School': school,
    }

    if not user and not student:
        item_data['Status'] = 'No Account'
        item_data['DB Email'] = 'N/A'
        item_data['DB Roll'] = 'N/A'
        no_account_list.append(item_data)
    else:
        db_email = user.email if user else (student.email if student else 'N/A')
        db_roll = user.login_id if user else (student.registration_number if student else 'N/A')
        item_data['DB Email'] = db_email
        item_data['DB Roll'] = db_roll
        
        has_logged_in = False
        if user:
            if not user.temp_password_flag or user.last_login is not None:
                has_logged_in = True

        if has_logged_in:
            item_data['Status'] = 'Logged In'
            item_data['Last Login'] = str(user.last_login) if user and user.last_login else 'Password Changed (Logged In)'
            logged_in_list.append(item_data)
        else:
            item_data['Status'] = 'Not Logged In Yet'
            item_data['Temp Password Flag'] = user.temp_password_flag if user else True
            not_logged_in_list.append(item_data)

count_logged_in = len(logged_in_list)
count_not_logged_in = len(not_logged_in_list)
count_no_account = len(no_account_list)

pct_logged_in = (count_logged_in / total_count * 100) if total_count else 0
pct_not_logged_in = (count_not_logged_in / total_count * 100) if total_count else 0
pct_no_account = (count_no_account / total_count * 100) if total_count else 0

stats_data = [
    {'Metric': 'Total Students Analyzed', 'Count': total_count, 'Percentage': '100.00%'},
    {'Metric': 'Logged In Students', 'Count': count_logged_in, 'Percentage': f"{pct_logged_in:.2f}%"},
    {'Metric': 'Not Logged In Yet', 'Count': count_not_logged_in, 'Percentage': f"{pct_not_logged_in:.2f}%"},
    {'Metric': 'No Account Found', 'Count': count_no_account, 'Percentage': f"{pct_no_account:.2f}%"},
]
df_stats = pd.DataFrame(stats_data)

print("\n=== SUMMARY BREAKDOWN ===", flush=True)
print(f"Total Students Analyzed: {total_count}", flush=True)
print(f"1. Logged In: {count_logged_in} ({pct_logged_in:.2f}%)", flush=True)
print(f"2. Not Logged In Yet: {count_not_logged_in} ({pct_not_logged_in:.2f}%)", flush=True)
print(f"3. No Account: {count_no_account} ({pct_no_account:.2f}%)", flush=True)

df_logged_in = pd.DataFrame(logged_in_list)
df_not_logged_in = pd.DataFrame(not_logged_in_list)
df_no_account = pd.DataFrame(no_account_list)

if df_logged_in.empty:
    df_logged_in = pd.DataFrame(columns=['SL No', 'Students Name', 'Roll Number', 'Email ID', 'Phone Number', 'Course Name', 'Semester', 'School', 'Status', 'DB Email', 'DB Roll', 'Last Login'])
if df_not_logged_in.empty:
    df_not_logged_in = pd.DataFrame(columns=['SL No', 'Students Name', 'Roll Number', 'Email ID', 'Phone Number', 'Course Name', 'Semester', 'School', 'Status', 'DB Email', 'DB Roll', 'Temp Password Flag'])
if df_no_account.empty:
    df_no_account = pd.DataFrame(columns=['SL No', 'Students Name', 'Roll Number', 'Email ID', 'Phone Number', 'Course Name', 'Semester', 'School', 'Status', 'DB Email', 'DB Roll'])

target_file = primary_output_path
try:
    with pd.ExcelWriter(target_file, engine='openpyxl') as writer:
        df_stats.to_excel(writer, sheet_name='Statistics', index=False)
        df_logged_in.to_excel(writer, sheet_name='Logged In', index=False)
        df_not_logged_in.to_excel(writer, sheet_name='Not Logged In Yet', index=False)
        df_no_account.to_excel(writer, sheet_name='No Account', index=False)
except PermissionError:
    target_file = fallback_output_path
    with pd.ExcelWriter(target_file, engine='openpyxl') as writer:
        df_stats.to_excel(writer, sheet_name='Statistics', index=False)
        df_logged_in.to_excel(writer, sheet_name='Logged In', index=False)
        df_not_logged_in.to_excel(writer, sheet_name='Not Logged In Yet', index=False)
        df_no_account.to_excel(writer, sheet_name='No Account', index=False)

print(f"\n4-Sheet Excel file successfully generated at:\n{target_file}", flush=True)
