import psycopg2
from psycopg2.extras import RealDictCursor
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
import time

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))

app = Flask(__name__)
CORS(app)

def get_db_connection():
    conn = psycopg2.connect(
        host=os.environ.get('DB_HOST', 'localhost'),
        port=os.environ.get('DB_PORT', '5432'),
        database=os.environ.get('DB_NAME', 'inventory_db'),
        user=os.environ.get('DB_USER', 'inventory_user'),
        password=os.environ.get('DB_PASSWORD', 'secure_password')
    )
    return conn

def init_db():
    retries = 5
    while retries > 0:
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS inventory (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    price REAL NOT NULL
                )
            ''')
            conn.commit()
            cursor.close()
            conn.close()
            print("Database initialized successfully.")
            return
        except Exception as e:
            print(f"Error initializing database: {e}")
            print(f"Retrying in 2 seconds... ({retries} retries left)")
            time.sleep(2)
            retries -= 1

@app.route('/items', methods=['GET'])
def get_items():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute('SELECT * FROM inventory')
        items = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(items)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/items', methods=['POST'])
def add_item():
    data = request.json
    name = data.get('name')
    quantity = data.get('quantity')
    price = data.get('price')
    
    if not name or quantity is None or price is None:
        return jsonify({'error': 'Missing fields'}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO inventory (name, quantity, price) VALUES (%s, %s, %s) RETURNING id',
            (name, quantity, price)
        )
        new_id = cursor.fetchone()[0]
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'id': new_id, 'name': name, 'quantity': quantity, 'price': price}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/items/<int:item_id>', methods=['DELETE'])
def delete_item(item_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM inventory WHERE id = %s', (item_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({'message': 'Deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    init_db()
    app.run(port=5000)
