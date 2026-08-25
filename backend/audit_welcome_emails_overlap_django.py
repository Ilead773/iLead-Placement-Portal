import os, django

os.environ['DATABASE_URL'] = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"
os.environ['SECRET_KEY'] = "yPjQuXVBrcNdXyA1C3pi-mEYn5yHHFDSJKHDo_ohP"
os.environ['DEBUG'] = "False"
os.environ['ALLOWED_HOSTS'] = "ilead-backend-production-20f7.up.railway.app"
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from core.models import Student, SentEmailLog

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

print("=== AUDITING WELCOME EMAIL OVERLAP (AUG 24 WELCOME EMAILS VS FORM COMPLAINTS) ===")

# Query all welcome emails sent on Aug 24
sent_emails = SentEmailLog.objects.filter(
    sent_at__date='2026-08-24',
    subject__icontains='Welcome'
)
sent_set = {s.recipient.lower().strip() for s in sent_emails}

print(f"Total welcome emails logged yesterday: {len(sent_emails)}")

overlap_sent = []
not_sent = []

for c in new_complaints:
    form_email = c["email"].lower().strip()
    s_qs = Student.objects.filter(registration_number=c["roll"])
    s_rec = s_qs.first() if s_qs.exists() else None
    
    db_email = s_rec.email.lower().strip() if s_rec else None
    
    was_sent = False
    matched_email = None
    
    if form_email in sent_set:
        was_sent = True
        matched_email = form_email
    elif db_email and db_email in sent_set:
        was_sent = True
        matched_email = db_email
        
    if was_sent:
        overlap_sent.append({"name": c["name"], "email": matched_email, "roll": c["roll"]})
    else:
        not_sent.append({"name": c["name"], "email": form_email, "roll": c["roll"], "registered": s_rec is not None})
        
print(f"\n--- COMPLAINING STUDENTS WHO WERE SENT EMAILS YESTERDAY ({len(overlap_sent)}) ---")
for o in overlap_sent:
    print(f"  - {o['name']:25} | Roll: {o['roll']:12} | Sent to: {o['email']}")
    
print(f"\n--- COMPLAINING STUDENTS WHO WERE NOT SENT EMAILS YESTERDAY ({len(not_sent)}) ---")
for n in not_sent:
    reg_status = "Registered" if n["registered"] else "NOT Registered"
    print(f"  - {n['name']:25} | Roll: {n['roll']:12} | Status: {reg_status} | Email: {n['email']}")
