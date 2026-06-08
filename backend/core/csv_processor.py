import csv
import io
import re
import logging
from django.db import transaction
from .models import User, Student, CSVUploadLog

logger = logging.getLogger('core')


def _detect_encoding(content_bytes):
    """Auto-detect file encoding. Falls back to utf-8 with replacement."""
    try:
        import chardet
        detected = chardet.detect(content_bytes)
        encoding = detected.get('encoding') or 'utf-8'
        confidence = detected.get('confidence', 0)
        logger.info(f"CSV encoding detected: {encoding} (confidence: {confidence:.0%})")
        return encoding
    except ImportError:
        # chardet not installed — try common encodings in order
        for enc in ['utf-8-sig', 'utf-8', 'cp1252', 'latin-1']:
            try:
                content_bytes.decode(enc)
                return enc
            except (UnicodeDecodeError, LookupError):
                continue
        return 'utf-8'


def _validate_email(email, row_num):
    """Pre-validate email format before hitting the DB."""
    if not email:
        raise ValueError(f"Row {row_num}: Email is required. Cannot create a student account without an email.")
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        raise ValueError(f"Row {row_num}: Invalid email format: '{email}'")
    return email.lower().strip()


def _validate_phone(phone, row_num):
    """Normalize and validate phone number."""
    if not phone:
        return ''
    # Strip spaces, dashes, parentheses
    phone_clean = re.sub(r'[\s\-\(\)\.]', '', phone)
    # Allow optional + prefix, then 10-13 digits
    if not re.match(r'^\+?\d{10,13}$', phone_clean):
        raise ValueError(f"Row {row_num}: Invalid phone number: '{phone}'. Expected 10-13 digits.")
    return phone_clean


def _validate_cgpa(marks_str, row_num):
    """Validate CGPA is within 0-10 range with helpful error for percentage mistakes."""
    if not marks_str:
        return None
    try:
        val = float(marks_str)
    except ValueError:
        raise ValueError(f"Row {row_num}: CGPA '{marks_str}' is not a valid number.")
    if val < 0:
        raise ValueError(f"Row {row_num}: CGPA cannot be negative: {val}")
    if val > 10:
        raise ValueError(
            f"Row {row_num}: CGPA {val} is out of range (0-10). "
            f"Did you enter a percentage by mistake? If CGPA is {val}, divide by 10."
        )
    return val


def _validate_semester(semester_str, row_num):
    """Validate semester is within 1-12."""
    if not semester_str:
        return None
    try:
        val = int(semester_str)
    except ValueError:
        raise ValueError(f"Row {row_num}: Semester '{semester_str}' is not a valid integer.")
    if val < 1 or val > 12:
        raise ValueError(f"Row {row_num}: Semester {val} is out of range (must be 1-12).")
    return val


def _validate_attendance(attendance_str, row_num):
    """Validate attendance is within 0-100."""
    if not attendance_str:
        return None
    try:
        val = float(attendance_str)
    except ValueError:
        raise ValueError(f"Row {row_num}: Attendance '{attendance_str}' is not a valid number.")
    if val < 0 or val > 100:
        raise ValueError(f"Row {row_num}: Attendance {val} is out of range (must be 0-100).")
    return val


def _validate_passing_year(year_str, row_num):
    """Validate passing year is a reasonable 4-digit year."""
    if not year_str:
        return None
    try:
        val = int(year_str)
    except ValueError:
        raise ValueError(f"Row {row_num}: Passing year '{year_str}' is not a valid year (expected e.g. 2025).")
    if val < 2000 or val > 2100:
        raise ValueError(f"Row {row_num}: Passing year {val} seems invalid (expected 2000-2100).")
    return val


def _detect_dialect(decoded_file):
    """Auto-detect CSV delimiter (comma, semicolon, tab, pipe)."""
    sample = decoded_file[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=',;\t|')
        return dialect
    except csv.Error:
        return csv.excel  # fallback to standard comma-delimited


