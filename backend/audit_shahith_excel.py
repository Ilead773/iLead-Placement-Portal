import os, django, pandas as pd

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, SentEmailLog

# 1. Load the 690-row Excel sheet
excel_path = "c:/Users/shahi/OneDrive/Documents/iLEAD_Placement_portal/Shahith - 7th Sem Details.xlsx"
df = pd.read_excel(excel_path, skiprows=1)

# Normalize emails from Excel
csv_emails = set(df['Email ID'].dropna().str.lower().str.strip().tolist())
print(f"Total students in Shahith Excel sheet: {len(df)}")

# 2. Get list of all students who HAVE received a Welcome Email (all time)
sent_emails = SentEmailLog.objects.filter(subject__icontains='Welcome')
sent_set = {s.recipient.lower().strip() for s in sent_emails}
print(f"Total students who received Welcome Email: {len(sent_set)}")

# 3. Find students in Excel who DID NOT receive a Welcome Email
missed_in_excel = []
for idx, row in df.iterrows():
    email = str(row['Email ID']).lower().strip()
    if email not in sent_set:
        missed_in_excel.append({
            "name": row['Student Name'],
            "email": email,
            "roll": str(row['Roll No.']) if 'Roll No.' in row else ''
        })

print(f"Total students in Shahith Excel who MISSED welcome email: {len(missed_in_excel)}")

# 4. Read the 45 Google Form complaining students
new_complaints = [
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

# Map missed students from Excel by email
missed_emails_set = {m["email"] for m in missed_in_excel}

overlap_form = []
for c in new_complaints:
    form_email = c["email"].lower().strip()
    if form_email in missed_emails_set:
        overlap_form.append(c)

print(f"\nTotal complaining students in Form who MISSED welcome email: {len(overlap_form)}")
for o in overlap_form:
    print(f"  - Name: {o['name']:25} | Roll: {o['roll']:12} | Email: {o['email']}")
