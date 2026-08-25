import os, django, pandas as pd

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, SentEmailLog

# 1. Read Cleaned_7th_Sem_Details.csv (565 students)
csv_path = "c:/Users/shahi/OneDrive/Documents/iLEAD_Placement_portal/Cleaned_7th_Sem_Details.csv"
df = pd.read_csv(csv_path)

# 2. Get the 287 welcome emails sent yesterday (Aug 24)
yesterday_sent = SentEmailLog.objects.filter(
    sent_at__date='2026-08-24',
    subject__icontains='Welcome'
)
sent_emails_set = {s.recipient.lower().strip() for s in yesterday_sent}
print(f"Total welcome emails sent yesterday: {len(sent_emails_set)}")

# 3. Identify the students from the 565 CSV list whose emails were NOT sent yesterday
missed_yesterday = []
for idx, row in df.iterrows():
    email = str(row['Email ID']).lower().strip()
    if email not in sent_emails_set:
        missed_yesterday.append({
            "name": row['Student Name'],
            "email": email,
            "roll": str(row['Roll No.']) if 'Roll No.' in row else ''
        })

print(f"Total students in CSV who missed email yesterday due to cutoff: {len(missed_yesterday)}")
missed_emails_set = {m["email"] for m in missed_yesterday}

# 4. Cross-reference with the 45 Google Form complaining students
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

overlap = []
for c in new_complaints:
    form_email = c["email"].lower().strip()
    if form_email in missed_emails_set:
        overlap.append(c)

print(f"\n--- COMPLAINING STUDENTS WHO WERE IN THE MISSED BATCH ({len(overlap)}) ---")
for o in overlap:
    print(f"  - Name: {o['name']:25} | Roll: {o['roll']:12} | Email: {o['email']}")
