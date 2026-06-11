import numpy as np
from pathlib import Path
import io
import csv
import re

# Complete student data - all streams
STUDENT_DATA = """SL NO,NAME,ROLL NUMBER,STREAM,SEM,BACK,EXIT,PH NO,3rd + 4th Sem YGPA
1,AASTHA CHHAWCHHARIA,28941923001,BBA (GEN),,YES,9234075194,7.48
2,ABDUL WAHID MALLIK,28941923163,BBA (GEN),"3, 4, 5",YES,92636518423,
3,ABRALUDDINAHMED,28941923008,BBA (GEN),"2, 3, 4, 5",YES,74390677824,
4,ABU TORAB ALAM,28941923009,BBA (GEN),"4, 5",YES,94331243445,
5,ADARSH JAISWAL,28941923010,BBA (GEN),,YES,8282906424,7.59
6,AFREEN STEPHEN,28941923013,BBA (GEN),,YES,8274967558,6.82
7,AKASH LAL,28941923017,BBA (GEN),"3, 4, 5",YES,
8,AMAN,28941923020,BBA (GEN),,YES,8789246364,6.27
9,AMAN KUMAR SINGH,28941923022,BBA (GEN),Backlog,YES,729296550010,
10,ANUSHKA DAS,28941923028,BBA (GEN),,YES,8584909707,7.02
11,AQUIB EQUBAL,28941923029,BBA (GEN),,YES,7980130828,6.23
12,ARSALAN AHMED AZIZ,28941923037,BBA (GEN),5,YES,8100377786,
13,ARYAN SINGH,28941923041,BBA (GEN),,YES,7980081272,7.57
14,AYUSH SHAW,28941923046,BBA (GEN),4,YES,8274056866,
15,BILASH HAZRA,28941923050,BBA (GEN),,YES,7980154097,6.98
16,BISWAJIT KALINDI,28941923052,BBA (GEN),"2, 3, 4, 5",YES,9064564718,
17,DARSHAN DATTA,28941923053,BBA (GEN),"4, 5",YES,9051579534,
18,DEBANKI MITRA,28941923055,BBA (GEN),Backlog,YES,8240203925,
19,DEBJYOTI DASGUPTA,28941923058,BBA (GEN),,YES,9007517301,6.68
20,FARAZ AHMED,28941923061,BBA (GEN),"2, 4, 5",YES,7003300652,
21,KAZI AQUEEL RAHAMAN,28941923071,BBA (GEN),"2, 3, 4, 5",YES,8583029786,
22,MANDAL MILI PRABIR,28941923079,BBA (GEN),Backlog,YES,7498654507,
23,MANSHI SHARMA,28941923081,BBA (GEN),"2, 3, 5",YES,9038976470,
24,MD AHTESHAM,28941923084,BBA (GEN),"2, 3, 4, 5",YES,9903513150,
25,MD ANASH KHAN,28941923086,BBA (GEN),"1, 2, 3, 4, 5",YES,9734150786,
26,MD ARMAN MANIYAR,28941923087,BBA (GEN),,YES,9304270013,6.75
27,MD ARSH KHAN,28941923090,BBA (GEN),Backlog,YES,
28,MD FAIZ,28941923092,BBA (GEN),Backlog,YES,6289658970,
29,MD JUNAID,28941923093,BBA (GEN),Backlog,YES,8334977092,
30,MD SADAF HASMI,28941923095,BBA (GEN),Backlog,YES,8051141797,
31,MD. YUSUF HAQUE,28941923102,BBA (GEN),Backlog,YES,6289817671,
32,MEHAKPREET KAUR,28941923104,BBA (GEN),,YES,9073064087,7.32
33,MOHAMMAD RASHID,28941923106,BBA (GEN),,YES,7870695170,6.55
34,MOSTAFA AHAMED GAZI,28941923109,BBA (GEN),"3, 4, 5",YES,7980911246,
35,MUQBIL HOSSAIN,28941923112,BBA (GEN),,YES,9748857858,6.75
36,NABIL AHMED,28941923114,BBA (GEN),,YES,8420357706,7.27
37,NAKSHATRA BISHNU,28941923115,BBA (GEN),"3, 4, 5",YES,7439376903,
38,NAUSHEEN NASIM,28941923119,BBA (GEN),,YES,6291662192,7.09
39,NEHA AGARWAL,28941923120,BBA (GEN),,YES,8653156494,6.74
40,PAYAL JHUNJHUNWALA,28941923125,BBA (GEN),5,YES,9123729445,
41,PIJUSH DEBBARMA,28941923126,BBA (GEN),4,YES,9862935455,
42,PRATHAM SINGH,28941923130,BBA (GEN),5,YES,9163425896,
43,PRITAM MONDAL,28941923132,BBA (GEN),"3, 4",YES,6297019240,
44,PRIYANSHU BISWAS,28941923135,BBA (GEN),4,YES,7439324609,
45,ROHON BAG,28941923144,BBA (GEN),,YES,7478767481,5.64
46,ROOMMAN FATMA,28941923145,BBA (GEN),,YES,9304818702,6.86
47,SAIFULLAH KHALID,28941923152,BBA (GEN),"4, 5",YES,7439532737,
48,SAMIR KUMAR,28941923153,BBA (GEN),5,YES,7870642588,
49,SAMRA SAJIL,28941923154,BBA (GEN),"2, 3, 4, 5",YES,9674643009,
50,SAMRAT TARAFDER,28941923155,BBA (GEN),,YES,8240781869,6.98
1,SAHIL AMIN,28942623006,BBA SM,4,YES,7070465359,
2,SAHIL SHARMA,28942623008,BBA SM,"4,5",YES,8981028887,
3,SIDDHARTHA GHOSH,28942623011,BBA SM,,YES,8582939207,7.07
4,RON JOSEPH HOLMES,28942623005,BBA SM,"2, 4",YES,
5,SAHIL HOSSAIN,28942623007,BBA SM,4,YES,7076862864,
6,ADITYA RAJ NAITHANI,28942623002,BBA SM,"2, 3, 4, 5",YES,7605083975,
7,TANMESH MONDAL,28942623015,BBA SM,,YES,, 7.38
8,ABHISHEK SAINI,28942623001,BBA SM,Backlog,YES,
9,SANJOY SINGHA ROY,28942623009,BBA SM,Backlog,YES,
1,NISHCHAYA SHAW,28943223023,BBA DM,,YES,9836273313,6.64
2,REHAN RAZA,28943223030,BBA DM,,YES,8235714881,6.84
3,VICKY JAISWAL,28943223053,BBA DM,4,YES,8910850352,
4,ARCHI BISWAS,28943223006,BBA DM,,YES,9007299037,7.50
5,PRINCE SHAW,28943223025,BBA DM,,YES,7003328529,6.95
6,ANSHU KUMAR GUPTA,28943223005,BBA DM,,YES,7980015009,7.30
7,YASHVARDHAN DASSANI,28943223057,BBA DM,,YES,, 7.68
8,VIVEK GUPTA,28943223054,BBA DM,,YES,, 7.36
9,SUBRATA PRAMANIK,28943223046,BBA DM,Backlog,YES,9064480339,
10,YASHFEEN HASSAN,28943223056,BBA DM,5,YES,6289755469,
1,DIBA FARHA,28942823005,BBA HM,,YES,9875362760,7.45
2,RUPSHA KANGSHABANIK,28942823017,BBA HM,,YES,8420640065,6.61
3,MEHULI GHOSH,28942823010,BBA HM,2,YES,8910105676,
4,ANJALI PASWAN,28942823002,BBA HM,,YES,8100247338,6.93
5,PRIYANSHI BHATTACHARYA,28942823014,BBA HM,,YES,9062067857,7.64
6,ADITI JAISWAL,28942823001,BBA HM,"2, 3, 4, 5",YES,6291505697,
7,ASHIM DAS,28942823003,BBA HM,,YES,8512057663,7.73
8,PAYEL SATPATI,28942823012,BBA HM,,YES,9476266964,7.82
9,PRANTIKA SAHA,28942823013,BBA HM,,YES,9123379762,5.95
10,JAYITA BANERJEE,28942823009,BBA HM,"2, 4",YES,9330706150,
1,JUMELIYA DAS,28941623072,BMAGD,5,YES,9330713417,
2,ROUNAK MAJUMDER,28941623111,BMAGD,"3, 5",YES,8016218405,
3,SHRIHAN SINGH,28941623133,BMAGD,,YES,9674029990,7.18
4,SHAYANDIP DAS,28941623128,BMAGD,Backlog,YES,9007587218,
5,ROHAN DUTTA ROY,28941623108,BMAGD,,YES,8981118413,7.87
6,SIDRA KHAN,28941623137,BMAGD,,YES,9398107270,7.60
7,FARAAZ AHMED,28941623063,BMAGD,,YES,8017799749,7.22
8,NAUSHABA ASRAF,28941623088,BMAGD,,YES,6290679764,6.87
9,HARSH BAHADUR SONAR,28941623066,BMAGD,5,YES,6296400160,
10,MOHSIN KHAN,28941623083,BMAGD,5,YES,6291899832,
1,SNIGDHA DUTTA,28941323046,BMS,,YES,8910919410,6.93
2,ZUNAIRA MANZAR,28941323061,BMS,5,YES,9874455861,
3,LAAEBA AMAD,28941323023,BMS,"4, 5",YES,7003503546,
4,GUNN LALWANI,28941323018,BMS,"3, 5",YES,9073587758,
5,PAREESHA VIJ,28941323027,BMS,,YES,9831415509,6.95
1,MD AADIL,28942723008,BCA,"2 , 5",YES,
2,MD OSAID MISBAH,28942723010,BCA,"2 , 4 , 5",YES,
3,KAIF AHMED KHAN,28942723005,BCA,"1 , 2 , 3 , 4",YES,7439576549,
4,MD SHAHZAR,28942723013,BCA,,YES,8100465624,7.34
5,UTSUK SARKAR,28942723031,BCA,2,YES,6294272516,
6,SUBHAJIT RAY,28942723027,BCA,"2 , 4 , 5",YES,6290634706,
1,SOUMYADEEP KARMAKAR,28940423015,CYS,5,YES,9123399693,
1,GARGI BAIRAGYA,28943523004,CCT,,YES,8101415003,6.52
2,VANDANA MISHRA,28943523025,CCT,,YES,7003870572,7.83
3,LISA MANNA,28943523003,CCT,5,YES,8653469548,
4,SATHI MANNA,28943523018,CCT,"1, 2, 5",YES,6295239582,
1,SNEHA DAS,28940523015,DATA,,YES,6289108696,7.43
2,SUPRATIM KUNDU,28940523018,DATA,"1, 3, 4",YES,9874345706,
1,TANISHA MUKHERJEE,28940823025,FASHION,,YES,, 6.64
2,PUJA GOGOI,28940823015,FASHION,,YES,8240173909,8.36
3,AMAN GIRI,28940823004,FASHION,,YES,8420118477,7.91
1,SURAJIT GHOSH,28941423024,BMLT,3,YES,6290716685,
2,SUPRITY NAG,28941423023,BMLT,"1, 2, 3, 4, 5",YES,9093763115,
3,ROHAN ROY,28941423014,BMLT,3,YES,6290601070,"""

