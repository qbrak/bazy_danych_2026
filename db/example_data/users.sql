INSERT INTO users (name, surname, passhash, email, email_verified, phone) VALUES
('Jan', 'Kowalski', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 'jan.kowalski@email.pl', TRUE, '+48 501 234 567'),
('Anna', 'Nowak', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', 'anna.nowak@gmail.com', TRUE, '+48 502 345 678'),
('Piotr', 'Wiśniewski', 'd74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1', 'piotr.wisniewski@wp.pl', FALSE, '+48 503 456 789'),
('Katarzyna', 'Wójcik', '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce', 'k.wojcik@onet.pl', TRUE, NULL),
('Michał', 'Kamiński', '6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b', 'michal.kaminski@outlook.com', TRUE, '+48 505 678 901'),
('Magdalena', 'Lewandowska', 'd4735e3a265e16eee03f59718b9b5d03019c07d8b6c51f90da3a666eec13ab35', 'magda.lewandowska@interia.pl', FALSE, '+48 506 789 012'),
('Tomasz', 'Zieliński', '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a', 'tomasz.zielinski@gmail.com', TRUE, '+48 507 890 123'),
('Agnieszka', 'Szymańska', 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d', 'agnieszka.szymanska@email.pl', TRUE, '+48 508 901 234');

INSERT INTO addresses (user_id, street, building_nr, apartment_nr, city, postal_code, country, is_primary) VALUES
-- Adresy we Wrocławiu
(1, 'ul. Rynek', 15, 3, 'Wrocław', '50-101', 'Polska', TRUE),
(1, 'ul. Świdnicka', 42, NULL, 'Wrocław', '50-024', 'Polska', FALSE),
(2, 'ul. Oławska', 8, 12, 'Wrocław', '50-123', 'Polska', TRUE),
(3, 'ul. Legnicka', 156, 45, 'Wrocław', '54-203', 'Polska', TRUE),
(4, 'ul. Powstańców Śląskich', 89, 7, 'Wrocław', '53-332', 'Polska', TRUE),

-- Adresy w Krakowie
(5, 'ul. Floriańska', 22, 5, 'Kraków', '31-021', 'Polska', TRUE),
(5, 'ul. Grodzka', 55, NULL, 'Kraków', '31-044', 'Polska', FALSE),
(6, 'ul. Krakowska', 18, 9, 'Kraków', '31-062', 'Polska', TRUE),
(7, 'ul. Dietla', 77, 14, 'Kraków', '31-070', 'Polska', TRUE),
(8, 'ul. Starowiślna', 33, 2, 'Kraków', '31-038', 'Polska', TRUE),
(8, 'ul. Karmelicka', 12, 8, 'Kraków', '31-128', 'Polska', FALSE);
