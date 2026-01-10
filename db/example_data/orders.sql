-- First, create some price records for books
-- These prices will be referenced by order_items
INSERT INTO prices (isbn, unit_price, valid_from, valid_until) VALUES
-- Current prices (valid_until is NULL)
('9780534391140', 89.99, '2025-01-01 00:00:00', NULL),  -- Databases
('9780730013426', 75.50, '2025-01-01 00:00:00', NULL),  -- Database
('9780435462635', 120.00, '2025-01-01 00:00:00', NULL), -- Databases
('9780130354624', 95.75, '2025-01-01 00:00:00', NULL),  -- Databases
('9780080285610', 68.25, '2025-01-01 00:00:00', NULL),  -- Database
('9780125449625', 110.00, '2025-01-01 00:00:00', NULL), -- Databases
('9780273031734', 85.50, '2025-01-01 00:00:00', NULL),  -- Databases
('9780130446398', 79.99, '2025-01-01 00:00:00', NULL),  -- Database
('9780077077037', 92.00, '2025-01-01 00:00:00', NULL),  -- Databases
('9780201612554', 105.50, '2025-01-01 00:00:00', NULL); -- Fundamentals Database Systems

-- Historical prices (for older orders)
INSERT INTO prices (isbn, unit_price, valid_from, valid_until) VALUES
('9780534391140', 79.99, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),  -- Old price
('9780730013426', 69.99, '2024-01-01 00:00:00', '2024-12-31 23:59:59'),  -- Old price
('9780435462635', 115.00, '2024-01-01 00:00:00', '2024-12-31 23:59:59'); -- Old price


-- Orders (note: user_id 1-8 exist, addresses 1-16 exist from users.sql)
-- Inventory data is loaded separately from inventory.sql
-- Status IDs: 1='Oczekujące', 2='W realizacji', 3='Wysłane', 4='Dostarczone', 5='Anulowane'

INSERT INTO orders (shipping_address_id, billing_address_id, order_time, payment_time, shipment_time, status_id) VALUES
-- Order 1: Completed order for user 1 (Jan Kowalski)
(1, 1, '2025-12-01 10:30:00', '2025-12-01 10:35:00', '2025-12-02 09:00:00', 4),

-- Order 2: Completed order for user 2 (Anna Nowak)
(3, 3, '2025-12-05 14:20:00', '2025-12-05 14:25:00', '2025-12-06 11:00:00', 4),

-- Order 3: Shipped order for user 3 (Piotr Wiśniewski)
(5, 5, '2025-12-15 09:45:00', '2025-12-15 09:50:00', '2025-12-16 08:30:00', 3),

-- Order 4: In progress order for user 4 (Katarzyna Wójcik)
(7, 7, '2025-12-28 16:00:00', '2025-12-28 16:05:00', NULL, 2),

-- Order 5: Pending payment for user 5 (Michał Kamiński)
(9, 9, '2026-01-08 11:15:00', NULL, NULL, 1),

-- Order 6: Cancelled order for user 1 (different address)
(2, 2, '2025-11-20 13:00:00', '2025-11-20 13:05:00', NULL, 5),

-- Order 7: Large completed order for user 2
(3, 3, '2025-12-10 10:00:00', '2025-12-10 10:10:00', '2025-12-11 09:00:00', 4),

-- Order 8: Recent delivered order for user 6 (Magdalena Lewandowska) - addresses 8
(8, 8, '2025-12-20 15:30:00', '2025-12-20 15:35:00', '2025-12-21 10:00:00', 4),

-- Order 9: Order with different shipping/billing for user 7 (Tomasz Zieliński) - address 9
(9, 9, '2025-12-22 12:00:00', '2025-12-22 12:05:00', '2025-12-23 08:00:00', 3),

-- Order 10: Pending order for user 8 (Agnieszka Szymańska) - addresses 10 or 11
(10, 11, '2026-01-09 09:00:00', NULL, NULL, 1);


-- Order Items (linking orders to inventory via prices)
-- Note: We need to get the correct inventory_id and price_id for each ISBN

-- Order 1 Items (2 books)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(1, (SELECT price_id FROM prices WHERE isbn = '9780534391140' AND valid_until IS NULL), 2),
(1, (SELECT price_id FROM prices WHERE isbn = '9780730013426' AND valid_until IS NULL), 1);

-- Order 2 Items (3 books)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(2, (SELECT price_id FROM prices WHERE isbn = '9780435462635' AND valid_until IS NULL), 1),
(2, (SELECT price_id FROM prices WHERE isbn = '9780130354624' AND valid_until IS NULL), 2),
(2, (SELECT price_id FROM prices WHERE isbn = '9780080285610' AND valid_until IS NULL), 1);

-- Order 3 Items (1 book, multiple copies)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(3, (SELECT price_id FROM prices WHERE isbn = '9780125449625' AND valid_until IS NULL), 5);

-- Order 4 Items (2 different books)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(4, (SELECT price_id FROM prices WHERE isbn = '9780273031734' AND valid_until IS NULL), 1),
(4, (SELECT price_id FROM prices WHERE isbn = '9780130446398' AND valid_until IS NULL), 3);

-- Order 5 Items (single book)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(5, (SELECT price_id FROM prices WHERE isbn = '9780077077037' AND valid_until IS NULL), 1);

-- Order 6 Items (cancelled order - used historical price)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(6, (SELECT price_id FROM prices WHERE isbn = '9780534391140' AND valid_until IS NOT NULL LIMIT 1), 1);

-- Order 7 Items (large order with multiple books)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(7, (SELECT price_id FROM prices WHERE isbn = '9780534391140' AND valid_until IS NULL), 3),
(7, (SELECT price_id FROM prices WHERE isbn = '9780730013426' AND valid_until IS NULL), 2),
(7, (SELECT price_id FROM prices WHERE isbn = '9780435462635' AND valid_until IS NULL), 1),
(7, (SELECT price_id FROM prices WHERE isbn = '9780201612554' AND valid_until IS NULL), 2);

-- Order 8 Items (2 books)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(8, (SELECT price_id FROM prices WHERE isbn = '9780080285610' AND valid_until IS NULL), 2),
(8, (SELECT price_id FROM prices WHERE isbn = '9780125449625' AND valid_until IS NULL), 1);

-- Order 9 Items (3 different books)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(9, (SELECT price_id FROM prices WHERE isbn = '9780273031734' AND valid_until IS NULL), 1),
(9, (SELECT price_id FROM prices WHERE isbn = '9780130446398' AND valid_until IS NULL), 1),
(9, (SELECT price_id FROM prices WHERE isbn = '9780077077037' AND valid_until IS NULL), 2);

-- Order 10 Items (single expensive book)
INSERT INTO order_items (order_id, price_id, quantity) VALUES
(10, (SELECT price_id FROM prices WHERE isbn = '9780201612554' AND valid_until IS NULL), 1);