COURSE_MAPPING = {
    "BBA (GEN)": "Bachelor of Business Administration (General)",
    "BBA SM": "BBA in Sports Management",
    "BBA DM": "BBA in Digital Marketing",
    "BBA ENT": "BBA in Entrepreneurship",
    "BBA HM": "BBA in Hospital Management",
    "BMAGD": "B.Sc./Bachelor in Media, Animation & Graphic Design",
    "BID": "Bachelor of Interior Design",
    "FTP": "Fashion Technology Program",
    "BMS": "Bachelor of Media Science",
    "BCA": "Bachelor of Computer Applications",
    "CYS": "Cyber Security",
    "CCT": "BSc in Critical Care Technology (CCT)",
    "DATA": "Data Science",
    "FASHION": "Fashion Design",
    "BMLT": "Bachelor of Medical Laboratory Technology",
}

def _parse_backlog_count(sem_raw):
    value = (sem_raw or "").strip()
    if not value:
        return 0
    if value.lower() == "backlog":
        return 1

    semester_values = re.findall(r"\d+", value)
    if semester_values:
        return len(semester_values)
    return 1


def _derive_semester(sem_raw):
    semester_values = [int(num) for num in re.findall(r"\d+", (sem_raw or "").strip())]
    return max(semester_values) if semester_values else 6


