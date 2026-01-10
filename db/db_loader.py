"""
Database loader module.
Provides functions to set up the database schema and load example data.
Can be used both for initial repo setup and for testing.
"""

import psycopg
import os
from dotenv import load_dotenv
from pathlib import Path


# Directory paths
DB_DIR = Path(__file__).resolve().parent
EXAMPLE_DATA_DIR = DB_DIR / "example_data"
PROJECT_ROOT = DB_DIR.parent


def load_env():
    """Load environment variables from .env file if it exists."""
    env_path = PROJECT_ROOT / ".env"

    if env_path.exists():
        load_dotenv(env_path)  # Doesn't override existing env vars
        print(f"Loaded environment from: {env_path}")
    else:
        print(f"WARNING: .env file not found at {env_path}")
        print("Using default values or environment variables.")


def get_db_connection():
    """
    Get a database connection using environment variables.

    Environment variables:
        DB_HOST: Database host (default: localhost)
        DB_PORT: Database port (default: 5432)
        DB_NAME: Database name (default: inventory_db)
        DB_USER: Database user (default: inventory_user)
        DB_PASSWORD: Database password (default: secure_password)

    Returns:
        psycopg.Connection: A database connection object
    """
    conn = psycopg.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        port=os.environ.get("DB_PORT", "5432"),
        dbname=os.environ.get("DB_NAME", "inventory_db"),
        user=os.environ.get("DB_USER", "inventory_user"),
        password=os.environ.get("DB_PASSWORD", "secure_password"),
    )
    return conn


def load_schema(conn=None, close_conn=False):
    """
    Load the database schema from create_tables.sql.

    Args:
        conn: Optional existing database connection. If None, creates a new one.
        close_conn: Whether to close the connection after loading (default: False)

    Returns:
        psycopg.Connection: The database connection used
    """
    if conn is None:
        conn = get_db_connection()
        close_conn = True

    schema_file = DB_DIR / "create_tables.sql"
    print(f"Loading schema from: {schema_file}")

    with open(schema_file, "r") as f:
        conn.execute(f.read())
    conn.commit()

    print("Schema loaded successfully.")

    if close_conn:
        conn.close()
        return None
    return conn


def load_example_data(conn=None, close_conn=False):
    """
    Load example data from SQL files in example_data directory.

    Args:
        conn: Optional existing database connection. If None, creates a new one.
        close_conn: Whether to close the connection after loading (default: False)

    Returns:
        psycopg.Connection: The database connection used (or None if closed)
    """
    if conn is None:
        conn = get_db_connection()
        close_conn = True

    # Base example data files (order matters due to foreign keys)
    files = [
        "authors.sql",
        "books.sql",
        "authorship.sql",
        "book_categories.sql",
        "inventory.sql",  # Load inventory before orders
        "users.sql",  # Need users to get addresses right
        "orders.sql",  # Orders depends on inventory
        "reviews.sql",
    ]

    for filename in files:
        filepath = EXAMPLE_DATA_DIR / filename
        if filepath.exists():
            print(f"Loading example data from: {filename}")
            with open(filepath, "r") as f:
                conn.execute(f.read())
        else:
            print(f"WARNING: Example data file not found: {filepath}")

    conn.commit()
    print("Example data loaded successfully.")

    if close_conn:
        conn.close()
        return None
    return conn


def setup_database(conn=None, close_conn=True):
    """
    Full database setup: load schema and example data.

    This is the main entry point for setting up the database.

    Args:
        conn: Optional existing database connection. If None, creates a new one.
        close_conn: Whether to close the connection after setup (default: True)

    Returns:
        psycopg.Connection: The database connection used (or None if closed)
    """
    if conn is None:
        conn = get_db_connection()

    print("=" * 50)
    print("Setting up database...")
    print("=" * 50)

    load_schema(conn, close_conn=False)
    load_example_data(conn, close_conn=False)

    print("=" * 50)
    print("Database setup complete!")
    print("=" * 50)

    if close_conn:
        conn.close()
        return None
    return conn


# When run directly as a script, set up the database
if __name__ == "__main__":
    load_env()
    setup_database()
