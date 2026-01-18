import json
import logging
import psycopg
from psycopg.rows import dict_row
from flask import Flask, jsonify, request, abort
from flask_cors import CORS
import os
from dotenv import load_dotenv
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

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

# Error handlers - centralized logging for all error responses
@app.errorhandler(400)
def handle_bad_request(e):
    logging.warning(f"Bad request: {e.description}")
    return jsonify({'error': e.description}), 400

@app.errorhandler(404)
def handle_not_found(e):
    logging.warning(f"Not found: {e.description}")
    return jsonify({'error': e.description}), 404

@app.errorhandler(Exception)
def handle_exception(e):
    logging.error(f"Unhandled exception: {e}", exc_info=True)
    # For psycopg errors, extract just the main message (before CONTEXT:)
    error_msg = str(e).split('\nCONTEXT:')[0]
    return jsonify({'error': error_msg}), 500

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
    """List all orders with summary info: order_id, user_id, status, total_amount"""
    query = """SELECT * FROM user_order_summary"""
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query)
            items = cursor.fetchall()
            return jsonify(items), 200

#### ACTUALLY USED ####
@app.route('/orders/<int:order_id>', methods=['GET'])
def get_order(order_id):
    """Get single order with items and addresses"""
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

        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(order_details_query, (order_id,))
            items = cursor.fetchone()

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

@app.route('/create_order', methods=['POST'])
def create_order_transaction_route():
    """
    Create a new order with order items and reserve inventory atomically.

    Expected JSON body:
    {
        "shipping_address_id": int,
        "billing_address_id": int,
        "items": [{"isbn": str, "quantity": int}]
    }

    Returns the created order_id and status.
    """
    data = request.get_json()
    if not data:
        abort(400, description='No JSON data provided')

    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT create_order_transaction(%s, %s, %s)
            """, (
                data['shipping_address_id'],
                data['billing_address_id'],
                json.dumps(data['items'])
            ))
            result = cursor.fetchone()[0]

    return jsonify(result), 201


# =============================================================================
# USERS
# =============================================================================

@app.route('/users', methods=['GET'])
def get_users():
    """List all users"""
    query = "SELECT * FROM users"
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query)
            users = cursor.fetchall()
            return jsonify(users), 200

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get single user details"""
    query = "SELECT * FROM users WHERE user_id = %s"
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (user_id,))
            user = cursor.fetchone()
            if user is None:
                abort(404, description='User not found')
            return jsonify(user), 200

@app.route('/users', methods=['POST'])
def create_user():
    """Create new user with optional primary address"""
    data = request.get_json()
    if not data:
        abort(400, description='No JSON data provided')

    required_fields = ['name', 'surname', 'email', 'passhash']
    for field in required_fields:
        if field not in data or not data[field]:
            abort(400, description=f'Missing required field: {field}')

    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            # Insert the user
            cursor.execute("""
                INSERT INTO users (name, surname, passhash, email, email_verified, phone)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING user_id, name, surname, email, phone, email_verified
            """, (
                data['name'],
                data['surname'],
                data['passhash'],
                data['email'],
                data.get('email_verified', False),
                data.get('phone')
            ))
            user = cursor.fetchone()

            # If address data is provided, create the address
            if data.get('address'):
                addr = data['address']
                cursor.execute("""
                    INSERT INTO addresses (user_id, street, building_nr, apartment_nr, city, postal_code, country, is_primary)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, TRUE)
                    RETURNING address_id
                """, (
                    user['user_id'],
                    addr.get('street'),
                    addr.get('building_nr'),
                    addr.get('apartment_nr'),
                    addr.get('city'),
                    addr.get('postal_code'),
                    addr.get('country', 'Polska')
                ))

            conn.commit()
            return jsonify(user), 201

