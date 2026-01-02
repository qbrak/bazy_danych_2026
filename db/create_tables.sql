DROP TABLE IF EXISTS authors CASCADE;
DROP TABLE IF EXISTS books CASCADE;
DROP TABLE IF EXISTS authorship CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS book_categories CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS warehouse CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS statuses CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;

DROP VIEW IF EXISTS inventory_stock CASCADE;

-- Tables about books:


CREATE TABLE authors(
    author_id TEXT PRIMARY KEY,
    name      TEXT NOT NULL
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



-- Inventory tables:


CREATE TABLE inventory(
    inventory_id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    isbn              TEXT NOT NULL UNIQUE REFERENCES books(isbn) ON DELETE RESTRICT ON UPDATE CASCADE,
    unit_cost         decimal(7, 2),
    reorder_threshold INTEGER NOT NULL DEFAULT 10,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    last_restocked    DATE
    
    CHECK (unit_cost >= 0),
    CHECK (quantity_reserved >= 0),
    CHECK (reorder_threshold >= 0)
);


CREATE TABLE warehouse(
    shelf_nr     INTEGER CHECK (shelf_nr >=0),
    shelf_level  INTEGER CHECK (shelf_level >=0),
    shelf_offset INTEGER CHECK (shelf_offset >=0),
    inventory_id INTEGER REFERENCES inventory(inventory_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity     INTEGER NOT NULL DEFAULT 0,
    
    PRIMARY KEY (shelf_nr, shelf_level, shelf_offset),
    CHECK (quantity >= 0)
);

CREATE VIEW inventory_stock AS (
    SELECT inventory_id, sum(quantity) AS quantity
    FROM warehouse
    GROUP BY inventory_id
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
    stars       decimal(1) NOT NULL
    
    CHECK (0 <= stars AND stars <= 5)
);



-- Tables about orders:


CREATE TABLE statuses(
    status_id   INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status_name TEXT NOT NULL UNIQUE
);


CREATE TABLE orders(
    order_id            INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id             INTEGER REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE,
    -- if adress is deleted we want to keep info about the order, so ON DELETE SET NULL
    shipping_address_id INTEGER REFERENCES addresses(address_id) ON DELETE SET NULL ON UPDATE CASCADE,
    billing_address_id  INTEGER REFERENCES addresses(address_id) ON DELETE SET NULL ON UPDATE CASCADE,
    order_time          timestamp NOT NULL,
    payment_time        timestamp,
    shipment_time       timestamp,
    status_id           INTEGER REFERENCES statuses(status_id) ON DELETE RESTRICT ON UPDATE CASCADE
);


CREATE TABLE order_items(
    id           INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id     INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    inventory_id INTEGER NOT NULL REFERENCES inventory(inventory_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    quantity     INTEGER NOT NULL
);


-- Populate the `statuses` enumeration table:
INSERT INTO statuses(status_name) VALUES 
    ('Oczekujące'), ('W realizacji'), ('Wysłane'), ('Dostarczone'), ('Anulowane')
;

INSERT INTO categories(category_name) VALUES
    ('databases'), ('political_studies'), ('horror'), ('psychology'), ('programming'), ('biology'), ('medicine'), ('literature')
;
