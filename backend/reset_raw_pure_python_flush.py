import secrets
import string
import hashlib
import base64
import psycopg2
from psycopg2.extras import RealDictCursor

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

# Pure Python Django-compatible password hashing
def make_django_pbkdf2_hash(password, iterations=390000):
    salt = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))
    hash_bytes = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), iterations)
    hash_b64 = base64.b64encode(hash_bytes).decode('utf-8').strip()
    return f"pbkdf2_sha256${iterations}${salt}${hash_b64}"

print("=== PURE PYTHON PASSWORD RESET (NO DJANGO OVERHEAD) ===", flush=True)
print(f"{'Student Name':<25} | {'Email':<35} | {'Login ID':<12} | {'New Temp Password'}", flush=True)
print("-" * 95, flush=True)

try:
    print("Connecting to DB...", flush=True)
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
    cur = conn.cursor(cursor_factory=RealDictCursor)
    print("Connected successfully. Running updates...", flush=True)

    reset_count = 0
    not_found_list = []

    for c in remaining:
        # Find Student
        cur.execute(
            "SELECT id, user_id, email, name FROM students WHERE registration_number = %s",
            (c["roll"],)
        )
        student = cur.fetchone()
        
        if not student:
            not_found_list.append(c)
            continue
            
        user_id = student["user_id"]
        
        # Get User details
        cur.execute("SELECT login_id FROM users WHERE id = %s", (user_id,))
        user_rec = cur.fetchone()
        if not user_rec:
            print(f"No user record for user_id {user_id}", flush=True)
            continue
            
        login_id = user_rec["login_id"]
        
        # Generate Temp Password & Hash
        temp_pass = ''.join(secrets.choice(alphabet) for _ in range(10))
        hashed_pass = make_django_pbkdf2_hash(temp_pass)
        
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
        print(f"{student['name'][:25]:<25} | {new_email:<35} | {login_id:<12} | {temp_pass}", flush=True)
        
    conn.commit()
    print("-" * 95, flush=True)
    print(f"Successfully reset credentials for {reset_count} students.", flush=True)
    
except Exception as e:
    if 'conn' in locals() and conn:
        conn.rollback()
    print(f"Transaction failed: {e}", flush=True)
finally:
    if 'cur' in locals() and cur:
        cur.close()
    if 'conn' in locals() and conn:
        conn.close()
