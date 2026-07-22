import os
import django
import openpyxl

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, CSVUploadLog
from django.core.files.storage import default_storage

log_id = 'e7b02d82-803c-4cc9-8998-4ed6529bb834'
credentials_file_path = f"private_credentials/credentials_{log_id}.xlsx"

try:
    log = CSVUploadLog.objects.get(pk=log_id)
    print(f"Log ID: {log.id}")
    print(f"Total Success: {log.successful_records}")
    print(f"Created (New): {log.created_count}")
    print(f"Emails Sent Already: {log.sent_emails_count}")
    
    if not default_storage.exists(credentials_file_path):
        raise FileNotFoundError("Credentials sheet not found.")
        
    with default_storage.open(credentials_file_path, 'rb') as f:
        wb = openpyxl.load_workbook(f)
        ws = wb.active
        rows = list(ws.iter_rows(min_row=2, values_only=True))
        
    # Bulk fetch all student registration numbers and courses
    all_students = Student.objects.all().values('registration_number', 'course')
    student_course_map = {s['registration_number']: s['course'] or 'Unknown/No Course' for s in all_students}
    
    course_counts = {}
    no_temp_password_count = 0
    no_student_record_count = 0
    
    for row in rows:
        if not row or len(row) < 5:
            continue
        name, reg_no, login_id, email, temp_password = row
        reg_no_str = str(reg_no).strip() if reg_no is not None else ""
        
        if not (temp_password and temp_password != '(UNCHANGED)' and email):
            no_temp_password_count += 1
            continue
            
        student_course = student_course_map.get(reg_no_str)
        if student_course is None:
            no_student_record_count += 1
            continue
            
        course_counts[student_course] = course_counts.get(student_course, 0) + 1
        
    print("\nCourse-wise Breakdown of All Successfully Imported Students:")
    print("=" * 70)
    for course, count in sorted(course_counts.items(), key=lambda x: -x[1]):
        print(f"  {course:<55} | {count}")
    print("=" * 70)
    
except Exception as e:
    print(f"Error: {e}")
