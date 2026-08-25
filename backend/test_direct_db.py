import psycopg2

DIRECT_URL = "postgresql://postgres.dddvyozhgcywbbdjonju:Zz2EamGR7lGDHcGr@aws-1-us-west-1.pooler.supabase.com:5432/postgres"

try:
    print("Connecting directly to Supabase on port 5432...")
    conn = psycopg2.connect(DIRECT_URL, connect_timeout=5)
    print("SUCCESS: Connected directly!")
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
