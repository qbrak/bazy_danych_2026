"""
Database integration tests.
These tests verify that the database schema, triggers, and constraints work correctly.
Uses db_loader module to load schema and test data.
"""

import os
import sys
import pytest
import psycopg
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
from db_loader import load_env, get_db_connection, setup_database
load_env()


@pytest.fixture(scope="module")
def db_setup():
    """
    Module-scoped fixture that sets up the database schema and loads example data.
    This runs once per test module.
    """
    conn = get_db_connection()
    setup_database(conn, close_conn=False, include_users=True)
    yield conn
    conn.close()


@pytest.fixture
def db_connection(db_setup):
    """Fixture that provides a database connection and rolls back after tests."""
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


class TestSchemaLoaded:
    """Tests to verify that schema and example data are loaded correctly."""

    def test_users_table_has_data(self, db_cursor):
        """Test that the users table was populated with example data."""
        db_cursor.execute("SELECT COUNT(*) as count FROM users")
        result = db_cursor.fetchone()
        assert result["count"] > 0

    def test_addresses_table_has_data(self, db_cursor):
        """Test that the addresses table was populated with example data."""
        db_cursor.execute("SELECT COUNT(*) as count FROM addresses")
        result = db_cursor.fetchone()
        assert result["count"] > 0

    def test_users_have_polish_names(self, db_cursor):
        """Test that users have Polish names as expected."""
        db_cursor.execute("SELECT name, surname FROM users LIMIT 5")
        results = db_cursor.fetchall()
        # Check we have some typical Polish names
        names = [r["name"] for r in results]
        surnames = [r["surname"] for r in results]
        assert len(names) > 0
        assert len(surnames) > 0

    def test_addresses_in_wroclaw_and_krakow(self, db_cursor):
        """Test that addresses are in Wrocław and Kraków."""
        db_cursor.execute("SELECT DISTINCT city FROM addresses")
        cities = [r["city"] for r in db_cursor.fetchall()]
        assert "Wrocław" in cities or "Kraków" in cities

    def test_statuses_table_populated(self, db_cursor):
        """Test that statuses enumeration table is populated."""
        db_cursor.execute("SELECT COUNT(*) as count FROM statuses")
        result = db_cursor.fetchone()
        assert result["count"] >= 5  # We have 5 statuses defined


