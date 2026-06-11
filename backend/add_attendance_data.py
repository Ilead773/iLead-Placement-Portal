import pandas as pd
import numpy as np
import os
from pathlib import Path

# Course mapping
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

def add_random_attendance(csv_file_path, output_file_path=None):
    """
    Add random Attendance and Training Attendance data to student CSV
    
    Args:
        csv_file_path: Path to input CSV
        output_file_path: Path to save enhanced CSV (default: _with_attendance.csv)
    """
    
    # Read the CSV
    try:
        df = pd.read_csv(csv_file_path)
        print(f"✓ Loaded {len(df)} student records from {csv_file_path}")
    except Exception as e:
        print(f"✗ Error reading CSV: {e}")
        return
    
    # Generate random attendance data
    np.random.seed(42)  # Remove this if you want truly random data each time
    
    # Attendance: 60-100% (realistic range)
    df['Attendance'] = np.random.randint(60, 101, size=len(df))
    
    # Training Attendance: 50-100% (slightly lower due to optional training)
    df['Training Attendance'] = np.random.randint(50, 101, size=len(df))
    
    # Add Course Full Name based on Stream
    df['Course Full Name'] = df['STREAM'].map(COURSE_MAPPING)
    
    # Display sample
    print("\n📊 Sample of enhanced data:")
    print(df[['NAME', 'ROLL NUMBER', 'STREAM', 'Attendance', 'Training Attendance', 'Course Full Name']].head(10))
    
    # Save enhanced CSV
    if output_file_path is None:
        base_name = Path(csv_file_path).stem
        output_file_path = Path(csv_file_path).parent / f"{base_name}_with_attendance.csv"
    
    df.to_csv(output_file_path, index=False)
    print(f"\n✓ Enhanced CSV saved to: {output_file_path}")
    print(f"✓ Total records: {len(df)}")
    print(f"✓ New columns added: Attendance, Training Attendance, Course Full Name")
    
    return df

if __name__ == "__main__":
    # Path to your CSV
    backend_dir = Path(__file__).parent
    csv_file = backend_dir / "selected_students.csv"
    
    if csv_file.exists():
        add_random_attendance(str(csv_file))
    else:
        print(f"✗ CSV file not found: {csv_file}")
        print("\nAvailable CSV files in backend:")
        for csv in backend_dir.glob("*.csv"):
            print(f"  - {csv.name}")
