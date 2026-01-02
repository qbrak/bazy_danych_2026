import psycopg
import os
from dotenv import load_dotenv
from pathlib import Path


# Find .env file - look in parent directory (project root)
def load_env():
    # Get the directory where app.py is located
    app_dir = Path(__file__).resolve().parent
    # Project root is one level up from backend/
    project_root = app_dir.parent.parent
    env_path = project_root / ".env"

    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment from: {env_path}")
    else:
        print(f"WARNING: .env file not found at {env_path}")
        print("Using default values or environment variables.")


load_env()

example_dir = Path(__file__).resolve().parent

def get_db_connection():
    conn = psycopg.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432'),
        dbname=os.environ.get('DB_NAME', 'inventory_db'),
        user=os.environ.get('DB_USER', 'inventory_user'),
        password=os.environ.get('DB_PASSWORD', 'secure_password')
    )
    return conn

files = (
    "authors.sql",
    "books.sql",
    "authorship.sql",
    "book_categories.sql",
)

for filename in files:
    with open(f"{example_dir}/example_data/{filename}", "r") as f:
        conn = get_db_connection()
        conn.execute(f.read())
        conn.commit()
        conn.close()

conn.close()