def _clean_phone(phone_raw):
    digits = re.sub(r"\D", "", (phone_raw or "").strip())
    return digits[:13] if 10 <= len(digits) <= 13 else ""


def _derive_cgpa(rng, backlog_count, ygpa_raw):
    value = (ygpa_raw or "").strip()
    if value:
        try:
            cgpa = float(value)
            if 0 <= cgpa <= 10:
                return round(cgpa, 2)
        except ValueError:
            pass

    if backlog_count == 0:
        return round(float(rng.uniform(6.2, 8.9)), 2)
    if backlog_count <= 2:
        return round(float(rng.uniform(5.5, 7.4)), 2)
    return round(float(rng.uniform(4.8, 6.8)), 2)


def _derive_attendance(rng, backlog_count):
    if backlog_count == 0:
        return int(rng.integers(75, 99))
    if backlog_count <= 2:
        return int(rng.integers(60, 91))
    return int(rng.integers(45, 81))


def _derive_training_attendance(rng, backlog_count):
    if backlog_count == 0:
        return int(rng.integers(70, 101))
    if backlog_count <= 2:
        return int(rng.integers(55, 91))
    return int(rng.integers(40, 79))


def _build_import_ready_rows():
    rng = np.random.default_rng(42)
    reader = csv.reader(io.StringIO(STUDENT_DATA))
    next(reader, None)
    rows = []

    for row in reader:
        if not row or len(row) < 4:
            continue

        sl_no, name, roll_number, stream = [item.strip() for item in row[:4]]
        sem_raw = row[4].strip() if len(row) > 4 else ""
        phone_raw = row[6].strip() if len(row) > 6 else ""
        ygpa_raw = row[7].strip() if len(row) > 7 else ""

        backlog_count = _parse_backlog_count(sem_raw)
        attendance = _derive_attendance(rng, backlog_count)
        training_attendance = _derive_training_attendance(rng, backlog_count)
        cgpa = _derive_cgpa(rng, backlog_count, ygpa_raw)

        rows.append({
            "Name": name,
            "Registration Number": roll_number,
            "Email ID": f"{roll_number.lower()}@student.ilead.edu",
            "Passing Year": 2026,
            "Course": COURSE_MAPPING.get(stream, stream),
            "Stream": stream,
            "Semester": _derive_semester(sem_raw),
            "Attendance": attendance,
            "Training Attendance": training_attendance,
            "Backlogs": "Yes" if backlog_count > 0 else "No",
            "Backlog Count": backlog_count,
            "Marks (CGPA)": cgpa,
            "Phone Number": _clean_phone(phone_raw),
        })

    return rows


