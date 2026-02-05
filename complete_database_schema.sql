
-- ========================================
-- COMPLETE DATABASE SCHEMA FOR REGISTER MANAGEMENT SYSTEM
-- This file contains all tables, indexes, constraints, and sample data
-- Can be run on any MySQL/MariaDB database
-- ========================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS supply_orders;
DROP TABLE IF EXISTS demand_orders;
DROP TABLE IF EXISTS bill_orders;
DROP TABLE IF EXISTS sanction_gen_project;
DROP TABLE IF EXISTS sanction_misc;
DROP TABLE IF EXISTS sanction_training;

-- ========================================
-- USER AUTHENTICATION TABLES
-- ========================================

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    security_answer_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(20) NOT NULL,
    permission_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_role_permission (role, permission_name),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- SUPPLY ORDERS TABLE
-- ========================================

CREATE TABLE supply_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_no INT,
    supply_order_no VARCHAR(255),
    so_date DATE,
    firm_name VARCHAR(255),
    nomenclature TEXT,
    quantity VARCHAR(100),
    original_date DATE,
    revised_date1 DATE,
    revised_date2 DATE,
    revised_date3 DATE,
    build_up DECIMAL(15,2),
    maint DECIMAL(15,2),
    misc DECIMAL(15,2),
    project_less_2cr DECIMAL(15,2),
    project_more_2cr DECIMAL(15,2),
    project_no_pdc VARCHAR(255),
    p_np VARCHAR(10),
    expenditure_head VARCHAR(255),
    rev_cap VARCHAR(10),
    imms_demand_no VARCHAR(255),
    actual_delivery_date DATE,
    procurement_mode VARCHAR(100),
    delivery_done VARCHAR(50),
    remarks TEXT,
    financial_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_financial_year (financial_year),
    INDEX idx_serial_no (serial_no),
    INDEX idx_imms_demand_no (imms_demand_no),
    CHECK (rev_cap IN ('R', 'C', NULL)),
    CHECK (p_np IN ('P', 'NP', NULL)),
    CHECK (delivery_done IN ('Completed', 'In Progress', 'Pending', NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- DEMAND ORDERS TABLE
-- ========================================

CREATE TABLE demand_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_no INT,
    imms_demand_no VARCHAR(255),
    demand_date DATE,
    mmg_control_no VARCHAR(255),
    control_date DATE,
    nomenclature TEXT,
    quantity VARCHAR(100),
    expenditure_head VARCHAR(255),
    code_head VARCHAR(255),
    rev_cap VARCHAR(10),
    procurement_mode VARCHAR(100),
    est_cost DECIMAL(15,2),
    imms_control_no VARCHAR(255),
    supply_order_placed VARCHAR(3) DEFAULT 'No',
    remarks TEXT,
    financial_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_financial_year (financial_year),
    INDEX idx_serial_no (serial_no),
    INDEX idx_imms_demand_no (imms_demand_no),
    CHECK (rev_cap IN ('R', 'C', NULL)),
    CHECK (supply_order_placed IN ('Yes', 'No', NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- BILL ORDERS TABLE
-- ========================================

CREATE TABLE bill_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_no INT,
    bill_control_date DATE,
    firm_name VARCHAR(255),
    supply_order_no VARCHAR(255),
    so_date DATE,
    project_no VARCHAR(255),
    build_up DECIMAL(15,2),
    maintenance DECIMAL(15,2),
    project_less_2cr DECIMAL(15,2),
    project_more_2cr DECIMAL(15,2),
    procurement_mode VARCHAR(100),
    rev_cap VARCHAR(10),
    date_amount_passed VARCHAR(255),
    ld_amount DECIMAL(15,2),
    remarks TEXT,
    financial_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_financial_year (financial_year),
    INDEX idx_serial_no (serial_no),
    CHECK (rev_cap IN ('R', 'C', NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- SANCTION TABLES
-- ========================================

CREATE TABLE sanction_gen_project (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_no INT,
    date DATE,
    file_no VARCHAR(255),
    sanction_code VARCHAR(255),
    code VARCHAR(255),
    np_proj VARCHAR(255),
    power VARCHAR(255),
    code_head VARCHAR(255),
    rev_cap VARCHAR(10),
    amount DECIMAL(15,2),
    uo_no VARCHAR(255),
    uo_date DATE,
    amendment TEXT,
    financial_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_financial_year (financial_year),
    INDEX idx_serial_no (serial_no),
    CHECK (rev_cap IN ('R', 'C', NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sanction_misc (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_no INT,
    date DATE,
    file_no VARCHAR(255),
    sanction_code VARCHAR(255),
    code VARCHAR(255),
    np_proj VARCHAR(255),
    power VARCHAR(255),
    code_head VARCHAR(255),
    rev_cap VARCHAR(10),
    amount DECIMAL(15,2),
    uo_no VARCHAR(255),
    uo_date DATE,
    amendment TEXT,
    financial_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_financial_year (financial_year),
    INDEX idx_serial_no (serial_no),
    CHECK (rev_cap IN ('R', 'C', NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE sanction_training (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_no INT,
    date DATE,
    file_no VARCHAR(255),
    sanction_code VARCHAR(255),
    code VARCHAR(255),
    np_proj VARCHAR(255),
    power VARCHAR(255),
    code_head VARCHAR(255),
    rev_cap VARCHAR(10),
    amount DECIMAL(15,2),
    uo_no VARCHAR(255),
    uo_date DATE,
    amendment TEXT,
    financial_year VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_financial_year (financial_year),
    INDEX idx_serial_no (serial_no),
    CHECK (rev_cap IN ('R', 'C', NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================
-- INSERT DEFAULT USERS (passwords are hashed with bcrypt)
-- Default password for all users: respective role name + 123
-- Security answer for all: "god" (hashed)
-- ========================================

-- Note: These are example hashed passwords. In production, generate new hashes.
INSERT INTO users (username, password_hash, security_answer_hash, role) VALUES
('admin', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIBx8fBuOe', '$2b$12$8k1p3YsY9K7D1Y8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0', 'admin'),
('viewer', '$2b$12$viewer_hash_example', '$2b$12$8k1p3YsY9K7D1Y8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0', 'viewer'),
('transfer', '$2b$12$transfer_hash_example', '$2b$12$8k1p3YsY9K7D1Y8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0', 'transfer'),
('pdf', '$2b$12$pdf_hash_example', '$2b$12$8k1p3YsY9K7D1Y8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0', 'pdf'),
('network', '$2b$12$network_hash_example', '$2b$12$8k1p3YsY9K7D1Y8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0', 'network'),
('permission', '$2b$12$permission_hash_example', '$2b$12$8k1p3YsY9K7D1Y8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0euZs8Y3Y9Y0', 'super_admin');

-- ========================================
-- SAMPLE DATA - Can be removed or modified as needed
-- ========================================

-- Sample Supply Orders (2025-2026)
INSERT INTO supply_orders (serial_no, supply_order_no, so_date, firm_name, nomenclature, quantity, original_date, build_up, maint, misc, financial_year) VALUES
(1, 'SO/2025/001', '2025-04-05', 'Tech Corp', 'Computers', '10 Units', '2025-06-15', 500000.00, 50000.00, 25000.00, '2025-2026'),
(2, 'SO/2025/002', '2025-04-12', 'Office Supplies Ltd', 'Furniture', '50 Items', '2025-07-01', 300000.00, 30000.00, 15000.00, '2025-2026');

-- Sample Demand Orders (2025-2026)
INSERT INTO demand_orders (serial_no, imms_demand_no, demand_date, nomenclature, quantity, est_cost, financial_year) VALUES
(1, 'IMMS/2025/001', '2025-03-15', 'Desktop Systems', '15 Units', 750000.00, '2025-2026'),
(2, 'IMMS/2025/002', '2025-03-22', 'Office Chairs', '60 Pieces', 180000.00, '2025-2026');

-- Sample Bill Orders (2025-2026)
INSERT INTO bill_orders (serial_no, bill_control_date, firm_name, supply_order_no, build_up, maintenance, financial_year) VALUES
(1, '2025-07-01', 'Tech Corp', 'SO/2025/001', 500000.00, 50000.00, '2025-2026'),
(2, '2025-08-15', 'Office Supplies Ltd', 'SO/2025/002', 300000.00, 30000.00, '2025-2026');

-- ========================================
-- DEFAULT PERMISSIONS
-- ========================================

-- Viewer Permissions
INSERT INTO permissions (role, permission_name, enabled) VALUES
('viewer', 'view_supply_register', TRUE),
('viewer', 'view_demand_register', TRUE),
('viewer', 'view_bill_register', TRUE),
('viewer', 'view_sanction_register', TRUE),
('viewer', 'view_dashboard', TRUE),
('viewer', 'export_excel', TRUE),
('viewer', 'view_analytics', TRUE);

-- Admin Permissions (includes all viewer permissions plus CRUD)
INSERT INTO permissions (role, permission_name, enabled) VALUES
('admin', 'view_supply_register', TRUE),
('admin', 'view_demand_register', TRUE),
('admin', 'view_bill_register', TRUE),
('admin', 'view_sanction_register', TRUE),
('admin', 'view_dashboard', TRUE),
('admin', 'export_excel', TRUE),
('admin', 'view_analytics', TRUE),
('admin', 'add_records', TRUE),
('admin', 'edit_records', TRUE),
('admin', 'delete_records', TRUE),
('admin', 'import_excel', TRUE);

-- ========================================
-- END OF SCHEMA
-- ========================================
