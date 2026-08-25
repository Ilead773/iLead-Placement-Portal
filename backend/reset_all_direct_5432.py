import secrets
import string
import hashlib
import base64
import psycopg2
from psycopg2.extras import RealDictCursor

# Direct host on 5432 is aws-1-us-west-1.pooler.supabase.com (resolves to Supabase directly)
DATABASE_URL = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"

all_complaints = [
    {"roll": "28941624059", "name": "Shivani wankhede", "email": "shivani.w@gmail.com"},
    {"roll": "28941624119", "name": "Mosammad sania mondal", "email": "sania23105@gmail.com"},
    {"roll": "28941624205", "name": "Rudraksh Rakshit", "email": "rudrakshrakshit0@gmail.com"},
    {"roll": "28941624147", "name": "Soubarna Barik", "email": "soubarnabarik@gmail.com"},
    {"roll": "28941624034", "name": "Ronit Chakraborty", "email": "cronit97@gmail.com"},
    {"roll": "28941624055", "name": "Shayak Tarafder", "email": "shayak.tarafder14@gmail.com"},
    {"roll": "28941624017", "name": "Sucharita Das", "email": "sucharitadas932@gmail.com"},
    {"roll": "28941624175", "name": "Madhurima Barua", "email": "madhurimabarua399@gmail.com"},
    {"roll": "28941624064", "name": "Zayed Kamal", "email": "zayedkamal08@gmail.com"},
    {"roll": "28941624091", "name": "Arpan Kumar Saha", "email": "sahaarpan107@gmail.com"},
    {"roll": "28941624061", "name": "Triya Ghosh", "email": "triyaghosh005@gmail.com"},
    {"roll": "28941624006", "name": "Sneha podder", "email": "sneha.podder05@gmail.com"},
    {"roll": "28941624149", "name": "SHREYASI AOWN", "email": "shreyasiaown18@gmail.com"},
    {"roll": "28941624065", "name": "Zoya Alam", "email": "zoyaalam0002@gmail.com"},
    {"roll": "28941624035", "name": "Roshni Chakraborty", "email": "roshnichakraborty2005@gmail.com"},
    {"roll": "28941624027", "name": "Taiba Fatima", "email": "fatimataiba17@gmail.com"},
    {"roll": "28941624087", "name": "Arfa Tahiyat", "email": "arfatahiyat47@gmail.com"},
    {"roll": "28941623120", "name": "Saraswati samanta", "email": "samantasaraswati2004@gmail.com"},
    {"roll": "28941624075", "name": "Dipayan Guha Ray", "email": "dipayanguharay97@gmail.com"},
    {"roll": "28941624039", "name": "Sabrina Irfan", "email": "sabrinaairfan@gmail.com"},
    {"roll": "28941624079", "name": "Disha Mondal", "email": "dishamondal111222@gmail.com"},
    {"roll": "28941624148", "name": "Shovam Dey", "email": "deyshovam56@gmail.com"},
    {"roll": "28941623105", "name": "Ritobrota Dey", "email": "ritobrotadey05@gmail.com"},
    {"roll": "28941624050", "name": "Sayan Chakraborty", "email": "sayanchakrabortyofficial2005@gmail.com"},
    {"roll": "28941624028", "name": "Tamalika bera", "email": "beratamalika3@gmail.com"},
    {"roll": "28941624057", "name": "Shirsha das", "email": "dasshirsha36@gmail.com"},
    {"roll": "28941624031", "name": "Triparna das", "email": "triparnadas04@gmail.com"},
    {"roll": "28941623067", "name": "Hriddha Nandi", "email": "hriddhanandi@gmail.com"},
    {"roll": "28941624011", "name": "Srijita Sahoo", "email": "sahoosrijita2005@gmail.com"},
    {"roll": "28941624155", "name": "Joyeeta Biswas", "email": "joyeetabiswas772@gmail.com"},
    {"roll": "28941623034", "name": "Arpan Dasgupta", "email": "dasguptaarpan847@gmail.com"},
    {"roll": "28941624168", "name": "Saheli Mitra", "email": "sahelim777@gmail.com"},
    {"roll": "28941624005", "name": "Sneha Parveen", "email": "2006sneha1307@gmail.com"},
    {"roll": "28941624067", "name": "Debagnik Pal Choudhuri", "email": "debagnikpalchoudhuri@gmail.com"},
    {"roll": "28941624029", "name": "Tanvi Choudhary", "email": "choudharytanvi05@gmail.com"},
    {"roll": "28941624088", "name": "Arijit Kar", "email": "arijitkar14171@gmail.com"},
    {"roll": "28941624135", "name": "Adri chowdhury", "email": "adri.chowdhury1721@gmail.com"},
    {"roll": "28941624004", "name": "Smiti Shakshi Munda", "email": "smitishakshim@gmail.com"},
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

print("=== RAW PSYCOPG2 DIRECT RESET (ALL 45 STUDENTS) ===", flush=True)
print(f"{'Student Name':<25} | {'Email':<35} | {'Login ID':<12} | {'New Temp Password'}", flush=True)
print("-" * 95, flush=True)

try:
    conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    reset_count = 0
    not_found_list = []

    for c in all_complaints:
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
