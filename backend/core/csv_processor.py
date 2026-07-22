import csv
import io
import re
import logging
from django.db import transaction
from .models import User, Student, CSVUploadLog

logger = logging.getLogger('core')


class _SkipRow(Exception):
    """Sentinel raised to silently skip a row without counting it as an error."""
    pass

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
        raise ValueError(f"Email ID is missing.")
    if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
        raise ValueError(f"Invalid email format: '{email}'")
    return email.lower().strip()


def _validate_phone(phone, row_num):
    """Normalize and validate phone number. Supports multiple numbers separated by / or , by taking the first one."""
    if not phone:
        return ''
    # If multiple numbers are provided separated by slash, comma, or semicolon, take the first one
    parts = re.split(r'[/,;]', phone)
    first_phone = parts[0].strip()
    
    # Strip spaces, dashes, parentheses
    phone_clean = re.sub(r'[\s\-\(\)\.]', '', first_phone)
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
    
    # Strip '%' to handle inputs like '3%' or '75%'
    attendance_str = attendance_str.replace('%', '').strip()
    
    try:
        val = float(attendance_str)
    except ValueError:
        raise ValueError(f"Row {row_num}: Attendance '{attendance_str}' is not a valid number.")
        
    # If the value is a decimal between 0.0 and 1.0 (e.g. 0.75 or 0.03), 
    # it was likely parsed from an Excel percentage cell. Convert to 0-100 scale.
    if 0.0 < val <= 1.0:
        val = val * 100.0
        
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


