from sqlalchemy import create_engine

DATABASE_URL = "postgresql+psycopg://postgres:Duckstorm2026@db.stpfrepyjipehqftgies.supabase.co:5432/postgres?sslmode=require"

engine = create_engine(DATABASE_URL)

try:
    conn = engine.connect()
    print("CONNECTED")
    conn.close()
except Exception as e:
    print("ERROR:", e)
