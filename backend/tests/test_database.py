"""
Database integration tests.
These tests verify that the app can connect to PostgreSQL and perform CRUD operations.
"""

import os
import pytest
from psycopg.rows import dict_row

# Set test database environment variables before importing app
# These match the GitHub Actions postgres service configuration
os.environ.setdefault("DB_HOST", os.environ.get("DATABASE_HOST", "localhost"))
os.environ.setdefault("DB_PORT", os.environ.get("DATABASE_PORT", "5432"))
os.environ.setdefault("DB_NAME", os.environ.get("DATABASE_NAME", "testdb"))
os.environ.setdefault("DB_USER", os.environ.get("DATABASE_USER", "testuser"))
os.environ.setdefault("DB_PASSWORD", os.environ.get("DATABASE_PASSWORD", "testpass"))

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


class TestInventoryAPI:
    """Tests for the inventory API endpoints."""

    @pytest.fixture(autouse=True)
    def setup_inventory_table(self, db_connection, db_cursor):
        """Ensure inventory table exists and is empty before each test."""
        db_cursor.execute("""
            CREATE TABLE IF NOT EXISTS inventory (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price REAL NOT NULL
            )
        """)
        db_cursor.execute("DELETE FROM inventory")
        db_connection.commit()
        yield
        # Cleanup after test
        db_cursor.execute("DELETE FROM inventory")
        db_connection.commit()

    def test_get_items_empty(self, client):
        """Test GET /items returns empty list when no items exist."""
        response = client.get('/items')
        assert response.status_code == 200
        assert response.json == []

    def test_add_item(self, client):
        """Test POST /items creates a new item."""
        response = client.post('/items', json={
            'name': 'Widget',
            'quantity': 10,
            'price': 9.99
        })
        assert response.status_code == 201
        data = response.json
        assert data['name'] == 'Widget'
        assert data['quantity'] == 10
        assert data['price'] == 9.99
        assert 'id' in data

    def test_add_item_missing_fields(self, client):
        """Test POST /items returns error when fields are missing."""
        response = client.post('/items', json={
            'name': 'Widget'
            # missing quantity and price
        })
        assert response.status_code == 400
        assert 'error' in response.json

    def test_get_items_after_adding(self, client):
        """Test GET /items returns items after adding them."""
        # Add an item
        client.post('/items', json={
            'name': 'Gadget',
            'quantity': 5,
            'price': 19.99
        })
        
        # Get all items
        response = client.get('/items')
        assert response.status_code == 200
        items = response.json
        assert len(items) == 1
        assert items[0]['name'] == 'Gadget'

    def test_delete_item(self, client):
        """Test DELETE /items/<id> removes an item."""
        # Add an item
        add_response = client.post('/items', json={
            'name': 'Gizmo',
            'quantity': 3,
            'price': 29.99
        })
        item_id = add_response.json['id']
        
        # Delete it
        delete_response = client.delete(f'/items/{item_id}')
        assert delete_response.status_code == 200
        
        # Verify it's gone
        get_response = client.get('/items')
        assert get_response.json == []

    def test_full_crud_workflow(self, client):
        """Test a complete create, read, delete workflow."""
        # Create
        create_response = client.post('/items', json={
            'name': 'Test Item',
            'quantity': 100,
            'price': 49.99
        })
        assert create_response.status_code == 201
        item_id = create_response.json['id']
        
        # Read
        read_response = client.get('/items')
        assert len(read_response.json) == 1
        assert read_response.json[0]['id'] == item_id
        
        # Delete
        delete_response = client.delete(f'/items/{item_id}')
        assert delete_response.status_code == 200
        
        # Verify deleted
        final_response = client.get('/items')
        assert final_response.json == []
