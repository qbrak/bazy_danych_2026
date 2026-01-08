"""
Database integration tests.
These tests verify that the app can connect to PostgreSQL and perform CRUD operations.
"""

import os
import sys
import pytest
from psycopg.rows import dict_row
from pathlib import Path

# Add db directory to path so we can import db_loader
DB_DIR = Path(__file__).resolve().parent.parent.parent / "db"
sys.path.insert(0, str(DB_DIR))

# For CI compatibility: Map DATABASE_* vars (used in CI) to DB_* vars
# This must happen BEFORE loading .env so env vars take precedence
for ci_var, db_var in [("DATABASE_HOST", "DB_HOST"), ("DATABASE_PORT", "DB_PORT"),
                        ("DATABASE_NAME", "DB_NAME"), ("DATABASE_USER", "DB_USER"),
                        ("DATABASE_PASSWORD", "DB_PASSWORD")]:
    if os.environ.get(ci_var):
        os.environ[db_var] = os.environ[ci_var]

# Load environment variables from .env file (won't override vars already set above)
from db_loader import load_env
load_env()

# Import the actual app code we're testing
from app import get_db_connection, app


@pytest.fixture
def db_connection():
    """Fixture that provides a database connection and cleans up after tests."""
    conn = get_db_connection()
    yield conn
    conn.rollback()
    conn.close()


@pytest.fixture
def db_cursor(db_connection):
    """Fixture that provides a database cursor."""
    cursor = db_connection.cursor(row_factory=dict_row)
    yield cursor
    cursor.close()


@pytest.fixture
def client():
    """Fixture that provides a Flask test client."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestDatabaseConnection:
    """Tests for basic database connectivity."""

    def test_can_connect_to_database(self, db_connection):
        """Test that we can establish a connection to the database."""
        assert db_connection is not None
        assert not db_connection.closed

    def test_can_execute_simple_query(self, db_cursor):
        """Test that we can execute a simple SQL query."""
        db_cursor.execute("SELECT 1 as result")
        result = db_cursor.fetchone()
        assert result["result"] == 1

    def test_database_version(self, db_cursor):
        """Test that we can retrieve the PostgreSQL version."""
        db_cursor.execute("SELECT version()")
        result = db_cursor.fetchone()
        assert "PostgreSQL" in result["version"]
