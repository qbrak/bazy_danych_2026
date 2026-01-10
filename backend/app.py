import psycopg
from psycopg.rows import dict_row
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pathlib import Path

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

def get_db_connection() -> psycopg.Connection:
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

#### ACTUALLY USED ####
@app.route('/user_order_summary', methods=['GET'])
def get_orders():
    """
    List all orders with summary info: order_id, user_id, status, total_amount
    """
    
    query = """SELECT * FROM user_order_summary"""
    
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(query)
                items = cursor.fetchall()
                return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

#### ACTUALLY USED ####
@app.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """
    Get single order with items and addresses
    """

    try:
        with get_db_connection() as conn:
            order_details_query = """
                SELECT 
                    o.*,
                    u.*,
                    st.*,
                    row_to_json(sa.*) as shipping_address,
                    row_to_json(ba.*) as billing_address
                FROM orders o 
                JOIN addresses sa ON o.shipping_address_id = sa.address_id
                JOIN addresses ba ON o.billing_address_id = ba.address_id
                JOIN users u ON sa.user_id = u.user_id
                JOIN statuses st ON o.status_id = st.status_id
                WHERE o.order_id = %s
            """

            print(order_details_query)
            # Get order details
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(order_details_query, (order_id,))
                items = cursor.fetchone()
            
            # Get order items
            item_query = """
            SELECT * FROM order_items oi
                JOIN prices p ON (oi.price_id = p.price_id)
                JOIN books b ON (p.isbn = b.isbn)
                WHERE oi.order_id = %s
            """


            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(item_query, (order_id,))
                if items is not None:
                    items['items'] = cursor.fetchall()
                return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/orders', methods=['POST'])
def create_order():
    """Create new order (can include items array)"""
    return jsonify(None), 500 #TODO

@app.route('/orders/<int:order_id>', methods=['PATCH'])
def update_order(order_id):
    """Update order: status_id, payment_time, shipment_time"""
    return jsonify(None), 500 #TODO

