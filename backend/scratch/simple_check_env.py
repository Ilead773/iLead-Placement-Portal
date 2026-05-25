import os
from pathlib import Path

# Try to load .env manually
env_path = Path(r'c:\Users\shahi\OneDrive\Documents\iLEAD_Placement_portal\backend\.env')
print(f"Checking for .env at: {env_path}")
print(f"File exists: {env_path.exists()}")

if env_path.exists():
    with open(env_path, 'r') as f:
        print("First 2 lines of .env:")
        print(f.readline().strip())
        print(f.readline().strip())

try:
    import dotenv
    dotenv.load_dotenv(env_path)
    print("python-dotenv load_dotenv() called")
except ImportError:
    print("python-dotenv not installed")

print(f"JSEARCH_API_KEY: {os.environ.get('JSEARCH_API_KEY')}")