def process_csv(content_bytes, uploaded_by, file_name="import.csv", upload_log_id=None, default_semester=None):
    """
    Parses CSV content and creates User/Student records.
    Handles multiple encodings, delimiters, and validates all fields
    with human-readable error messages.

    Returns: (list_of_credentials, upload_log_object)
    """
    is_excel = file_name.lower().endswith(('.xlsx', '.xls'))

    if is_excel:
        import openpyxl
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
            sheet = wb.active
            all_raw_rows = list(sheet.iter_rows(values_only=True))
            
            if not all_raw_rows:
                raise ValueError("Excel file is empty.")

            # Smart Header Detection: Scan top 20 rows for the row containing header keywords
            header_idx = None
            for idx, r in enumerate(all_raw_rows[:20]):
                row_str = ' '.join([str(c).lower() for c in r if c is not None])
                if ('name' in row_str or 'student' in row_str) and ('roll' in row_str or 'reg' in row_str or 'course' in row_str or 'email' in row_str or 'year' in row_str):
                    header_idx = idx
                    break
            
            if header_idx is None:
                header_idx = 0  # Fallback to row 0

            headers = [str(cell).strip() if cell is not None else '' for cell in all_raw_rows[header_idx]]
            
            rows = []
            for row in all_raw_rows[header_idx + 1:]:
                # Skip completely empty rows
                if all(cell is None or str(cell).strip() == '' for cell in row):
                    continue
                row_dict = {}
                for col_idx, cell_value in enumerate(row):
                    if col_idx < len(headers) and headers[col_idx]:
                        if isinstance(cell_value, float) and cell_value.is_integer():
                            cell_value = int(cell_value)
                        row_dict[headers[col_idx]] = str(cell_value).strip() if cell_value is not None else ''
                rows.append(row_dict)
            
            if not headers or not any(headers):
                raise ValueError("Excel file has no headers. Expected columns: Student Name, Roll No., Email ID, etc.")
                
            total_rows = len(rows)
            if total_rows == 0:
                raise ValueError("Excel file contains no data rows below the header row.")
        except Exception as e:
            if isinstance(e, ValueError):
                raise e
            raise ValueError(f"Failed to parse Excel file. Is it a valid .xlsx file? Error: {str(e)}")
    else:
        # --- Step 1: Detect encoding & decode ---
        encoding = _detect_encoding(content_bytes)
        try:
            decoded_file = content_bytes.decode(encoding)
        except (UnicodeDecodeError, LookupError):
            decoded_file = content_bytes.decode('utf-8', errors='replace')
            logger.warning(f"CSV decoding fell back to utf-8 with replacement chars (original: {encoding})")

        # Strip BOM if present
        if decoded_file.startswith('\ufeff'):
            decoded_file = decoded_file[1:]

        # --- Step 2: Check for binary content ---
        if '\x00' in decoded_file[:1024]:
            raise ValueError("File appears to be binary, not a valid CSV text file. If it's an Excel file, ensure it has a .xlsx extension.")

        # --- Step 3: Smart Header Detection for CSV ---
        raw_lines = [l for l in decoded_file.splitlines() if l.strip()]
        header_line_idx = 0
        for idx, line in enumerate(raw_lines[:20]):
            line_lower = line.lower()
            if ('name' in line_lower or 'student' in line_lower) and ('roll' in line_lower or 'reg' in line_lower or 'course' in line_lower or 'email' in line_lower or 'year' in line_lower):
                header_line_idx = idx
                break

        trimmed_content = '\n'.join(raw_lines[header_line_idx:])

        # --- Step 4: Detect delimiter & parse ---
        dialect = _detect_dialect(trimmed_content)
        io_string = io.StringIO(trimmed_content)
        reader = csv.DictReader(io_string, dialect=dialect)

        # Validate headers
        if reader.fieldnames is None or len(reader.fieldnames) == 0:
            raise ValueError("CSV file has no headers. Expected columns: Student Name, Roll No., Email ID, etc.")

        # Check for suspiciously few columns (likely wrong delimiter)
        if len(reader.fieldnames) == 1 and ',' in reader.fieldnames[0]:
            raise ValueError(
                f"CSV appears to have only 1 column: '{reader.fieldnames[0]}'. "
                "The delimiter may be wrong. Please ensure the file is comma-separated."
            )

        rows = list(reader)
        total_rows = len(rows)

        if total_rows == 0:
            raise ValueError("CSV file contains no data rows below the header row.")

    if upload_log_id:
        try:
            log = CSVUploadLog.objects.get(pk=upload_log_id)
            log.total_records = total_rows
            log.status = 'processing'
            log.successful_records = 0
            log.failed_records = 0
            log.error_details = "Initializing processing..."
            log.save()
        except Exception as log_err:
            logger.error(f"Failed to update CSVUploadLog status to processing: {log_err}")

    total = 0
    success = 0
    fail = 0
    skipped_count = 0
    created_count = 0
    updated_count = 0
    error_details_list = []
    skipped_list = []  # Students skipped due to missing email
    credentials = []
    new_students = []
    seen_reg_nos = set()  # Track duplicates within the same upload

    for row in rows:
        total += 1
        # Build normalized key dictionary for case-insensitive and space-insensitive header matching
        clean_row = {str(k).strip().lower(): (str(v).strip() if v is not None else '') for k, v in row.items() if k}

        # Ultra-flexible field extraction
        name_raw = (clean_row.get('student name') or clean_row.get('student_name') or 
                    clean_row.get('name') or clean_row.get('full name') or 
                    clean_row.get('candidate name') or clean_row.get('student') or '').strip()

        reg_no_raw = (clean_row.get('registration number') or clean_row.get('roll no.') or 
                      clean_row.get('roll no') or clean_row.get('roll number') or 
                      clean_row.get('reg no') or clean_row.get('reg_no') or 
                      clean_row.get('roll_no') or clean_row.get('registration_number') or 
                      clean_row.get('id') or clean_row.get('reg. no.') or '').strip()

        # Skip completely empty trailing rows (e.g. blank Excel rows at the end)
        if not name_raw and not reg_no_raw:
            total -= 1
            continue

        try:
            with transaction.atomic():
                name = name_raw
                reg_no = reg_no_raw
                
                email_raw = (clean_row.get('email id') or clean_row.get('email') or 
                             clean_row.get('email address') or clean_row.get('email_id') or '').strip()
                
                course_raw = (clean_row.get('program / course') or clean_row.get('program/course') or 
                             clean_row.get('programme / course') or clean_row.get('programme/course') or 
                             clean_row.get('course') or clean_row.get('program') or 
                             clean_row.get('programme') or '').strip()
                from apps.scraped_jobs.course_config import normalize_course_name
                course = normalize_course_name(course_raw)

                stream = (clean_row.get('school') or clean_row.get('stream') or 
                          clean_row.get('department') or clean_row.get('branch') or '').strip()
                
                semester_raw = (clean_row.get('semester') or clean_row.get('sem') or '').strip()
                attendance_raw = (clean_row.get('attendance') or clean_row.get('attendanc') or '').strip()
                
                marks_raw = (clean_row.get('marks (cgpa)') or clean_row.get('cgpa') or 
                             clean_row.get('marks') or clean_row.get('gpa') or '').strip()
                
                passing_year_raw = (clean_row.get('passing year') or clean_row.get('year of passing') or 
                                    clean_row.get('passing_year') or clean_row.get('graduating year') or '').strip()
                
                phone_raw = (clean_row.get('phone number') or clean_row.get('phone') or 
                             clean_row.get('mobile') or clean_row.get('contact') or 
                             clean_row.get('phone_number') or clean_row.get('mobile number') or '').strip()
                
                year_raw = (clean_row.get('year') or clean_row.get('academic year') or '').strip().lower()
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

                # Auto-derive semester: use admin-selected default first,
                # then fall back to year-based guess (1st→2, 2nd→4, 3rd→6, 4th→8)
                if not semester_raw:
                    if default_semester:
                        semester_raw = str(default_semester)
                    elif year:
                        year_to_semester = {'1st': '2', '2nd': '4', '3rd': '6', '4th': '8'}
                        semester_raw = year_to_semester.get(year, '')

                category_raw = (clean_row.get('category') or '').strip().upper()
                if 'A' in category_raw:
                    category = 'A'
                elif 'B' in category_raw:
                    category = 'B'
                elif 'C' in category_raw:
                    category = 'C'
                else:
                    category = None
                
                backlogs_raw = str(clean_row.get('backlogs') or clean_row.get('backlog') or '').strip().lower()
                backlogs = backlogs_raw in ['yes', 'true', '1', 'y']

                training_attendance_raw = (clean_row.get('training attendance') or clean_row.get('training_attendance') or 
                                           clean_row.get('training attd') or clean_row.get('training') or '').strip()
                backlogs_count_raw = (clean_row.get('backlog count') or clean_row.get('backlogs count') or clean_row.get('backlogs_count') or '').strip()

                # ===== VALIDATION PHASE =====
                if not name:
                    raise ValueError(f"Student name is missing.")
                if not reg_no:
                    raise ValueError(f"Registration number is missing.")

                # Check for duplicate reg_no within the same CSV
                reg_no_key = reg_no.lower()
                if reg_no_key in seen_reg_nos:
                    raise ValueError(
                        f"Duplicate registration number '{reg_no}' found in this CSV. "
                        "Each student should appear only once."
                    )
                seen_reg_nos.add(reg_no_key)

                # Skip students with no email — notify in summary but don't count as failure
                if not email_raw:
                    skipped_list.append(f"[SKIPPED] Row {total}: {name_raw} ({reg_no_raw}) - No Email ID provided.")
                    skipped_count += 1
                    raise _SkipRow()

                # Validate all fields with human-readable errors
                email = _validate_email(email_raw, total)
                phone = _validate_phone(phone_raw, total)
                cgpa = _validate_cgpa(marks_raw, total)
                semester = _validate_semester(semester_raw, total)
                attendance = _validate_attendance(attendance_raw, total)
                
                training_attendance = _validate_attendance(training_attendance_raw, total) if training_attendance_raw else None
                try:
                    backlogs_count = int(backlogs_count_raw) if backlogs_count_raw else (1 if backlogs else 0)
                except ValueError:
                    raise ValueError(f"Backlog count '{backlogs_count_raw}' is not a valid integer.")

                passing_year = _validate_passing_year(passing_year_raw, total)

                # Generate Login ID (lowercase registration number)
                login_id = reg_no.lower()
                
                # Production-grade Upsert & Conflict Detection Logic
                existing_user = User.objects.filter(login_id=login_id).first()
                email_owner = User.objects.filter(email=email).first()
                
                # Check for email conflicts
                if email_owner and (not existing_user or email_owner.id != existing_user.id):
                    raise ValueError(f"Email '{email}' is already registered to another user.")

                # Check for duplicate registration number conflicts (different student/email)
                if existing_user and existing_user.email != email:
                    raise ValueError(f"Duplicate registration number: '{reg_no}' is already registered to another user.")

                if existing_user:
                    # Update existing user and their student profile
                    existing_user.email = email
                    existing_user.name = name
                    existing_user.save()
                    
                    try:
                        student = Student.objects.get(user=existing_user)
                    except Student.DoesNotExist:
                        raise ValueError(
                            f"User '{login_id}' exists but has no student profile. "
                            "This may be an admin or coordinator account."
                        )

                    student.name = name
                    student.email = email
                    student.passing_year = passing_year if passing_year is not None else student.passing_year
                    student.course = course
                    student.stream = stream
                    student.semester = semester if semester is not None else student.semester
                    student.attendance = attendance if attendance is not None else student.attendance
                    student.training_attendance = training_attendance if training_attendance is not None else student.training_attendance
                    student.backlogs_count = backlogs_count
                    student.cgpa = cgpa if cgpa is not None else student.cgpa
                    student.phone_number = phone if phone else student.phone_number
                    student.year = year if year else student.year
                    student.category = category if category else student.category
                    if category:
                        student.is_category_manual = True
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
                    updated_count += 1
                else:
                    # Generate Temporary Password: Secure random string
                    import secrets
                    import string
                    alphabet = string.ascii_letters + string.digits
                    temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))

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
                        training_attendance=training_attendance if training_attendance is not None else 100.0,
                        backlogs_count=backlogs_count,
                        cgpa=cgpa,
                        phone_number=phone,
                        year=year,
                        category=category,
                        is_category_manual=True if category else False,
                        backlogs=backlogs
                    )
                    student.full_clean()
                    student.save()
                    new_students.append(student)

                    credentials.append({
                        'name': name,
                        'registration_number': reg_no,
                        'login_id': login_id,
                        'email': email,
                        'temporary_password': temp_password
                    })
                    success += 1
                    created_count += 1

        except _SkipRow:
            pass  # Already tracked in skipped_list
        except Exception as e:
            fail += 1
            error_details_list.append(f"[ERROR] Row {total}: {name_raw or 'Unknown'} ({reg_no_raw or 'Unknown'}) - {str(e)}")

        # Dynamically update the database log during the loop
        if upload_log_id:
            try:
                CSVUploadLog.objects.filter(pk=upload_log_id).update(
                    successful_records=success,
                    failed_records=fail,
                    error_details=f"Processing row {total} of {total_rows}..."
                )
            except Exception as log_err:
                logger.error(f"Failed to update CSVUploadLog intermediate progress: {log_err}")

    # Determine upload status correctly
    processed = total - skipped_count
    if fail > 0 and fail == processed:
        log_status = 'failed'
    elif fail > 0:
        log_status = 'partial'
    else:
        log_status = 'success'

    # Build final summary text
    summary_lines = [
        "=== IMPORT SUMMARY ===",
        f"Status: {log_status.upper()}",
        f"Total Records in File: {total_rows}",
        f"Successfully Processed: {success}",
        f"  - New Accounts Created: {created_count}",
        f"  - Existing Profiles Updated: {updated_count}",
        f"Skipped (No Email): {skipped_count}",
        f"Failed/Rejected Records: {fail}",
    ]
    if skipped_list:
        summary_lines.append("\n=== SKIPPED (NO EMAIL ID) ===")
        summary_lines.extend(skipped_list)
    if error_details_list:
        summary_lines.append("\n=== DETAILED ERRORS ===")
        summary_lines.extend(error_details_list)
    summary_text = "\n".join(summary_lines)

    if upload_log_id:
        log = CSVUploadLog.objects.get(pk=upload_log_id)
        log.status = log_status
        log.successful_records = success
        log.failed_records = fail
        log.created_count = created_count
        log.updated_count = updated_count
        log.error_details = summary_text
        log.save()
    else:
        log = CSVUploadLog.objects.create(
            uploaded_by=uploaded_by,
            file_name=file_name,
            total_records=total_rows,
            successful_records=success,
            failed_records=fail,
            created_count=created_count,
            updated_count=updated_count,
            status=log_status,
            error_details=summary_text
        )

    if new_students:
        Student.objects.filter(id__in=[s.id for s in new_students]).update(upload_log=log)

    return credentials, log