@app.route('/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    """Delete an order"""
    return jsonify(None), 500 #TODO


# =============================================================================
# ORDER ITEMS
# =============================================================================

@app.route('/orders/<int:order_id>/items', methods=['GET'])
def get_order_items(order_id):
    """Get items for an order"""
    return jsonify(None), 500 #TODO

@app.route('/orders/<int:order_id>/items', methods=['POST'])
def add_order_item(order_id):
    """Add item to order: price_id, quantity"""
    return jsonify(None), 500 #TODO

@app.route('/order-items/<int:item_id>', methods=['DELETE'])
def delete_order_item(item_id):
    """Remove item from order"""
    return jsonify(None), 500 #TODO


# =============================================================================
# USERS
# =============================================================================

@app.route('/users', methods=['GET'])
def get_users():
    """List all users"""
    query = "SELECT * FROM users"
    
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(query)
                user = cursor.fetchall()
                if user is None:
                    return jsonify({'error': 'User not found'}), 404
                return jsonify(user), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """
    Get single user details
    """
    
    query = "SELECT * FROM users WHERE user_id = %s"
    try:
        with get_db_connection() as conn:
            with conn.cursor(row_factory=dict_row) as cursor:
                cursor.execute(query, (user_id,))
                user = cursor.fetchone()
                if user is None:
                    return jsonify({'error': 'User not found'}), 404
                return jsonify(user), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/users', methods=['POST'])
def create_user():
    """Create new user"""
    return jsonify(None), 500 #TODO

@app.route('/users/<int:user_id>', methods=['PATCH'])
def update_user(user_id):
    """Update user: name, surname, email, phone, email_verified"""
    return jsonify(None), 500 #TODO

@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete user"""
    return jsonify(None), 500 #TODO


# =============================================================================
# ADDRESSES
# =============================================================================

@app.route('/users/<int:user_id>/addresses', methods=['GET'])
def get_user_addresses(user_id):
    """Get addresses for a user"""
    return jsonify(None), 500 #TODO

@app.route('/addresses', methods=['POST'])
def create_address():
    """Create new address"""
    return jsonify(None), 500 #TODO

@app.route('/addresses/<int:address_id>', methods=['PATCH'])
def update_address(address_id):
    """Update address"""
    return jsonify(None), 500 #TODO


# =============================================================================
# BOOKS
# =============================================================================

@app.route('/books', methods=['GET'])
def get_books():
    """
    List all books. Filters: ?search=, ?category_id=, ?author_id=
    
    Setting search will find all books that contain given string in their title
    """
    search = request.args.get('search', type=str)
    category_id = request.args.get('category_id', type=int)
    author_id = request.args.get('author_id', type=str)
    
    query = """\
        SELECT DISTINCT isbn, title, publication_year FROM books
        JOIN book_categories USING (isbn)
        JOIN authorship USING (isbn)
        WHERE 1=1
        """
    
    if search is not None: 
        query = query + f" AND title LIKE '%{search}%'"
        
    if category_id is not None:
        query = query + f" AND category_id = {category_id}"
        
    if author_id is not None:
        query = query + f" AND author_id = '{author_id}'"
    
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query)
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    

@app.route('/books/<isbn>', methods=['GET'])
def get_book(isbn):
    """Get book title, publication year, price id and stocked quantity
    
    This uses LEFT OUTER JOIN, so if the book is not stocked,
    the latter values will be NULL
    """
    
    query = """\
        SELECT title, publication_year, price_id, quantity FROM books
        LEFT OUTER JOIN prices USING (isbn)
        LEFT OUTER JOIN inventory USING (isbn)
        WHERE isbn = %s
        """
        
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (isbn, ))
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/books/<isbn>/authors', methods=['GET'])
def get_book_authors(isbn):
    """Get all authors of a book"""
    
    query = """\
        SELECT author_id, name, surname FROM authors
        JOIN authorship USING (author_id)
        WHERE isbn = %s
        """
        
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (isbn, ))
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/books/<isbn>/categories', methods=['GET'])
def get_book_categories(isbn):
    """Get all categories that the book is in"""
    
    query = """\
        SELECT category_id, category_name FROM categories
        JOIN book_categories USING (category_id)
        WHERE isbn = %s
        """
    
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (isbn, ))
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================================================
# INVENTORY
# =============================================================================

@app.route('/inventory', methods=['GET'])
def get_inventory():
    """List all inventory. Filter: ?low_stock=true
    """
    
    low_stock = request.args.get('low_stock', type=str)
    if low_stock is not None:
        return jsonify({'error': "low stock argument is not yet handled"}), 500 #TODO
    
    query = """SELECT * FROM inventory"""
   
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query)
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/inventory/<int:inventory_id>', methods=['PATCH'])
def update_inventory(inventory_id):
    """Update"""
    return jsonify(None), 500 #TODO

# =============================================================================
# PRICES
# =============================================================================

@app.route('/offers', methods=['GET'])
def get_offers():
    """List all current sell offers. With price_id, unit_price and stocked quantity
    """
    
    query = """\
        SELECT price_id, unit_price, quantity FROM prices
        JOIN books USING (isbn)
        LEFT OUTER JOIN inventory USING (isbn)
        """    
   
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query)
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
@app.route('/price/<isbn>', methods=['GET'])
def get_price_of(isbn):
    """Get all prices of a book (including archival), sorted so that current price is first
    
    Filter: ?valid_only=true -- show only prices that are still valid
    """
    
    valid_only = request.args.get('valid_only', type=bool, default=False)
    
    if valid_only:
        query = """\
            SELECT price_id, unit_price, valid_until FROM prices
            WHERE isbn = %s
            AND valid_until IS NULL
            ORDER BY valid_until DESC
            """
        
    else:
        query = """\
            SELECT price_id, unit_price, valid_until FROM prices
            WHERE isbn = %s
            ORDER BY valid_until DESC
            """
        
    
   
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (isbn, ))
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================================================
# STATUSES
# =============================================================================

@app.route('/statuses', methods=['GET'])
def get_statuses():
    """List all order statuses"""
    
    query = "SELECT * FROM statuses"   
   
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query)
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# =============================================================================
# AUTHORS
# =============================================================================

@app.route('/authors', methods=['GET'])
def get_authors():
    """List all authors"""
    query = "SELECT * FROM authors"   
   
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query)
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/authors', methods=['POST'])
def create_author():
    """Create new author: name"""
    return jsonify(None), 500 #TODO


# =============================================================================
# CATEGORIES
# =============================================================================

@app.route('/categories', methods=['GET'])
def get_categories():
    """List all categories"""
    query = "SELECT * FROM categories"   
   
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query)
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================================================
# REVIEWS
# =============================================================================

@app.route('/books/<isbn>/reviews', methods=['GET'])
def get_book_reviews(isbn):
    """Get reviews for a book"""
    query = "SELECT * FROM reviews WHERE isbn = %s"   
   
    try:
        with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (isbn, ))
            items = cursor.fetchall()
            return jsonify(items), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
