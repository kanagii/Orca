-- =====================================================
--  Canteen System — Full Database Setup
--  Database: citcreds1
--  Run this in phpMyAdmin > citcreds1 > SQL tab
--
--  Sample user passwords: password123
--  Default staff password: password  (change immediately)
-- =====================================================

USE citcreds1;

-- ── USERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id     INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    user_type   ENUM('student', 'teacher', 'staff') NOT NULL DEFAULT 'student',
    balance     DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- represents amount OWED to canteen (increases on purchase)
    password    VARCHAR(255)  NOT NULL DEFAULT '',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── USER BUDGET ────────────────────────────────────
-- Students can set a monthly spending limit.
-- budget_limit = 0 means no limit.
CREATE TABLE IF NOT EXISTS user_budget (
    user_id      INT           NOT NULL,
    budget_limit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ── PRODUCT ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product (
    product_id  INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    price       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    stock       INT           NOT NULL DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── TRANSACTION ────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction (
    transaction_id   INT           AUTO_INCREMENT PRIMARY KEY,
    user_id          INT           NOT NULL,
    processed_by     INT           NOT NULL DEFAULT 1,  -- staff user_id who processed it
    total_amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    transaction_date TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ── TRANSACTION ITEM ───────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_item (
    item_id        INT           AUTO_INCREMENT PRIMARY KEY,
    transaction_id INT           NOT NULL,
    product_id     INT           NOT NULL,
    quantity       INT           NOT NULL DEFAULT 1,
    subtotal       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    FOREIGN KEY (transaction_id) REFERENCES transaction(transaction_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id)     REFERENCES product(product_id)         ON DELETE CASCADE
);

-- ── SAMPLE USERS ───────────────────────────────────
-- Students & teachers: password = "password123"
-- Staff:               password = "password"  ← change this immediately after first login
INSERT INTO users (name, user_type, balance, password) VALUES
    ('Ana Reyes',     'student', 0.00, '$2y$10$ludRLUSqOOMVZwR5YBKsd.t53a.QY97XiuSsoXqEpBYXKT9HjYnOy'),
    ('Ben Santos',    'student', 0.00, '$2y$10$ludRLUSqOOMVZwR5YBKsd.t53a.QY97XiuSsoXqEpBYXKT9HjYnOy'),
    ('Maria Cruz',    'teacher', 0.00, '$2y$10$ludRLUSqOOMVZwR5YBKsd.t53a.QY97XiuSsoXqEpBYXKT9HjYnOy'),
    ('Jose Lim',      'student', 0.00, '$2y$10$ludRLUSqOOMVZwR5YBKsd.t53a.QY97XiuSsoXqEpBYXKT9HjYnOy'),
    ('Canteen Staff', 'staff',   0.00, '$2y$10$OyrOxnvw6HPudjYUw6hEh.VBOeV7.2n1c6Caj7BlfcPbckyhEwd02');

-- ── SAMPLE PRODUCTS ────────────────────────────────
INSERT INTO product (name, price, stock) VALUES
    ('Fried Rice',     45.00, 20),
    ('Chicken Adobo',  65.00, 15),
    ('Soda (Regular)', 20.00, 50),
    ('Pancit Canton',  55.00,  8),
    ('Buko Juice',     25.00, 30);