def create_student_data_with_attendance():
    """
    Create an import-ready student CSV with generated attendance and backlog data.
    """
    rows = _build_import_ready_rows()
    output_path = Path(__file__).parent / "students_import_ready.csv"
    fieldnames = [
        "Name",
        "Registration Number",
        "Email ID",
        "Passing Year",
        "Course",
        "Stream",
        "Semester",
        "Attendance",
        "Training Attendance",
        "Backlogs",
        "Backlog Count",
        "Marks (CGPA)",
        "Phone Number",
    ]

    with output_path.open("w", newline="", encoding="utf-8") as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"[+] Import-ready CSV saved to: {output_path}")
    print(f"[+] Total records: {len(rows)}")
    print("[+] Added/generated: Attendance, Training Attendance, Backlogs, Backlog Count, Email ID")

    stream_counts = {}
    for item in rows:
        stream_counts[item["Stream"]] = stream_counts.get(item["Stream"], 0) + 1

    print("\n[+] Summary by stream:")
    for stream, count in sorted(stream_counts.items()):
        print(f"    - {stream}: {count} students")

    print("\n[+] Sample rows:")
    for item in rows[:10]:
        print(
            f"    - {item['Name']} | {item['Registration Number']} | "
            f"{item['Attendance']}% | {item['Training Attendance']}% | "
            f"backlogs={item['Backlog Count']} | cgpa={item['Marks (CGPA)']}"
        )

    return output_path

if __name__ == "__main__":
    create_student_data_with_attendance()