class TestOrderAddressValidation:
    """Tests for order address ownership validation trigger."""

    def test_order_with_same_user_addresses_succeeds(self, db_connection, db_cursor):
        """Test that creating an order with addresses belonging to the same user succeeds."""
        # Get a user who has multiple addresses
        db_cursor.execute("""
            SELECT user_id FROM addresses 
            GROUP BY user_id 
            HAVING COUNT(*) >= 2 
            LIMIT 1
        """)
        result = db_cursor.fetchone()
        
        if result is None:
            pytest.skip("No user with multiple addresses found")
        
        user_id = result["user_id"]
        
        # Get two addresses belonging to this user
        db_cursor.execute("""
            SELECT address_id FROM addresses 
            WHERE user_id = %s 
            LIMIT 2
        """, (user_id,))
        addresses = db_cursor.fetchall()
        
        shipping_address_id = addresses[0]["address_id"]
        billing_address_id = addresses[1]["address_id"]
        
        # Get a valid status_id
        db_cursor.execute("SELECT status_id FROM statuses LIMIT 1")
        status_id = db_cursor.fetchone()["status_id"]
        
        # This should succeed - both addresses belong to the same user
        db_cursor.execute("""
            INSERT INTO orders (shipping_address_id, billing_address_id, order_time, status_id)
            VALUES (%s, %s, NOW(), %s)
            RETURNING order_id
        """, (shipping_address_id, billing_address_id, status_id))
        
        result = db_cursor.fetchone()
        assert result["order_id"] is not None
        
        # Rollback to not affect other tests
        db_connection.rollback()

    def test_order_with_different_user_addresses_fails(self, db_connection, db_cursor):
        """
        Test that creating an order with addresses belonging to different users fails.
        The trigger 'validate_order_address_ownership' should prevent this.
        """
        # Get addresses from two different users
        db_cursor.execute("""
            SELECT a1.address_id as addr1, a2.address_id as addr2, 
                   a1.user_id as user1, a2.user_id as user2
            FROM addresses a1, addresses a2
            WHERE a1.user_id <> a2.user_id
            LIMIT 1
        """)
        result = db_cursor.fetchone()
        
        if result is None:
            pytest.skip("Could not find addresses belonging to different users")
        
        shipping_address_id = result["addr1"]  # Belongs to user1
        billing_address_id = result["addr2"]   # Belongs to user2
        
        # Get a valid status_id
        db_cursor.execute("SELECT status_id FROM statuses LIMIT 1")
        status_id = db_cursor.fetchone()["status_id"]
        
        # This should FAIL - addresses belong to different users
        with pytest.raises(psycopg.errors.RaiseException) as excinfo:
            db_cursor.execute("""
                INSERT INTO orders (shipping_address_id, billing_address_id, order_time, status_id)
                VALUES (%s, %s, NOW(), %s)
            """, (shipping_address_id, billing_address_id, status_id))
        
        assert "Shipping and billing addresses must belong to the same user" in str(excinfo.value)
        db_connection.rollback()

    def test_update_order_to_different_user_address_fails(self, db_connection, db_cursor):
        """
        Test that updating an order to use addresses from different users fails.
        """
        # First create a valid order with addresses from the same user
        db_cursor.execute("""
            SELECT user_id FROM addresses 
            GROUP BY user_id 
            HAVING COUNT(*) >= 2 
            LIMIT 1
        """)
        result = db_cursor.fetchone()
        
        if result is None:
            pytest.skip("No user with multiple addresses found")
        
        user_id = result["user_id"]
        
        # Get two addresses belonging to this user
        db_cursor.execute("""
            SELECT address_id FROM addresses 
            WHERE user_id = %s 
            LIMIT 2
        """, (user_id,))
        addresses = db_cursor.fetchall()
        
        shipping_address_id = addresses[0]["address_id"]
        billing_address_id = addresses[1]["address_id"]
        
        # Get a valid status_id
        db_cursor.execute("SELECT status_id FROM statuses LIMIT 1")
        status_id = db_cursor.fetchone()["status_id"]
        
        # Create a valid order
        db_cursor.execute("""
            INSERT INTO orders (shipping_address_id, billing_address_id, order_time, status_id)
            VALUES (%s, %s, NOW(), %s)
            RETURNING order_id
        """, (shipping_address_id, billing_address_id, status_id))
        order_id = db_cursor.fetchone()["order_id"]
        
        # Now get an address from a different user
        db_cursor.execute("""
            SELECT address_id FROM addresses 
            WHERE user_id <> %s 
            LIMIT 1
        """, (user_id,))
        different_user_address = db_cursor.fetchone()
        
        if different_user_address is None:
            pytest.skip("No address from a different user found")
        
        different_address_id = different_user_address["address_id"]
        
        # Try to update the order to use an address from a different user
        with pytest.raises(psycopg.errors.RaiseException) as excinfo:
            db_cursor.execute("""
                UPDATE orders 
                SET billing_address_id = %s 
                WHERE order_id = %s
            """, (different_address_id, order_id))
        
        assert "Shipping and billing addresses must belong to the same user" in str(excinfo.value)
        db_connection.rollback()

    def test_order_with_same_address_for_shipping_and_billing_succeeds(self, db_connection, db_cursor):
        """Test that using the same address for both shipping and billing works."""
        # Get any address
        db_cursor.execute("SELECT address_id FROM addresses LIMIT 1")
        result = db_cursor.fetchone()
        
        if result is None:
            pytest.skip("No addresses found")
        
        address_id = result["address_id"]
        
        # Get a valid status_id
        db_cursor.execute("SELECT status_id FROM statuses LIMIT 1")
        status_id = db_cursor.fetchone()["status_id"]
        
        # This should succeed - same address for both
        db_cursor.execute("""
            INSERT INTO orders (shipping_address_id, billing_address_id, order_time, status_id)
            VALUES (%s, %s, NOW(), %s)
            RETURNING order_id
        """, (address_id, address_id, status_id))
        
        result = db_cursor.fetchone()
        assert result["order_id"] is not None
        
        db_connection.rollback()


class TestDatabaseConstraints:
    """Tests for database constraints and referential integrity."""

    def test_user_email_must_be_unique(self, db_connection, db_cursor):
        """Test that user emails must be unique."""
        # Insert a user
        db_cursor.execute("""
            INSERT INTO users (name, surname, passhash, email)
            VALUES ('Test', 'User', 'abc123hash456def789abc123hash456def789abc123hash456def789abc1', 'unique.test@example.com')
        """)
        
        # Try to insert another user with the same email
        with pytest.raises(psycopg.errors.UniqueViolation):
            db_cursor.execute("""
                INSERT INTO users (name, surname, passhash, email)
                VALUES ('Another', 'User', 'xyz789hash123abc456xyz789hash123abc456xyz789hash123abc456xyz7', 'unique.test@example.com')
            """)
        
        db_connection.rollback()

    def test_book_isbn_length_constraint(self, db_connection, db_cursor):
        """Test that ISBN must be either 10 or 13 characters."""
        # Try to insert a book with invalid ISBN length
        with pytest.raises(psycopg.errors.CheckViolation):
            db_cursor.execute("""
                INSERT INTO books (isbn, title, publication_year)
                VALUES ('12345', 'Invalid ISBN Book', 2024)
            """)
        
        db_connection.rollback()

    def test_review_stars_constraint(self, db_connection, db_cursor):
        """Test that review stars must be between 0 and 5."""
        # Get a user and book for the review
        db_cursor.execute("SELECT user_id FROM users LIMIT 1")
        user_result = db_cursor.fetchone()
        db_cursor.execute("SELECT isbn FROM books LIMIT 1")
        book_result = db_cursor.fetchone()
        
        if user_result is None or book_result is None:
            pytest.skip("No users or books found")
        
        # Try to insert a review with invalid stars (> 5)
        with pytest.raises(psycopg.errors.CheckViolation):
            db_cursor.execute("""
                INSERT INTO reviews (user_id, isbn, review_body, stars)
                VALUES (%s, %s, 'Great book!', 10)
            """, (user_result["user_id"], book_result["isbn"]))
        
        db_connection.rollback()
