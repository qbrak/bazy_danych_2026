"""
Database integration tests.
These tests verify that we can connect to PostgreSQL and perform CRUD operations.
"""

import os
import pytest
import psycopg
from psycopg.rows import dict_row


def get_db_connection():
    """Create a database connection using environment variables."""
    return psycopg.connect(
        host=os.environ.get("DATABASE_HOST", "localhost"),
        port=os.environ.get("DATABASE_PORT", "5432"),
        dbname=os.environ.get("DATABASE_NAME", "testdb"),
        user=os.environ.get("DATABASE_USER", "testuser"),
        password=os.environ.get("DATABASE_PASSWORD", "testpass"),
    )


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


class TestInventoryTable:
    """Tests for inventory table CRUD operations."""

    @pytest.fixture(autouse=True)
    def setup_inventory_table(self, db_connection, db_cursor):
        """Create a test inventory table before each test."""
        db_cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 0,
                price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        db_connection.commit()
        yield
        # Cleanup: drop the table after each test
        db_cursor.execute("DROP TABLE IF EXISTS inventory")
        db_connection.commit()

    def test_create_inventory_item(self, db_connection, db_cursor):
        """Test inserting a new item into inventory."""
        db_cursor.execute(
            "INSERT INTO inventory (name, quantity, price) VALUES (%s, %s, %s) RETURNING id",
            ("Widget", 10, 9.99)
        )
        result = db_cursor.fetchone()
        db_connection.commit()
        
        assert result["id"] is not None
        assert result["id"] > 0

    def test_read_inventory_item(self, db_connection, db_cursor):
        """Test reading an item from inventory."""
        # Insert an item
        db_cursor.execute(
            "INSERT INTO inventory (name, quantity, price) VALUES (%s, %s, %s) RETURNING id",
            ("Gadget", 5, 19.99)
        )
        inserted_id = db_cursor.fetchone()["id"]
        db_connection.commit()
        
        # Read it back
        db_cursor.execute("SELECT * FROM inventory WHERE id = %s", (inserted_id,))
        result = db_cursor.fetchone()
        
        assert result["name"] == "Gadget"
        assert result["quantity"] == 5
        assert float(result["price"]) == 19.99

    def test_update_inventory_item(self, db_connection, db_cursor):
        """Test updating an item in inventory."""
        # Insert an item
        db_cursor.execute(
            "INSERT INTO inventory (name, quantity, price) VALUES (%s, %s, %s) RETURNING id",
            ("Gizmo", 3, 29.99)
        )
        inserted_id = db_cursor.fetchone()["id"]
        db_connection.commit()
        
        # Update the quantity
        db_cursor.execute(
            "UPDATE inventory SET quantity = %s WHERE id = %s",
            (10, inserted_id)
        )
        db_connection.commit()
        
        # Verify the update
        db_cursor.execute("SELECT quantity FROM inventory WHERE id = %s", (inserted_id,))
        result = db_cursor.fetchone()
        
        assert result["quantity"] == 10

    def test_delete_inventory_item(self, db_connection, db_cursor):
        """Test deleting an item from inventory."""
        # Insert an item
        db_cursor.execute(
            "INSERT INTO inventory (name, quantity, price) VALUES (%s, %s, %s) RETURNING id",
            ("Thingamajig", 1, 99.99)
        )
        inserted_id = db_cursor.fetchone()["id"]
        db_connection.commit()
        
        # Delete it
        db_cursor.execute("DELETE FROM inventory WHERE id = %s", (inserted_id,))
        db_connection.commit()
        
        # Verify it's gone
        db_cursor.execute("SELECT * FROM inventory WHERE id = %s", (inserted_id,))
        result = db_cursor.fetchone()
        
        assert result is None

    def test_list_all_inventory_items(self, db_connection, db_cursor):
        """Test listing all items in inventory."""
        # Insert multiple items
        items = [
            ("Item A", 10, 5.00),
            ("Item B", 20, 10.00),
            ("Item C", 30, 15.00),
        ]
        for name, qty, price in items:
            db_cursor.execute(
                "INSERT INTO inventory (name, quantity, price) VALUES (%s, %s, %s)",
                (name, qty, price)
            )
        db_connection.commit()
        
        # List all items
        db_cursor.execute("SELECT * FROM inventory ORDER BY name")
        results = db_cursor.fetchall()
        
        assert len(results) == 3
        assert results[0]["name"] == "Item A"
        assert results[1]["name"] == "Item B"
        assert results[2]["name"] == "Item C"

    def test_calculate_total_inventory_value(self, db_connection, db_cursor):
        """Test calculating total inventory value using SQL."""
        # Insert items
        items = [
            ("Widget", 10, 9.99),   # 99.90
            ("Gadget", 5, 19.99),   # 99.95
        ]
        for name, qty, price in items:
            db_cursor.execute(
                "INSERT INTO inventory (name, quantity, price) VALUES (%s, %s, %s)",
                (name, qty, price)
            )
        db_connection.commit()
        
        # Calculate total value
        db_cursor.execute("SELECT SUM(quantity * price) as total_value FROM inventory")
        result = db_cursor.fetchone()
        
        assert float(result["total_value"]) == pytest.approx(199.85, rel=1e-2)
