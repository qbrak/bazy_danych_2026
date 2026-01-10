-- Delete object if exists in reverse order of dependencies to avoid conflicts
DROP INDEX IF EXISTS idx_prices_current CASCADE;


DROP VIEW IF EXISTS user_order_summary CASCADE;
DROP VIEW IF EXISTS order_item_details CASCADE;
DROP VIEW IF EXISTS avg_rating CASCADE;


DROP TABLE IF EXISTS authors CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS authorship CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS book_categories CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS statuses CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS prices CASCADE;



-- Tables about books;

CREATE TABLE authors(
    author_id TEXT PRIMARY KEY,
    name           varchar(100) NOT NULL,
    surname        varchar(50) -- can be NULL for organizations
);


CREATE TABLE books(
    isbn             TEXT PRIMARY KEY,
    title            TEXT NOT NULL,
    publication_year INTEGER,
    
    CHECK (length(isbn) = 10 OR length(isbn) = 13)
);


CREATE TABLE authorship(
    isbn      TEXT NOT NULL REFERENCES books(isbn) ON DELETE RESTRICT ON UPDATE CASCADE,
    author_id TEXT NOT NULL REFERENCES authors(author_id) ON DELETE RESTRICT ON UPDATE CASCADE
);


CREATE TABLE categories(
    category_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name TEXT NOT NULL UNIQUE
);


CREATE TABLE book_categories(
    isbn        TEXT NOT NULL REFERENCES books(isbn) ON DELETE CASCADE ON UPDATE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT ON UPDATE CASCADE
);


-- Tables about users:


CREATE TABLE users(
    user_id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           varchar(30) NOT NULL,
    surname        varchar(50) NOT NULL,
    passhash       char(64) NOT NULL,             -- store password hash created by SHA256
    email          varchar(100) NOT NULL UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    phone          VARCHAR(20)
);


CREATE TABLE addresses(
    address_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- if user removes their account we want to remember adresses, just not who they belong to
    user_id      INTEGER REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE, 
    street       varchar(100) NOT NULL,
    building_nr  INTEGER NOT NULL,
    apartment_nr INTEGER,
    city         varchar(100) NOT NULL,
    postal_code  varchar(15) NOT NULL,
    country      varchar(100) NOT NULL,
    is_primary   BOOLEAN NOT NULL
);


CREATE TABLE reviews(
    review_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     INTEGER REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    isbn        TEXT NOT NULL REFERENCES books(isbn) ON DELETE CASCADE ON UPDATE CASCADE,
    review_body varchar(2000),
    stars       INTEGER NOT NULL,
    
    CHECK (0 <= stars AND stars <= 5)
);

CREATE VIEW avg_rating AS (
    SELECT isbn, AVG(r.stars)::NUMERIC(3, 2) as stars FROM books
    LEFT OUTER JOIN reviews r USING (isbn)
    GROUP BY isbn
    ORDER BY stars DESC NULLS LAST
);

-- Inventory tables:



CREATE TABLE inventory(
    inventory_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    isbn              TEXT NOT NULL UNIQUE REFERENCES books(isbn) ON DELETE RESTRICT ON UPDATE CASCADE,
    reorder_threshold INTEGER NOT NULL DEFAULT 10,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    last_restocked    DATE,
    quantity          INTEGER NOT NULL DEFAULT 0
    
    CHECK (quantity >= 0)
    CHECK (quantity_reserved >= 0),
    CHECK (reorder_threshold >= 0)
);

-- Tables about orders:


CREATE TABLE statuses(
    status_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status_name TEXT NOT NULL UNIQUE
);


CREATE TABLE orders(
    order_id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    -- if adress is deleted we want to keep info about the order, so ON DELETE SET NULL
    shipping_address_id INTEGER REFERENCES addresses(address_id) ON DELETE SET NULL ON UPDATE CASCADE,
    billing_address_id  INTEGER REFERENCES addresses(address_id) ON DELETE SET NULL ON UPDATE CASCADE,
    order_time          timestamp NOT NULL,
    payment_time        timestamp,
    shipment_time       timestamp,
    status_id           INTEGER REFERENCES statuses(status_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE VIEW user_order_summary AS (
    SELECT o.order_id, u.user_id, u.name, u.surname, s.status_name, o.order_time, o.payment_time, o.shipment_time
    FROM orders o
    JOIN addresses a ON o.shipping_address_id = a.address_id
    JOIN users u ON a.user_id = u.user_id
    JOIN statuses s ON o.status_id = s.status_id
);

CREATE TABLE prices(
    price_id    INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    isbn        TEXT NOT NULL REFERENCES books(isbn) ON DELETE RESTRICT ON UPDATE CASCADE,
    unit_price  DECIMAL(7, 2) NOT NULL,
    valid_from  TIMESTAMP NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMP,  -- NULL means current
    
    CHECK (unit_price >= 0),
    CHECK (valid_until IS NULL OR valid_until > valid_from)
);

-- Add index for efficient "current price" queries
CREATE INDEX idx_prices_current ON prices(price_id ) WHERE valid_until IS NULL;

CREATE TABLE order_items(
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    price_id     INTEGER NOT NULL REFERENCES prices(price_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity     INTEGER NOT NULL
);

CREATE VIEW order_item_details AS (
    SELECT oi.id, oi.order_id, b.title, b.isbn, p.unit_price, oi.quantity
    FROM order_items oi
    JOIN prices p ON oi.price_id = p.price_id
    JOIN books b ON p.isbn = b.isbn
);

-- Populate the `statuses` enumeration table:
INSERT INTO statuses(status_name) VALUES 
    ('Oczekujące'), ('W realizacji'), ('Wysłane'), ('Dostarczone'), ('Anulowane')
;

INSERT INTO categories(category_name) VALUES
    ('databases'), ('political_studies'), ('horror'), ('psychology'), ('programming'), ('biology'), ('medicine'), ('literature')
;
------------------------------------------------------------------
--------------------- TRIGGERS AND FUNCTIONS ---------------------
------------------------------------------------------------------

-- Define trigger
CREATE OR REPLACE FUNCTION validate_order_address_ownership()
RETURNS TRIGGER AS $$
DECLARE
    shipping_owner_id INT;
    billing_owner_id INT;
BEGIN
    SELECT user_id INTO shipping_owner_id 
        FROM addresses 
        WHERE address_id = NEW.shipping_address_id;
    SELECT user_id INTO billing_owner_id 
        FROM addresses 
        WHERE address_id = NEW.billing_address_id;
    IF shipping_owner_id <> billing_owner_id THEN
        RAISE EXCEPTION 'Shipping and billing addresses must belong to the same user';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to Orders table
CREATE TRIGGER trg_validate_order_address_ownership
BEFORE INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION validate_order_address_ownership();


CREATE OR REPLACE FUNCTION validate_at_most_one_primary_address()
RETURNS TRIGGER AS $$
DECLARE
    primary_address_count INT;
BEGIN
    -- Only check if the NEW row is attempting to be primary
    IF NEW.is_primary = TRUE THEN
        SELECT count(*) INTO primary_address_count 
            FROM addresses 
            WHERE user_id = NEW.user_id 
              AND is_primary = TRUE
              -- If inserting new row, then NEW.address can be NULL so exclude this CASE
              -- by using a value that cannot match any address_id
              AND address_id != COALESCE(NEW.address_id, -1); 
        
        IF primary_address_count > 0 THEN
            RAISE EXCEPTION 'At most one primary address is allowed per user';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_at_most_one_primary_address
BEFORE INSERT OR UPDATE ON addresses
FOR EACH ROW
EXECUTE FUNCTION validate_at_most_one_primary_address();
