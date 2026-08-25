import os, secrets, string, psycopg2
from psycopg2.extras import RealDictCursor

# Django password hashing (local math, doesn't need DB)
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from django.contrib.auth.hashers import make_password

DATABASE_URL = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"

remaining = [
    {"roll": "28941624117", "name": "Md Shihab Hossain", "email": "hossainmdshihab069@gmail.com"},
    {"roll": "28941624199", "name": "Subhadeep Guchhait", "email": "subhadeepguhhait@gmail.com"},
    {"roll": "28941624078", "name": "Bikrant Singh", "email": "vikrant44297@gmail.com"},
    {"roll": "28941624016", "name": "Subhrajit Dutta", "email": "duttasubhrajit45@gmail.com"},
    {"roll": "28941624024", "name": "Sujal Ghosh", "email": "arvsujal2@gmail.com"},
    {"roll": "28941624120", "name": "Mufaddal", "email": "muffidhanera2006@gmail.com"},
    {"roll": "28941624074", "name": "Dipanwita Mahajan", "email": "dipanwitamahajan28552@gmail.com"}
]

alphabet = string.ascii_letters + string.digits

print("=== RAW PSYCOPG2 PASSWORD RESET (REMAINING STUDENTS) ===")
print(f"{'Student Name':<25} | {'Email':<35} | {'Login ID':<12} | {'New Temp Password'}")
print("-" * 95)

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor(cursor_factory=RealDictCursor)

reset_count = 0
not_found_list = []

try:
    for c in remaining:
        # 1. Find the student by registration number
        cur.execute(
            "SELECT id, user_id, email, name FROM students WHERE registration_number = %s",
            (c["roll"],)
        )
        student = cur.fetchone()
        
        if not student:
            not_found_list.append(c)
            continue
            
        user_id = student["user_id"]
        
        # 2. Get login ID from user record
        cur.execute("SELECT login_id FROM users WHERE id = %s", (user_id,))
        user_rec = cur.fetchone()
        if not user_rec:
            print(f"No user record for user_id {user_id}")
            continue
            
        login_id = user_rec["login_id"]
        
        # 3. Generate password and hash it locally
        temp_pass = ''.join(secrets.choice(alphabet) for _ in range(10))
        hashed_pass = make_password(temp_pass)
        
        # 4. Perform updates
        new_email = c["email"].lower().strip()
        
        # Update Student Email
        cur.execute(
            "UPDATE students SET email = %s WHERE id = %s",
            (new_email, student["id"])
        )
        
        # Update User details
        cur.execute(
            """
            UPDATE users 
            SET email = %s, 
                password = %s, 
                temp_password_flag = true, 
                password_reset_required = true, 
                failed_login_attempts = 0, 
                locked_until = NULL 
            WHERE id = %s
            """,
            (new_email, hashed_pass, user_id)
        )
        
        reset_count += 1
        print(f"{student['name'][:25]:<25} | {new_email:<35} | {login_id:<12} | {temp_pass}")
        
    conn.commit()
except Exception as e:
    conn.rollback()
    print(f"Transaction failed, changes rolled back: {e}")
finally:
    cur.close()
    conn.close()

print("-" * 95)
print(f"Successfully reset credentials for {reset_count} remaining students.")

if not_found_list:
    print("\n=== NOT FOUND IN DATABASE ===")
    for c in not_found_list:
        print(f"  - Name: {c['name']:25} | Roll: {c['roll']:15} | Email: {c['email']}")