@app.route('/users/<int:user_id>', methods=['PATCH'])
def update_user(user_id):
    """Update user: name, surname, email, phone, email_verified"""
    data = request.get_json()
    if not data:
        abort(400, description='No JSON data provided')

    # Build dynamic update query based on provided fields
    allowed_fields = ['name', 'surname', 'email', 'phone', 'email_verified']
    updates = []
    values = []

    for field in allowed_fields:
        if field in data:
            updates.append(f"{field} = %s")
            values.append(data[field])

    if not updates:
        abort(400, description='No valid fields to update')

    values.append(user_id)

    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            # Check if user exists
            cursor.execute("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
            if cursor.fetchone() is None:
                abort(404, description='User not found')

            # Update user
            query = f"""
                UPDATE users
                SET {', '.join(updates)}
                WHERE user_id = %s
                RETURNING user_id, name, surname, email, phone, email_verified
            """
            cursor.execute(query, values)
            user = cursor.fetchone()
            conn.commit()
            return jsonify(user), 200

@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete user"""
    return jsonify(None), 500 #TODO


# =============================================================================
# ADDRESSES
# =============================================================================

@app.route('/users/<int:user_id>/addresses', methods=['GET'])
def get_user_addresses(user_id):
    """List addresses for a user, ordered by address_id for consistency"""
    query = "SELECT * FROM addresses WHERE user_id = %s ORDER BY address_id"
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, (user_id,))
            addresses = cursor.fetchall()
            return jsonify(addresses), 200

@app.route('/users/<int:user_id>/addresses', methods=['POST'])
def create_address(user_id):
    """Create new address for a user"""
    data = request.get_json()
    if not data:
        abort(400, description='No JSON data provided')

    required_fields = ['street', 'city', 'postal_code']
    for field in required_fields:
        if field not in data or not data[field]:
            abort(400, description=f'Missing required field: {field}')

    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            # Check if user exists
            cursor.execute("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
            if cursor.fetchone() is None:
                abort(404, description='User not found')

            # If this should be primary, unset other primary addresses first
            is_primary = data.get('is_primary', False)
            if is_primary:
                cursor.execute(
                    "UPDATE addresses SET is_primary = FALSE WHERE user_id = %s",
                    (user_id,)
                )

            # Insert the address
            cursor.execute("""
                INSERT INTO addresses (user_id, street, building_nr, apartment_nr, city, postal_code, country, is_primary)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
            """, (
                user_id,
                data['street'],
                data.get('building_nr'),
                data.get('apartment_nr'),
                data['city'],
                data['postal_code'],
                data.get('country', 'Polska'),
                is_primary
            ))
            address = cursor.fetchone()
            conn.commit()
            return jsonify(address), 201

@app.route('/addresses/<int:address_id>', methods=['PATCH'])
def update_address(address_id):
    """Update address (including setting as primary)"""
    data = request.get_json()
    if not data:
        abort(400, description='No JSON data provided')

    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            # Get the address and its user_id
            cursor.execute("SELECT * FROM addresses WHERE address_id = %s", (address_id,))
            address = cursor.fetchone()
            if address is None:
                abort(404, description='Address not found')

            # If setting as primary and it's not already primary, unset other primary addresses first
            if data.get('is_primary', False) and not address['is_primary']:
                cursor.execute(
                    "UPDATE addresses SET is_primary = FALSE WHERE user_id = %s AND is_primary = TRUE",
                    (address['user_id'],)
                )
            elif data.get('is_primary', False) and address['is_primary']:
                # Already primary, just return the current address
                return jsonify(address), 200

            # Build dynamic update query
            allowed_fields = ['street', 'building_nr', 'apartment_nr', 'city', 'postal_code', 'country', 'is_primary']
            updates = []
            values = []

            for field in allowed_fields:
                if field in data:
                    updates.append(f"{field} = %s")
                    values.append(data[field])

            if not updates:
                abort(400, description='No valid fields to update')

            values.append(address_id)

            query = f"""
                UPDATE addresses
                SET {', '.join(updates)}
                WHERE address_id = %s
                RETURNING *
            """
            cursor.execute(query, values)
            updated_address = cursor.fetchone()
            conn.commit()
            return jsonify(updated_address), 200


# =============================================================================
# BOOKS
# =============================================================================

@app.route('/books', methods=['GET'])
def get_books():
    """List all books with their authors aggregated."""
    query = """\
        SELECT
            b.isbn,
            b.title,
            b.publication_year,
            p.unit_price,
            COALESCE(i.quantity - i.quantity_reserved, 0) AS available_quantity,
            COALESCE(
                json_agg(
                    json_build_object(
                        'author_id', a.author_id,
                        'name', a.name,
                        'surname', a.surname
                    ) ORDER BY a.surname, a.name
                ) FILTER (WHERE a.author_id IS NOT NULL),
                '[]'::json
            ) as authors
        FROM books b
        LEFT JOIN authorship au ON b.isbn = au.isbn
        LEFT JOIN authors a ON au.author_id = a.author_id
        LEFT JOIN prices p ON b.isbn = p.isbn AND p.valid_until IS NULL
        LEFT JOIN inventory i ON b.isbn = i.isbn
        GROUP BY b.isbn, b.title, b.publication_year, p.unit_price, i.quantity, i.quantity_reserved
        ORDER BY b.title
        """
    with get_db_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query)
            items = cursor.fetchall()
            return jsonify(items), 200


@app.route('/books/<isbn>', methods=['GET'])
def get_book(isbn):
    """Get book summary with price, inventory and rating."""
    query = """\
        SELECT title, publication_year, price_id, unit_price, inventory_id,
            quantity, stars FROM books
        JOIN avg_rating USING (isbn)
        LEFT OUTER JOIN prices USING (isbn)
        LEFT OUTER JOIN inventory USING (isbn)
        WHERE isbn = %s
        AND valid_until IS NULL
        """
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query, (isbn, ))
        items = cursor.fetchall()
        return jsonify(items), 200

@app.route('/books/<isbn>/authors', methods=['GET'])
def get_book_authors(isbn):
    """Get all authors of a book"""
    query = """\
        SELECT author_id, name, surname FROM authors
        JOIN authorship USING (author_id)
        WHERE isbn = %s
        """
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query, (isbn, ))
        items = cursor.fetchall()
        return jsonify(items), 200

@app.route('/books/<isbn>/categories', methods=['GET'])
def get_book_categories(isbn):
    """Get all categories that the book is in"""
    query = """\
        SELECT category_id, category_name FROM categories
        JOIN book_categories USING (category_id)
        WHERE isbn = %s
        """
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query, (isbn, ))
        items = cursor.fetchall()
        return jsonify(items), 200

# =============================================================================
# INVENTORY
# =============================================================================

@app.route('/inventory', methods=['GET'])
def get_inventory():
    """List all inventory. Filter: ?low_stock=true"""
    low_stock = request.args.get('low_stock', type=str)
    if low_stock is not None:
        return jsonify({'error': "low stock argument is not yet handled"}), 500 #TODO

    query = """SELECT * FROM inventory"""
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query)
        items = cursor.fetchall()
        return jsonify(items), 200

@app.route('/inventory/<int:inventory_id>', methods=['PATCH'])
def update_inventory(inventory_id):
    """Update"""
    return jsonify(None), 500 #TODO

# =============================================================================
# PRICES
# =============================================================================

@app.route('/offers', methods=['GET'])
def get_offers():
    """List all current sell offers with price_id, unit_price and stocked quantity"""
    query = """\
        SELECT price_id, unit_price, quantity FROM prices
        JOIN books USING (isbn)
        LEFT OUTER JOIN inventory USING (isbn)
        """
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query)
        items = cursor.fetchall()
        return jsonify(items), 200

@app.route('/price/<isbn>', methods=['GET'])
def get_price_of(isbn):
    """Get all prices of a book. Filter: ?valid_only=true"""
    valid_only = request.args.get('valid_only', type=bool, default=False)

    if valid_only:
        query = """\
            SELECT price_id, unit_price, valid_until FROM prices
            WHERE isbn = %s AND valid_until IS NULL
            ORDER BY valid_until DESC
            """
    else:
        query = """\
            SELECT price_id, unit_price, valid_until FROM prices
            WHERE isbn = %s
            ORDER BY valid_until DESC
            """

    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query, (isbn, ))
        items = cursor.fetchall()
        return jsonify(items), 200

# =============================================================================
# STATUSES
# =============================================================================

@app.route('/statuses', methods=['GET'])
def get_statuses():
    """List all order statuses"""
    query = "SELECT * FROM statuses"
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query)
        items = cursor.fetchall()
        return jsonify(items), 200


# =============================================================================
# AUTHORS
# =============================================================================

@app.route('/authors', methods=['GET'])
def get_authors():
    """List all authors"""
    query = "SELECT * FROM authors"
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query)
        items = cursor.fetchall()
        return jsonify(items), 200

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
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query)
        items = cursor.fetchall()
        return jsonify(items), 200

# =============================================================================
# REVIEWS
# =============================================================================

@app.route('/users/<int:user_id>/reviews', methods=['GET'])
def get_user_reviews(user_id):
    """Get reviews written by a user"""
    query = """
        SELECT r.*, b.title,
            COALESCE(
                json_agg(
                    json_build_object(
                        'author_id', a.author_id,
                        'name', a.name,
                        'surname', a.surname
                    ) ORDER BY a.surname, a.name
                ) FILTER (WHERE a.author_id IS NOT NULL),
                '[]'::json
            ) as authors
        FROM reviews r
        JOIN books b USING (isbn)
        LEFT JOIN authorship s USING (isbn)
        LEFT JOIN authors a USING (author_id)
        WHERE r.user_id = %s
        GROUP BY r.review_id, b.title
        ORDER BY r.review_date DESC
    """
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query, (user_id,))
        items = cursor.fetchall()
        return jsonify(items), 200


@app.route('/books/<isbn>/reviews', methods=['GET'])
def get_book_reviews(isbn):
    """Get reviews for a book"""
    query = "SELECT * FROM reviews WHERE isbn = %s"
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query, (isbn, ))
        items = cursor.fetchall()
        return jsonify(items), 200

@app.route('/books/bestsellers', methods=['GET'])
def get_bestsellers():
    """Get books that were bought the most times"""
    query = """\
        SELECT isbn, title, sum(quantity) as sold_copies FROM books
        JOIN prices USING (isbn)
        JOIN order_items USING (price_id)
        GROUP BY isbn
        ORDER BY sold_copies DESC
        """
    with get_db_connection() as conn, conn.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query)
        items = cursor.fetchall()
        return jsonify(items), 200


if __name__ == '__main__':
    app.run(port=5000)
