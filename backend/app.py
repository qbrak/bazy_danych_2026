import psycopg
from psycopg.rows import dict_row
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pathlib import Path
import time

# Find .env file - look in parent directory (project root)
def load_env():
    # Get the directory where app.py is located
    app_dir = Path(__file__).resolve().parent
    # Project root is one level up from backend/
    project_root = app_dir.parent
    env_path = project_root / '.env'
    
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded environment from: {env_path}")
    else:
        print(f"WARNING: .env file not found at {env_path}")
        print("Using default values or environment variables.")

load_env()

app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = psycopg.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432'),
        dbname=os.environ.get('DB_NAME', 'inventory_db'),
        user=os.environ.get('DB_USER', 'inventory_user'),
        password=os.environ.get('DB_PASSWORD', 'secure_password')
    )
    return conn

# =============================================================================
# ORDERS (Primary Resource)
# =============================================================================

@app.route('/orders', methods=['GET'])
def get_orders():
    """List all orders with optional filters: ?status_id=, ?user_id="""
    pass

@app.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """Get single order with items and addresses"""
    pass

@app.route('/orders', methods=['POST'])
def create_order():
    """Create new order (can include items array)"""
    pass

@app.route('/orders/<int:order_id>', methods=['PATCH'])
def update_order(order_id):
    """Update order: status_id, payment_time, shipment_time"""
    pass

@app.route('/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    """Delete an order"""
    pass


# =============================================================================
# ORDER ITEMS
# =============================================================================

@app.route('/orders/<int:order_id>/items', methods=['GET'])
def get_order_items(order_id):
    """Get items for an order"""
    pass

@app.route('/orders/<int:order_id>/items', methods=['POST'])
def add_order_item(order_id):
    """Add item to order: inventory_id, quantity"""
    pass

@app.route('/order-items/<int:item_id>', methods=['DELETE'])
def delete_order_item(item_id):
    """Remove item from order"""
    pass


# =============================================================================
# USERS
# =============================================================================

@app.route('/users', methods=['GET'])
def get_users():
    """List all users"""
    pass

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get user with addresses"""
    pass

@app.route('/users', methods=['POST'])
def create_user():
    """Create new user"""
    pass

@app.route('/users/<int:user_id>', methods=['PATCH'])
def update_user(user_id):
    """Update user: name, surname, email, phone, email_verified"""
    pass

@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete user"""
    pass


# =============================================================================
# ADDRESSES
# =============================================================================

@app.route('/users/<int:user_id>/addresses', methods=['GET'])
def get_user_addresses(user_id):
    """Get addresses for a user"""
    pass

@app.route('/addresses', methods=['POST'])
def create_address():
    """Create new address"""
    pass

@app.route('/addresses/<int:address_id>', methods=['PATCH'])
def update_address(address_id):
    """Update address"""
    pass


# =============================================================================
# BOOKS
# =============================================================================

@app.route('/books', methods=['GET'])
def get_books():
    """List all books. Filters: ?search=, ?category_id=, ?author_id="""
    pass

@app.route('/books/<isbn>', methods=['GET'])
def get_book(isbn):
    """Get book with authors, categories, inventory"""
    pass


# =============================================================================
# INVENTORY
# =============================================================================

@app.route('/inventory', methods=['GET'])
def get_inventory():
    """List all inventory. Filter: ?low_stock=true"""
    """ This should be already split by warehouse location !!! """
    pass

@app.route('/inventory/<int:inventory_id>', methods=['PATCH'])
def update_inventory(inventory_id):
    """Update: quantity_reserved, reorder_threshold, unit_cost, last_restocked"""
    pass


# =============================================================================
# STATUSES
# =============================================================================

@app.route('/statuses', methods=['GET'])
def get_statuses():
    """List all order statuses"""
    pass


# =============================================================================
# AUTHORS
# =============================================================================

@app.route('/authors', methods=['GET'])
def get_authors():
    """List all authors"""
    pass

@app.route('/authors', methods=['POST'])
def create_author():
    """Create new author: name"""
    pass


# =============================================================================
# CATEGORIES
# =============================================================================

@app.route('/categories', methods=['GET'])
def get_categories():
    """List all categories"""
    pass

# =============================================================================
# REVIEWS
# =============================================================================

@app.route('/books/<isbn>/reviews', methods=['GET'])
def get_book_reviews(isbn):
    """Get reviews for a book"""
    pass

if __name__ == '__main__':
    app.run(port=5000)
