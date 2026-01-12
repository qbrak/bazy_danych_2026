#!/usr/bin/env python3
"""
Generate inventory and prices for all books in the database.
Creates inventory.sql and prices.sql with realistic data.
"""

import hashlib
import random
from datetime import datetime, timedelta
from pathlib import Path

def parse_books(books_sql_path):
    """Extract ISBN and publication_year from books.sql"""
    books = []
    with open(books_sql_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip().startswith('('):
                # Parse: (9780534391140, 'Databases', 2006),
                parts = line.strip().strip('(),').split(',')
                if len(parts) >= 3:
                    isbn = parts[0].strip()
                    year = parts[2].strip()
                    if year == 'NULL':
                        year = None
                    else:
                        try:
                            year = int(year)
                        except:
                            year = None
                    books.append((isbn, year))
    return books

def generate_price_history(isbn, year):
    """Generate multiple price records with Poisson-like distribution over time"""
    # Use ISBN hash for consistent randomness
    hash_val = int(hashlib.md5(isbn.encode()).hexdigest()[:8], 16)
    random.seed(hash_val)
    
    current_year = 2026
    pub_year = year if year else current_year - 20  # Default to 20 years ago if unknown
    years_since_pub = max(1, current_year - pub_year)
    
    # Number of price changes using Poisson-like distribution
    # Average: 1 change every 2-3 years
    lambda_param = years_since_pub / 2.5
    num_changes = max(1, min(10, int(random.expovariate(1/max(0.5, lambda_param))) + 1))
    
    # Generate initial price at publication
    if years_since_pub < 3:
        base = random.uniform(35, 65)
    elif years_since_pub < 10:
        base = random.uniform(25, 45)
    else:
        base = random.uniform(15, 35)
    
    initial_price = int(base) + (0.99 if random.random() > 0.5 else 0.49)
    initial_price = max(7.99, initial_price)
    
    # Generate price records
    price_records = []
    
    if num_changes == 1:
        # Single price from publication to now
        price_records.append({
            'isbn': isbn,
            'price': initial_price,
            'valid_from': f"{pub_year}-01-01",
            'valid_until': 'NULL'
        })
    else:
        # Generate change dates
        change_dates = []
        for i in range(1, num_changes):
            # Distribute changes across time
            year_offset = (i * years_since_pub) // num_changes
            change_year = pub_year + year_offset
            month = random.randint(1, 12)
            day = random.randint(1, 28)
            change_dates.append(f"{change_year:04d}-{month:02d}-{day:02d}")
        
        change_dates.sort()
        
        # Generate prices with variations
        current_price = initial_price
        valid_from = f"{pub_year}-01-01"
        
        for change_date in change_dates:
            price_records.append({
                'isbn': isbn,
                'price': round(current_price, 2),
                'valid_from': valid_from,
                'valid_until': f"'{change_date}'"
            })
            
            # Next price varies by ±5-15%
            change_factor = random.uniform(0.88, 1.12)
            current_price = current_price * change_factor
            current_price = max(7.99, min(75.99, current_price))
            
            # Round to .99 or .49
            current_price = int(current_price) + (0.99 if random.random() > 0.5 else 0.49)
            valid_from = change_date
        
        # Final (current) price
        price_records.append({
            'isbn': isbn,
            'price': round(current_price, 2),
            'valid_from': valid_from,
            'valid_until': 'NULL'
        })
    
    return price_records

def generate_inventory_quantity(isbn):
    """Generate inventory quantity - some out of stock, some well stocked"""
    hash_val = int(hashlib.md5(isbn.encode()).hexdigest()[:8], 16)
    random.seed(hash_val)
    
    # 10% chance of out of stock
    if random.random() < 0.10:
        return 0
    
    # 20% chance of low stock
    elif random.random() < 0.30:
        return random.randint(1, 15)
    
    # 50% chance of medium stock
    elif random.random() < 0.80:
        return random.randint(16, 75)
    
    # 20% chance of high stock
    else:
        return random.randint(76, 150)

def generate_reorder_threshold(quantity):
    """Generate sensible reorder threshold"""
    if quantity == 0:
        return 10
    elif quantity < 20:
        return random.randint(8, 12)
    elif quantity < 50:
        return random.randint(12, 18)
    else:
        return random.randint(15, 25)

def generate_last_restocked():
    """Generate random restock date in last 3 months"""
    days_ago = random.randint(1, 90)
    date = datetime.now() - timedelta(days=days_ago)
    return date.strftime('%Y-%m-%d')

def main():
    script_dir = Path(__file__).parent
    books_sql = script_dir / 'example_data' / 'books.sql'
    inventory_sql = script_dir / 'example_data' / 'inventory_generated.sql'
    prices_sql = script_dir / 'example_data' / 'prices_generated.sql'
    
    print(f"Reading books from {books_sql}...")
    books = parse_books(books_sql)
    print(f"Found {len(books)} books")
    
    print("Generating inventory and prices...")
    
    # Generate inventory.sql
    with open(inventory_sql, 'w', encoding='utf-8') as inv_f:
        inv_f.write("-- Generated inventory for all books\n")
        inv_f.write("-- Generated by generate_inventory.py\n\n")
        inv_f.write("INSERT INTO inventory (isbn, reorder_threshold, quantity_reserved, quantity, last_restocked) VALUES\n")
        
        inventory_lines = []
        for isbn, year in books:
            quantity = generate_inventory_quantity(isbn)
            threshold = generate_reorder_threshold(quantity)
            last_restock = generate_last_restocked()
            reserved = 0  # No reservations by default
            
            line = f"('{isbn}', {threshold}, {reserved}, {quantity}, '{last_restock}')"
            inventory_lines.append(line)
        
        inv_f.write(',\n'.join(inventory_lines))
        inv_f.write(';\n')
    
    # Generate prices.sql
    with open(prices_sql, 'w', encoding='utf-8') as price_f:
        price_f.write("-- Generated prices for all books\n")
        price_f.write("-- Generated by generate_inventory.py\n")
        price_f.write("-- Multiple price records per book showing price history\n\n")
        price_f.write("INSERT INTO prices (isbn, unit_price, valid_from, valid_until) VALUES\n")
        
        price_lines = []
        for isbn, year in books:
            price_history = generate_price_history(isbn, year)
            for record in price_history:
                line = f"('{record['isbn']}', {record['price']:.2f}, '{record['valid_from']}', {record['valid_until']})"
                price_lines.append(line)
        
        price_f.write(',\n'.join(price_lines))
        price_f.write(';\n')
    
    print(f"✓ Generated {inventory_sql}")
    print(f"✓ Generated {prices_sql}")
    print(f"\nGenerated {len(books)} inventory records")
    
    # Count total price records
    total_prices = sum(len(generate_price_history(isbn, year)) for isbn, year in books[:100])
    avg_prices_per_book = total_prices / 100
    print(f"Average ~{avg_prices_per_book:.1f} price records per book (showing price history)")
    print("\nYou can now:")
    print("1. Review the generated files")
    print("2. Rename inventory.sql → inventory_old.sql")
    print("3. Rename inventory_generated.sql → inventory.sql")
    print("4. Update db_loader.py to load prices_generated.sql")

if __name__ == '__main__':
    main()