def process_csv(content_bytes, uploaded_by, file_name="import.csv"):
    """
    Parses CSV content and creates User/Student records.
    Handles multiple encodings, delimiters, and validates all fields
    with human-readable error messages.

    Returns: (list_of_credentials, upload_log_object)
    """
    # --- Step 1: Detect encoding & decode ---
    encoding = _detect_encoding(content_bytes)
    try:
        decoded_file = content_bytes.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        # Last resort: decode with replacement characters
        decoded_file = content_bytes.decode('utf-8', errors='replace')
        logger.warning(f"CSV decoding fell back to utf-8 with replacement chars (original: {encoding})")

    # Strip BOM if present
    if decoded_file.startswith('\ufeff'):
        decoded_file = decoded_file[1:]

    # --- Step 2: Check for binary content ---
    if '\x00' in decoded_file[:1024]:
        raise ValueError("File appears to be binary, not a valid CSV text file.")

    # --- Step 3: Detect delimiter & parse ---
    dialect = _detect_dialect(decoded_file)
    io_string = io.StringIO(decoded_file)
    reader = csv.DictReader(io_string, dialect=dialect)

    # --- Step 4: Validate we have headers ---
    if reader.fieldnames is None or len(reader.fieldnames) == 0:
        raise ValueError("CSV file has no headers. Expected columns: Name, Registration Number, Email ID, etc.")

    # Check for suspiciously few columns (likely wrong delimiter)
    if len(reader.fieldnames) == 1 and ',' in reader.fieldnames[0]:
        raise ValueError(
            f"CSV appears to have only 1 column: '{reader.fieldnames[0]}'. "
            "The delimiter may be wrong. Please ensure the file is comma-separated."
        )

    total = 0
    success = 0
    fail = 0
    error_details = []
    credentials = []
    seen_reg_nos = set()  # Track duplicates within the same upload

    for row in reader:
        total += 1
        try:
            with transaction.atomic():
                # Extract and clean data with flexible header matching
                name = (row.get('Name') or row.get('name') or row.get('Full Name') or '').strip()
                
                reg_no = (row.get('Registration Number') or row.get('registration_number') or 
                          row.get('Reg No') or row.get('reg_no') or row.get('ID') or '').strip()
                
                email_raw = (row.get('Email ID') or row.get('email') or row.get('Email') or '').strip()
                
                course_raw = (row.get('Course') or row.get('course') or '').strip()
                from apps.scraped_jobs.course_config import normalize_course_name
                course = normalize_course_name(course_raw)
                stream = (row.get('Stream') or row.get('stream') or row.get('Department') or '').strip()
                
                semester_raw = (row.get('Semester') or row.get('semester') or '').strip()
                attendance_raw = (row.get('Attendance') or row.get('attendance') or row.get('Attendanc') or '').strip()
                
                # Flexible CGPA matching
                marks_raw = (row.get('Marks (CGPA)') or row.get('marks') or row.get('CGPA') or 
                         row.get('Marks') or row.get('cgpa') or '').strip()
                
                passing_year_raw = (row.get('Passing Year') or row.get('passing_year') or row.get('Year of Passing') or '').strip()
                
                # Flexible Phone matching
                phone_raw = (row.get('Phone Number') or row.get('phone_number') or row.get('Phone') or 
                         row.get('Mobile') or row.get('Contact') or '').strip()
                
                year_raw = (row.get('Year') or row.get('year') or '').strip().lower()
                if '4' in year_raw:
                    year = '4th'
                elif '3' in year_raw:
                    year = '3rd'
                elif '2' in year_raw:
                    year = '2nd'
                elif '1' in year_raw:
                    year = '1st'
                else:
                    year = None

                category_raw = (row.get('Category') or row.get('category') or '').strip().upper()
                if 'A' in category_raw:
                    category = 'A'
                elif 'B' in category_raw:
                    category = 'B'
                elif 'C' in category_raw:
                    category = 'C'
                else:
                    category = None
                
                backlogs_raw = str(row.get('Backlogs') or row.get('backlogs') or '').strip().lower()
                backlogs = backlogs_raw in ['yes', 'true', '1', 'y']

                training_attendance_raw = (row.get('Training Attendance') or row.get('training_attendance') or '').strip()
                backlogs_count_raw = (row.get('Backlog Count') or row.get('Backlogs Count') or row.get('backlogs_count') or '').strip()

                # ===== VALIDATION PHASE =====
                if not name:
                    raise ValueError(f"Row {total}: Student name is missing.")
                if not reg_no:
                    raise ValueError(f"Row {total}: Registration number is missing.")

                # Check for duplicate reg_no within the same CSV
                reg_no_key = reg_no.lower()
                if reg_no_key in seen_reg_nos:
                    raise ValueError(
                        f"Row {total}: Duplicate registration number '{reg_no}' found in this CSV. "
                        "Each student should appear only once."
                    )
                seen_reg_nos.add(reg_no_key)

                # Validate all fields with human-readable errors
                email = _validate_email(email_raw, total)
                phone = _validate_phone(phone_raw, total)
                cgpa = _validate_cgpa(marks_raw, total)
                semester = _validate_semester(semester_raw, total)
                attendance = _validate_attendance(attendance_raw, total)
                
                training_attendance = _validate_attendance(training_attendance_raw, total) if training_attendance_raw else (attendance if attendance is not None else 100.0)
                try:
                    backlogs_count = int(backlogs_count_raw) if backlogs_count_raw else (1 if backlogs else 0)
                except ValueError:
                    raise ValueError(f"Row {total}: Backlog count '{backlogs_count_raw}' is not a valid integer.")

                passing_year = _validate_passing_year(passing_year_raw, total)

                # Generate Login ID (lowercase registration number)
                login_id = reg_no.lower()
                
                # Production-grade Upsert & Conflict Detection Logic
                existing_user = User.objects.filter(login_id=login_id).first()
                email_owner = User.objects.filter(email=email).first()
                
                # Check for email conflicts
                if email_owner and (not existing_user or email_owner.id != existing_user.id):
                    raise ValueError(f"Row {total}: Email '{email}' is already registered to another user.")

                # Check for duplicate registration number conflicts (different student/email)
                if existing_user and existing_user.email != email:
                    raise ValueError(f"Row {total}: Duplicate registration number: '{reg_no}' is already registered to another user.")

                if existing_user:
                    # Update existing user and their student profile
                    existing_user.email = email
                    existing_user.name = name
                    existing_user.save()
                    
                    try:
                        student = Student.objects.get(user=existing_user)
                    except Student.DoesNotExist:
                        raise ValueError(
                            f"Row {total}: User '{login_id}' exists but has no student profile. "
                            "This may be an admin or coordinator account."
                        )

                    student.name = name
                    student.email = email
                    student.passing_year = passing_year if passing_year is not None else student.passing_year
                    student.course = course
                    student.stream = stream
                    student.semester = semester if semester is not None else student.semester
                    student.attendance = attendance if attendance is not None else student.attendance
                    student.training_attendance = training_attendance
                    student.backlogs_count = backlogs_count
                    student.cgpa = cgpa if cgpa is not None else student.cgpa
                    student.phone_number = phone if phone else student.phone_number
                    student.year = year if year else student.year
                    student.category = category if category else student.category
                    student.backlogs = backlogs if backlogs_raw else student.backlogs
                    student.full_clean()
                    student.save()
                    
                    credentials.append({
                        'name': name,
                        'registration_number': reg_no,
                        'login_id': login_id,
                        'email': email,
                        'temporary_password': '(UNCHANGED)'
                    })
                    success += 1
                else:
                    # Generate Temporary Password: Student@{RegNo}
                    temp_password = f"Student@{reg_no}"

                    # Create New User
                    user = User.objects.create_user(
                        login_id=login_id,
                        email=email,
                        password=temp_password,
                        name=name,
                        role='student',
                        temp_password_flag=True
                    )

                    # Create New Student Profile
                    student = Student(
                        user=user,
                        name=name,
                        registration_number=reg_no,
                        email=email,
                        passing_year=passing_year,
                        course=course,
                        stream=stream,
                        semester=semester,
                        attendance=attendance,
                        training_attendance=training_attendance,
                        backlogs_count=backlogs_count,
                        cgpa=cgpa,
                        phone_number=phone,
                        year=year,
                        category=category,
                        backlogs=backlogs
                    )
                    student.full_clean()
                    student.save()

                    credentials.append({
                        'name': name,
                        'registration_number': reg_no,
                        'login_id': login_id,
                        'email': email,
                        'temporary_password': temp_password
                    })
                    success += 1

        except Exception as e:
            fail += 1
            error_details.append(f"Row {total}: {str(e)}")

    # --- Step 5: Post-processing validation ---
    if total == 0:
        raise ValueError("CSV file contains no data rows. Please check that the file has student records below the header row.")

    # Determine upload status correctly
    if fail == total:
        log_status = 'failed'
    elif fail > 0:
        log_status = 'partial'
    else:
        log_status = 'success'

    log = CSVUploadLog.objects.create(
        uploaded_by=uploaded_by,
        file_name=file_name,
        total_records=total,
        successful_records=success,
        failed_records=fail,
        status=log_status,
        error_details="\n".join(error_details) if error_details else None
    )

    return credentials, log
