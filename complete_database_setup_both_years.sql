
-- Complete Database Setup Script for Register Management System
-- This script creates all necessary tables and inserts 20 dummy entries for each register (10 for 2024-25 and 10 for 2025-26)

-- Drop existing tables if they exist (for clean rebuild)
DROP TABLE IF EXISTS supply_orders;
DROP TABLE IF EXISTS demand_orders;
DROP TABLE IF EXISTS bill_orders;
DROP TABLE IF EXISTS sanction_gen_project;
DROP TABLE IF EXISTS sanction_misc;
DROP TABLE IF EXISTS sanction_training;

-- Create Supply Orders table
CREATE TABLE supply_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    serial_no INT,
    supply_order_no_date VARCHAR(255),
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Demand Orders table with IMMS Demand No and Supply Order Placed columns
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Bill Orders table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Sanction Gen Project table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Sanction Misc table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create Sanction Training table
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ===========================
-- INSERT DATA FOR 2024-2025
-- ===========================

-- Insert 10 dummy entries for Supply Orders (2024-25)
INSERT INTO supply_orders (serial_no, supply_order_no_date, firm_name, nomenclature, quantity, original_date, revised_date1, build_up, maint, misc, project_less_2cr, project_more_2cr, project_no_pdc, p_np, expenditure_head, rev_cap, imms_demand_no, actual_delivery_date, procurement_mode, delivery_done, remarks, financial_year) VALUES
(1, 'SO/2024/001 - 15/01/2024', 'ABC Industries Ltd', 'Computer Hardware Set', '50 Units', '2024-03-15', '2024-04-15', 250000.00, 50000.00, 25000.00, 0.00, 0.00, 'PDC-2024-001', 'P', 'Office Equipment', 'R', 'IMMS/2024/001', '2024-04-20', 'Direct Purchase', 'Completed', 'All items delivered successfully', '2024-2025'),
(2, 'SO/2024/002 - 20/01/2024', 'XYZ Corporation', 'Network Infrastructure', '1 Lot', '2024-04-01', '2024-05-01', 500000.00, 100000.00, 50000.00, 0.00, 0.00, 'PDC-2024-002', 'P', 'IT Infrastructure', 'C', 'IMMS/2024/002', '2024-05-15', 'Tender', 'In Progress', 'Installation ongoing', '2024-2025'),
(3, 'SO/2024/003 - 25/01/2024', 'Tech Solutions Pvt Ltd', 'Software Licenses', '100 Licenses', '2024-03-01', NULL, 300000.00, 0.00, 15000.00, 300000.00, 0.00, 'PDC-2024-003', 'NP', 'Software', 'R', 'IMMS/2024/003', NULL, 'GeM Portal', 'Pending', 'Awaiting delivery', '2024-2025'),
(4, 'SO/2024/004 - 30/01/2024', 'Engineering Works Ltd', 'Building Materials', '500 Bags', '2024-05-01', '2024-06-01', 150000.00, 30000.00, 10000.00, 0.00, 0.00, 'PDC-2024-004', 'P', 'Construction', 'C', NULL, '2024-06-10', 'Limited Tender', 'Completed', 'Quality approved', '2024-2025'),
(5, 'SO/2024/005 - 05/02/2024', 'Medical Supplies Co', 'Medical Equipment', '20 Units', '2024-04-15', NULL, 800000.00, 40000.00, 20000.00, 0.00, 800000.00, 'PDC-2024-005', 'P', 'Medical', 'R', 'IMMS/2024/006', NULL, 'Direct Purchase', 'In Progress', 'Testing phase', '2024-2025'),
(6, 'SO/2024/006 - 10/02/2024', 'Vehicle Manufacturers', 'Official Vehicles', '5 Units', '2024-06-01', '2024-07-01', 2500000.00, 125000.00, 50000.00, 0.00, 2500000.00, 'PDC-2024-006', 'P', 'Transport', 'C', NULL, NULL, 'Tender', 'Pending', 'Under evaluation', '2024-2025'),
(7, 'SO/2024/007 - 15/02/2024', 'Furniture House', 'Office Furniture', '200 Items', '2024-03-30', '2024-04-30', 400000.00, 20000.00, 15000.00, 400000.00, 0.00, 'PDC-2024-007', 'NP', 'Furniture', 'R', 'IMMS/2024/007', '2024-05-05', 'GeM Portal', 'Completed', 'Installation done', '2024-2025'),
(8, 'SO/2024/008 - 20/02/2024', 'Security Systems Ltd', 'CCTV System', '1 Lot', '2024-05-15', NULL, 350000.00, 35000.00, 25000.00, 0.00, 0.00, 'PDC-2024-008', 'P', 'Security', 'C', NULL, NULL, 'Limited Tender', 'In Progress', 'Installation started', '2024-2025'),
(9, 'SO/2024/009 - 25/02/2024', 'Stationery Suppliers', 'Office Supplies', '1000 Items', '2024-03-20', NULL, 75000.00, 5000.00, 8000.00, 75000.00, 0.00, 'PDC-2024-009', 'NP', 'Stationery', 'R', NULL, '2024-04-01', 'Direct Purchase', 'Completed', 'Regular supply', '2024-2025'),
(10, 'SO/2024/010 - 01/03/2024', 'Power Solutions Inc', 'UPS Systems', '15 Units', '2024-04-20', '2024-05-20', 450000.00, 45000.00, 22500.00, 0.00, 0.00, 'PDC-2024-010', 'P', 'Power Equipment', 'C', NULL, NULL, 'Tender', 'Pending', 'Technical evaluation', '2024-2025');

-- Insert 10 dummy entries for Demand Orders (2024-25)
INSERT INTO demand_orders (serial_no, imms_demand_no, demand_date, mmg_control_no, control_date, nomenclature, quantity, expenditure_head, code_head, rev_cap, procurement_mode, est_cost, imms_control_no, supply_order_placed, remarks, financial_year) VALUES
(1, 'IMMS/2024/001', '2024-01-10', 'MMG/2024/001', '2024-01-15', 'Desktop Computers', '25 Units', 'Office Equipment', 'OE001', 'R', 'Direct Purchase', 375000.00, 'IMMS/2024/001', 'Yes', 'Urgent requirement for new office', '2024-2025'),
(2, 'IMMS/2024/002', '2024-01-15', 'MMG/2024/002', '2024-01-20', 'Air Conditioning Units', '10 Units', 'Infrastructure', 'INF001', 'C', 'Tender', 500000.00, 'IMMS/2024/002', 'Yes', 'Summer preparation', '2024-2025'),
(3, 'IMMS/2024/003', '2024-01-20', 'MMG/2024/003', '2024-01-25', 'Printing Papers', '500 Reams', 'Stationery', 'ST001', 'R', 'GeM Portal', 25000.00, 'IMMS/2024/003', 'Yes', 'Regular consumption', '2024-2025'),
(4, 'IMMS/2024/004', '2024-01-25', 'MMG/2024/004', '2024-02-01', 'Vehicle Maintenance', '1 Lot', 'Transport', 'TR001', 'R', 'Annual Contract', 150000.00, 'IMMS/2024/004', 'No', 'Annual maintenance contract', '2024-2025'),
(5, 'IMMS/2024/005', '2024-02-01', 'MMG/2024/005', '2024-02-05', 'Security Services', '12 Months', 'Security', 'SEC001', 'R', 'Tender', 600000.00, 'IMMS/2024/005', 'No', 'Round the clock security', '2024-2025'),
(6, 'IMMS/2024/006', '2024-02-05', 'MMG/2024/006', '2024-02-10', 'Medical Equipment', '5 Units', 'Medical', 'MED001', 'C', 'Limited Tender', 750000.00, 'IMMS/2024/006', 'Yes', 'Hospital upgrade', '2024-2025'),
(7, 'IMMS/2024/007', '2024-02-10', 'MMG/2024/007', '2024-02-15', 'Training Materials', '100 Sets', 'Training', 'TR002', 'R', 'Direct Purchase', 50000.00, 'IMMS/2024/007', 'Yes', 'Staff development program', '2024-2025'),
(8, 'IMMS/2024/008', '2024-02-15', 'MMG/2024/008', '2024-02-20', 'Laboratory Equipment', '20 Items', 'Scientific', 'SCI001', 'C', 'Tender', 1200000.00, 'IMMS/2024/008', 'No', 'Research facility setup', '2024-2025'),
(9, 'IMMS/2024/009', '2024-02-20', 'MMG/2024/009', '2024-02-25', 'Cleaning Supplies', '12 Months', 'Maintenance', 'MNT001', 'R', 'Annual Contract', 80000.00, 'IMMS/2024/009', 'No', 'Facility maintenance', '2024-2025'),
(10, 'IMMS/2024/010', '2024-02-25', 'MMG/2024/010', '2024-03-01', 'Communication Equipment', '15 Units', 'Communication', 'COM001', 'C', 'GeM Portal', 300000.00, 'IMMS/2024/010', 'No', 'Network enhancement', '2024-2025');

-- Insert 10 dummy entries for Bill Orders (2024-25)
INSERT INTO bill_orders (serial_no, bill_control_date, firm_name, supply_order_no, so_date, project_no, build_up, maintenance, project_less_2cr, project_more_2cr, procurement_mode, rev_cap, date_amount_passed, ld_amount, remarks, financial_year) VALUES
(1, '2024-03-01', 'ABC Industries Ltd', 'SO/2024/001', '2024-01-15', 'PROJ-2024-001', 250000.00, 50000.00, 0.00, 0.00, 'Direct Purchase', 'R', '01/03/2024 - 300000', 0.00, 'Payment processed successfully', '2024-2025'),
(2, '2024-03-05', 'XYZ Corporation', 'SO/2024/002', '2024-01-20', 'PROJ-2024-002', 500000.00, 100000.00, 0.00, 0.00, 'Tender', 'C', '05/03/2024 - 600000', 15000.00, 'Late delivery penalty applied', '2024-2025'),
(3, '2024-03-10', 'Tech Solutions Pvt Ltd', 'SO/2024/003', '2024-01-25', 'PROJ-2024-003', 300000.00, 0.00, 300000.00, 0.00, 'GeM Portal', 'R', '10/03/2024 - 315000', 0.00, 'Software licenses activated', '2024-2025'),
(4, '2024-03-15', 'Engineering Works Ltd', 'SO/2024/004', '2024-01-30', 'PROJ-2024-004', 150000.00, 30000.00, 0.00, 0.00, 'Limited Tender', 'C', '15/03/2024 - 190000', 0.00, 'Quality certificate submitted', '2024-2025'),
(5, '2024-03-20', 'Medical Supplies Co', 'SO/2024/005', '2024-02-05', 'PROJ-2024-005', 800000.00, 40000.00, 0.00, 800000.00, 'Direct Purchase', 'R', '20/03/2024 - 860000', 0.00, 'Equipment installed and tested', '2024-2025'),
(6, '2024-03-25', 'Vehicle Manufacturers', 'SO/2024/006', '2024-02-10', 'PROJ-2024-006', 2500000.00, 125000.00, 0.00, 2500000.00, 'Tender', 'C', 'Pending', 0.00, 'Vehicle inspection pending', '2024-2025'),
(7, '2024-03-30', 'Furniture House', 'SO/2024/007', '2024-02-15', 'PROJ-2024-007', 400000.00, 20000.00, 400000.00, 0.00, 'GeM Portal', 'R', '30/03/2024 - 435000', 0.00, 'Furniture installed', '2024-2025'),
(8, '2024-04-01', 'Security Systems Ltd', 'SO/2024/008', '2024-02-20', 'PROJ-2024-008', 350000.00, 35000.00, 0.00, 0.00, 'Limited Tender', 'C', '01/04/2024 - 410000', 0.00, 'System operational', '2024-2025'),
(9, '2024-04-05', 'Stationery Suppliers', 'SO/2024/009', '2024-02-25', 'PROJ-2024-009', 75000.00, 5000.00, 75000.00, 0.00, 'Direct Purchase', 'R', '05/04/2024 - 88000', 0.00, 'Monthly supply established', '2024-2025'),
(10, '2024-04-10', 'Power Solutions Inc', 'SO/2024/010', '2024-03-01', 'PROJ-2024-010', 450000.00, 45000.00, 0.00, 0.00, 'Tender', 'C', 'Pending', 0.00, 'Installation in progress', '2024-2025');

-- Insert 10 dummy entries for Sanction Gen Project (2024-25)
INSERT INTO sanction_gen_project (serial_no, date, file_no, sanction_code, code, np_proj, power, code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) VALUES
(1, '2024-01-05', 'FILE/GP/2024/001', 'SGP/2024/001', 'GP001', 'Project Alpha', 'DG Level', 'Infrastructure Development', 'C', 5000000.00, 'UO/2024/001', '2024-01-10', 'Initial sanction', '2024-2025'),
(2, '2024-01-10', 'FILE/GP/2024/002', 'SGP/2024/002', 'GP002', 'Building Construction', 'Secretary Level', 'Civil Works', 'C', 15000000.00, 'UO/2024/002', '2024-01-15', 'Phase 1 approval', '2024-2025'),
(3, '2024-01-15', 'FILE/GP/2024/003', 'SGP/2024/003', 'GP003', 'IT Modernization', 'Joint Secretary', 'Technology Upgrade', 'R', 2500000.00, 'UO/2024/003', '2024-01-20', 'Software procurement', '2024-2025'),
(4, '2024-01-20', 'FILE/GP/2024/004', 'SGP/2024/004', 'GP004', 'Road Development', 'DG Level', 'Transportation', 'C', 8000000.00, 'UO/2024/004', '2024-01-25', 'Highway expansion', '2024-2025'),
(5, '2024-01-25', 'FILE/GP/2024/005', 'SGP/2024/005', 'GP005', 'Water Supply', 'Secretary Level', 'Public Utilities', 'C', 12000000.00, 'UO/2024/005', '2024-02-01', 'Rural water project', '2024-2025'),
(6, '2024-02-01', 'FILE/GP/2024/006', 'SGP/2024/006', 'GP006', 'Hospital Equipment', 'Joint Secretary', 'Healthcare', 'R', 3500000.00, 'UO/2024/006', '2024-02-05', 'Medical facility upgrade', '2024-2025'),
(7, '2024-02-05', 'FILE/GP/2024/007', 'SGP/2024/007', 'GP007', 'School Infrastructure', 'DG Level', 'Education', 'C', 6000000.00, 'UO/2024/007', '2024-02-10', 'Educational development', '2024-2025'),
(8, '2024-02-10', 'FILE/GP/2024/008', 'SGP/2024/008', 'GP008', 'Power Grid', 'Secretary Level', 'Energy', 'C', 20000000.00, 'UO/2024/008', '2024-02-15', 'Electrical infrastructure', '2024-2025'),
(9, '2024-02-15', 'FILE/GP/2024/009', 'SGP/2024/009', 'GP009', 'Communication Network', 'Joint Secretary', 'Telecom', 'R', 4000000.00, 'UO/2024/009', '2024-02-20', 'Digital connectivity', '2024-2025'),
(10, '2024-02-20', 'FILE/GP/2024/010', 'SGP/2024/010', 'GP010', 'Environmental Project', 'DG Level', 'Environment', 'C', 7500000.00, 'UO/2024/010', '2024-02-25', 'Green initiative', '2024-2025');

-- Insert 10 dummy entries for Sanction Misc (2024-25)
INSERT INTO sanction_misc (serial_no, date, file_no, sanction_code, code, np_proj, power, code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) VALUES
(1, '2024-01-08', 'FILE/MISC/2024/001', 'SM/2024/001', 'M001', 'Office Renovation', 'Director Level', 'Maintenance', 'R', 500000.00, 'UO/MISC/001', '2024-01-12', 'Annual maintenance', '2024-2025'),
(2, '2024-01-12', 'FILE/MISC/2024/002', 'SM/2024/002', 'M002', 'Vehicle Purchase', 'Joint Director', 'Transport', 'C', 1200000.00, 'UO/MISC/002', '2024-01-18', 'Fleet expansion', '2024-2025'),
(3, '2024-01-18', 'FILE/MISC/2024/003', 'SM/2024/003', 'M003', 'Conference Expenses', 'Assistant Director', 'Events', 'R', 150000.00, 'UO/MISC/003', '2024-01-22', 'Annual conference', '2024-2025'),
(4, '2024-01-22', 'FILE/MISC/2024/004', 'SM/2024/004', 'M004', 'Security Equipment', 'Director Level', 'Security', 'C', 800000.00, 'UO/MISC/004', '2024-01-28', 'Safety upgrade', '2024-2025'),
(5, '2024-01-28', 'FILE/MISC/2024/005', 'SM/2024/005', 'M005', 'Guest House Maintenance', 'Joint Director', 'Hospitality', 'R', 300000.00, 'UO/MISC/005', '2024-02-02', 'Facility upgrade', '2024-2025'),
(6, '2024-02-02', 'FILE/MISC/2024/006', 'SM/2024/006', 'M006', 'Computer Upgrades', 'Assistant Director', 'IT Equipment', 'C', 600000.00, 'UO/MISC/006', '2024-02-08', 'Technology refresh', '2024-2025'),
(7, '2024-02-08', 'FILE/MISC/2024/007', 'SM/2024/007', 'M007', 'Advertising Campaign', 'Director Level', 'Publicity', 'R', 250000.00, 'UO/MISC/007', '2024-02-12', 'Public awareness', '2024-2025'),
(8, '2024-02-12', 'FILE/MISC/2024/008', 'SM/2024/008', 'M008', 'Legal Services', 'Joint Director', 'Legal', 'R', 400000.00, 'UO/MISC/008', '2024-02-18', 'Consultancy fees', '2024-2025'),
(9, '2024-02-18', 'FILE/MISC/2024/009', 'SM/2024/009', 'M009', 'Research Study', 'Assistant Director', 'Research', 'C', 750000.00, 'UO/MISC/009', '2024-02-22', 'Market research', '2024-2025'),
(10, '2024-02-22', 'FILE/MISC/2024/010', 'SM/2024/010', 'M010', 'Welfare Activities', 'Director Level', 'Welfare', 'R', 350000.00, 'UO/MISC/010', '2024-02-28', 'Staff welfare', '2024-2025');

-- Insert 10 dummy entries for Sanction Training (2024-25)
INSERT INTO sanction_training (serial_no, date, file_no, sanction_code, code, np_proj, power, code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) VALUES
(1, '2024-01-03', 'FILE/TRG/2024/001', 'ST/2024/001', 'T001', 'Leadership Training', 'Training Director', 'Skill Development', 'R', 200000.00, 'UO/TRG/001', '2024-01-08', 'Management skills', '2024-2025'),
(2, '2024-01-08', 'FILE/TRG/2024/002', 'ST/2024/002', 'T002', 'Technical Training', 'Joint Training Director', 'Technical Skills', 'R', 350000.00, 'UO/TRG/002', '2024-01-14', 'Software training', '2024-2025'),
(3, '2024-01-14', 'FILE/TRG/2024/003', 'ST/2024/003', 'T003', 'Safety Training', 'Assistant Training Director', 'Safety', 'R', 150000.00, 'UO/TRG/003', '2024-01-18', 'Workplace safety', '2024-2025'),
(4, '2024-01-18', 'FILE/TRG/2024/004', 'ST/2024/004', 'T004', 'Foreign Training', 'Training Director', 'International', 'C', 1500000.00, 'UO/TRG/004', '2024-01-25', 'Overseas program', '2024-2025'),
(5, '2024-01-25', 'FILE/TRG/2024/005', 'ST/2024/005', 'T005', 'Communication Skills', 'Joint Training Director', 'Soft Skills', 'R', 120000.00, 'UO/TRG/005', '2024-02-01', 'Presentation skills', '2024-2025'),
(6, '2024-02-01', 'FILE/TRG/2024/006', 'ST/2024/006', 'T006', 'Project Management', 'Assistant Training Director', 'Management', 'R', 300000.00, 'UO/TRG/006', '2024-02-05', 'PMP certification', '2024-2025'),
(7, '2024-02-05', 'FILE/TRG/2024/007', 'ST/2024/007', 'T007', 'Digital Literacy', 'Training Director', 'Technology', 'R', 180000.00, 'UO/TRG/007', '2024-02-12', 'Computer skills', '2024-2025'),
(8, '2024-02-12', 'FILE/TRG/2024/008', 'ST/2024/008', 'T008', 'Financial Management', 'Joint Training Director', 'Finance', 'R', 250000.00, 'UO/TRG/008', '2024-02-18', 'Budget management', '2024-2025'),
(9, '2024-02-18', 'FILE/TRG/2024/009', 'ST/2024/009', 'T009', 'Quality Assurance', 'Assistant Training Director', 'Quality', 'R', 200000.00, 'UO/TRG/009', '2024-02-22', 'ISO standards', '2024-2025'),
(10, '2024-02-22', 'FILE/TRG/2024/010', 'ST/2024/010', 'T010', 'Research Methodology', 'Training Director', 'Research', 'C', 400000.00, 'UO/TRG/010', '2024-02-28', 'Academic research', '2024-2025');

-- ===========================
-- INSERT DATA FOR 2025-2026
-- ===========================

-- Insert 10 dummy entries for Supply Orders (2025-26)
INSERT INTO supply_orders (serial_no, supply_order_no_date, firm_name, nomenclature, quantity, original_date, revised_date1, build_up, maint, misc, project_less_2cr, project_more_2cr, project_no_pdc, p_np, expenditure_head, rev_cap, imms_demand_no, actual_delivery_date, procurement_mode, delivery_done, remarks, financial_year) VALUES
(1, 'SO/2025/001 - 05/04/2025', 'NextGen Technologies Ltd', 'AI Computing Systems', '25 Units', '2025-06-15', '2025-07-15', 750000.00, 75000.00, 37500.00, 0.00, 750000.00, 'PDC-2025-001', 'P', 'IT Infrastructure', 'C', 'IMMS/2025/001', '2025-07-20', 'Tender', 'In Progress', 'Advanced AI workstation deployment', '2025-2026'),
(2, 'SO/2025/002 - 12/04/2025', 'Green Energy Solutions', 'Solar Panel Installation', '100 Units', '2025-07-01', '2025-08-01', 1200000.00, 120000.00, 60000.00, 0.00, 1200000.00, 'PDC-2025-002', 'P', 'Renewable Energy', 'C', 'IMMS/2025/002', NULL, 'Limited Tender', 'Pending', 'Campus solar energy project', '2025-2026'),
(3, 'SO/2025/003 - 18/04/2025', 'Smart Office Corp', 'IoT Office Equipment', '200 Devices', '2025-06-01', NULL, 450000.00, 22500.00, 18000.00, 450000.00, 0.00, 'PDC-2025-003', 'NP', 'Smart Infrastructure', 'R', 'IMMS/2025/003', '2025-06-25', 'GeM Portal', 'Completed', 'Smart office automation complete', '2025-2026'),
(4, 'SO/2025/004 - 25/04/2025', 'Advanced Materials Inc', 'Laboratory Equipment', '15 Sets', '2025-08-15', '2025-09-15', 950000.00, 47500.00, 35000.00, 0.00, 0.00, 'PDC-2025-004', 'P', 'Research Equipment', 'C', 'IMMS/2025/004', NULL, 'Open Tender', 'In Progress', 'Research lab modernization', '2025-2026'),
(5, 'SO/2025/005 - 02/05/2025', 'Digital Security Systems', 'Cybersecurity Infrastructure', '1 Lot', '2025-07-20', NULL, 850000.00, 85000.00, 42500.00, 0.00, 850000.00, 'PDC-2025-005', 'P', 'IT Security', 'R', 'IMMS/2025/005', NULL, 'Limited Tender', 'Pending', 'Campus-wide security upgrade', '2025-2026'),
(6, 'SO/2025/006 - 08/05/2025', 'Electric Vehicle Solutions', 'EV Charging Stations', '20 Units', '2025-09-01', '2025-10-01', 1500000.00, 75000.00, 45000.00, 0.00, 1500000.00, 'PDC-2025-006', 'P', 'Transport Infrastructure', 'C', 'IMMS/2025/006', NULL, 'Tender', 'Pending', 'EV infrastructure development', '2025-2026'),
(7, 'SO/2025/007 - 15/05/2025', 'Ergonomic Furniture Co', 'Modern Office Furniture', '300 Items', '2025-06-30', NULL, 600000.00, 30000.00, 24000.00, 600000.00, 0.00, 'PDC-2025-007', 'NP', 'Office Furniture', 'R', 'IMMS/2025/007', '2025-07-10', 'GeM Portal', 'Completed', 'Ergonomic workspace setup', '2025-2026'),
(8, 'SO/2025/008 - 22/05/2025', 'Climate Control Systems', 'Smart HVAC System', '1 Lot', '2025-08-01', NULL, 1100000.00, 110000.00, 55000.00, 0.00, 0.00, 'PDC-2025-008', 'P', 'Building Systems', 'C', 'IMMS/2025/008', NULL, 'Limited Tender', 'In Progress', 'Energy-efficient climate control', '2025-2026'),
(9, 'SO/2025/009 - 28/05/2025', 'Digital Learning Solutions', 'E-Learning Platform', '500 Licenses', '2025-06-15', NULL, 300000.00, 15000.00, 12000.00, 300000.00, 0.00, 'PDC-2025-009', 'NP', 'Educational Technology', 'R', 'IMMS/2025/009', '2025-07-01', 'Direct Purchase', 'Completed', 'Online training platform', '2025-2026'),
(10, 'SO/2025/010 - 05/06/2025', 'Renewable Tech Industries', 'Wind Power System', '5 Units', '2025-10-15', '2025-11-15', 2000000.00, 100000.00, 80000.00, 0.00, 2000000.00, 'PDC-2025-010', 'P', 'Alternative Energy', 'C', 'IMMS/2025/010', NULL, 'Open Tender', 'Pending', 'Wind energy generation project', '2025-2026');

-- Insert 10 dummy entries for Demand Orders (2025-26)
INSERT INTO demand_orders (serial_no, imms_demand_no, demand_date, mmg_control_no, control_date, nomenclature, quantity, expenditure_head, code_head, rev_cap, procurement_mode, est_cost, imms_control_no, supply_order_placed, remarks, financial_year) VALUES
(1, 'IMMS/2025/001', '2025-03-15', 'MMG/2025/001', '2025-03-20', 'High-Performance Workstations', '30 Units', 'IT Infrastructure', 'IT001', 'C', 'Tender', 900000.00, 'IMMS/2025/001', 'Yes', 'AI research workstation requirement', '2025-2026'),
(2, 'IMMS/2025/002', '2025-03-22', 'MMG/2025/002', '2025-03-28', 'Solar Energy Equipment', '120 Panels', 'Renewable Energy', 'RE001', 'C', 'Limited Tender', 1400000.00, 'IMMS/2025/002', 'Yes', 'Green energy initiative phase-1', '2025-2026'),
(3, 'IMMS/2025/003', '2025-03-28', 'MMG/2025/003', '2025-04-02', 'Smart Office Devices', '250 Items', 'Smart Infrastructure', 'SI001', 'R', 'GeM Portal', 500000.00, 'IMMS/2025/003', 'Yes', 'IoT-enabled office automation', '2025-2026'),
(4, 'IMMS/2025/004', '2025-04-05', 'MMG/2025/004', '2025-04-10', 'Advanced Lab Instruments', '18 Sets', 'Research Equipment', 'RE002', 'C', 'Open Tender', 1050000.00, 'IMMS/2025/004', 'Yes', 'Research facility enhancement', '2025-2026'),
(5, 'IMMS/2025/005', '2025-04-12', 'MMG/2025/005', '2025-04-18', 'Security Infrastructure', '1 Complete System', 'IT Security', 'SEC001', 'R', 'Limited Tender', 980000.00, 'IMMS/2025/005', 'Yes', 'Comprehensive security solution', '2025-2026'),
(6, 'IMMS/2025/006', '2025-04-18', 'MMG/2025/006', '2025-04-25', 'Electric Vehicle Chargers', '25 Stations', 'Transport Infrastructure', 'TR001', 'C', 'Tender', 1650000.00, 'IMMS/2025/006', 'Yes', 'Sustainable transport infrastructure', '2025-2026'),
(7, 'IMMS/2025/007', '2025-04-25', 'MMG/2025/007', '2025-05-01', 'Ergonomic Office Setup', '350 Pieces', 'Office Furniture', 'OF001', 'R', 'GeM Portal', 680000.00, 'IMMS/2025/007', 'Yes', 'Employee wellness initiative', '2025-2026'),
(8, 'IMMS/2025/008', '2025-05-02', 'MMG/2025/008', '2025-05-08', 'HVAC Modernization', '1 Complete System', 'Building Systems', 'BS001', 'C', 'Limited Tender', 1300000.00, 'IMMS/2025/008', 'Yes', 'Energy-efficient climate control', '2025-2026'),
(9, 'IMMS/2025/009', '2025-05-08', 'MMG/2025/009', '2025-05-15', 'Digital Training Platform', '600 User Licenses', 'Educational Technology', 'ET001', 'R', 'Direct Purchase', 350000.00, 'IMMS/2025/009', 'Yes', 'Staff development digitization', '2025-2026'),
(10, 'IMMS/2025/010', '2025-05-15', 'MMG/2025/010', '2025-05-22', 'Wind Energy System', '8 Turbines', 'Alternative Energy', 'AE001', 'C', 'Open Tender', 2200000.00, 'IMMS/2025/010', 'Yes', 'Renewable energy expansion', '2025-2026');

-- Insert 10 dummy entries for Bill Orders (2025-26)
INSERT INTO bill_orders (serial_no, bill_control_date, firm_name, supply_order_no, so_date, project_no, build_up, maintenance, project_less_2cr, project_more_2cr, procurement_mode, rev_cap, date_amount_passed, ld_amount, remarks, financial_year) VALUES
(1, '2025-07-01', 'NextGen Technologies Ltd', 'SO/2025/001', '2025-04-05', 'PROJ-2025-001', 750000.00, 75000.00, 0.00, 750000.00, 'Tender', 'C', '01/07/2025 - 862500', 0.00, 'AI workstation payment processed', '2025-2026'),
(2, '2025-07-08', 'Green Energy Solutions', 'SO/2025/002', '2025-04-12', 'PROJ-2025-002', 1200000.00, 120000.00, 0.00, 1200000.00, 'Limited Tender', 'C', 'Pending', 0.00, 'Solar installation in progress', '2025-2026'),
(3, '2025-07-15', 'Smart Office Corp', 'SO/2025/003', '2025-04-18', 'PROJ-2025-003', 450000.00, 22500.00, 450000.00, 0.00, 'GeM Portal', 'R', '15/07/2025 - 490500', 0.00, 'Smart office setup completed', '2025-2026'),
(4, '2025-07-22', 'Advanced Materials Inc', 'SO/2025/004', '2025-04-25', 'PROJ-2025-004', 950000.00, 47500.00, 0.00, 0.00, 'Open Tender', 'C', 'Pending', 0.00, 'Lab equipment under installation', '2025-2026'),
(5, '2025-07-28', 'Digital Security Systems', 'SO/2025/005', '2025-05-02', 'PROJ-2025-005', 850000.00, 85000.00, 0.00, 850000.00, 'Limited Tender', 'R', 'Pending', 0.00, 'Security system configuration ongoing', '2025-2026'),
(6, '2025-08-05', 'Electric Vehicle Solutions', 'SO/2025/006', '2025-05-08', 'PROJ-2025-006', 1500000.00, 75000.00, 0.00, 1500000.00, 'Tender', 'C', 'Pending', 0.00, 'EV charging stations under construction', '2025-2026'),
(7, '2025-08-12', 'Ergonomic Furniture Co', 'SO/2025/007', '2025-05-15', 'PROJ-2025-007', 600000.00, 30000.00, 600000.00, 0.00, 'GeM Portal', 'R', '12/08/2025 - 654000', 0.00, 'Ergonomic furniture installed', '2025-2026'),
(8, '2025-08-18', 'Climate Control Systems', 'SO/2025/008', '2025-05-22', 'PROJ-2025-008', 1100000.00, 110000.00, 0.00, 0.00, 'Limited Tender', 'C', 'Pending', 0.00, 'HVAC system installation ongoing', '2025-2026'),
(9, '2025-08-25', 'Digital Learning Solutions', 'SO/2025/009', '2025-05-28', 'PROJ-2025-009', 300000.00, 15000.00, 300000.00, 0.00, 'Direct Purchase', 'R', '25/08/2025 - 327000', 0.00, 'E-learning platform deployed', '2025-2026'),
(10, '2025-09-01', 'Renewable Tech Industries', 'SO/2025/010', '2025-06-05', 'PROJ-2025-010', 2000000.00, 100000.00, 0.00, 2000000.00, 'Open Tender', 'C', 'Pending', 0.00, 'Wind power system planning phase', '2025-2026');

-- Insert 10 dummy entries for Sanction Gen Project (2025-26)
INSERT INTO sanction_gen_project (serial_no, date, file_no, sanction_code, code, np_proj, power, code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) VALUES
(1, '2025-03-10', 'FILE/GP/2025/001', 'SGP/2025/001', 'GP001', 'Digital Transformation Initiative', 'Secretary Level', 'Technology Modernization', 'C', 8000000.00, 'UO/2025/001', '2025-03-15', 'Digital infrastructure upgrade', '2025-2026'),
(2, '2025-03-18', 'FILE/GP/2025/002', 'SGP/2025/002', 'GP002', 'Smart Campus Development', 'DG Level', 'Smart Infrastructure', 'C', 25000000.00, 'UO/2025/002', '2025-03-25', 'Comprehensive smart campus project', '2025-2026'),
(3, '2025-03-25', 'FILE/GP/2025/003', 'SGP/2025/003', 'GP003', 'Green Energy Transition', 'Joint Secretary', 'Renewable Energy', 'R', 15000000.00, 'UO/2025/003', '2025-04-01', 'Sustainable energy implementation', '2025-2026'),
(4, '2025-04-02', 'FILE/GP/2025/004', 'SGP/2025/004', 'GP004', 'Advanced Research Facility', 'Secretary Level', 'Research Development', 'C', 12000000.00, 'UO/2025/004', '2025-04-08', 'Multi-disciplinary research center', '2025-2026'),
(5, '2025-04-10', 'FILE/GP/2025/005', 'SGP/2025/005', 'GP005', 'Cybersecurity Enhancement', 'DG Level', 'IT Security', 'R', 6000000.00, 'UO/2025/005', '2025-04-15', 'Comprehensive security framework', '2025-2026'),
(6, '2025-04-18', 'FILE/GP/2025/006', 'SGP/2025/006', 'GP006', 'Sustainable Transport Hub', 'Joint Secretary', 'Transport Infrastructure', 'C', 18000000.00, 'UO/2025/006', '2025-04-25', 'Electric vehicle infrastructure', '2025-2026'),
(7, '2025-04-25', 'FILE/GP/2025/007', 'SGP/2025/007', 'GP007', 'Innovation Incubator', 'Secretary Level', 'Innovation Development', 'C', 10000000.00, 'UO/2025/007', '2025-05-02', 'Startup ecosystem development', '2025-2026'),
(8, '2025-05-02', 'FILE/GP/2025/008', 'SGP/2025/008', 'GP008', 'Climate Resilience Project', 'DG Level', 'Environmental Systems', 'C', 22000000.00, 'UO/2025/008', '2025-05-08', 'Climate adaptation infrastructure', '2025-2026'),
(9, '2025-05-10', 'FILE/GP/2025/009', 'SGP/2025/009', 'GP009', 'Digital Learning Ecosystem', 'Joint Secretary', 'Educational Technology', 'R', 7500000.00, 'UO/2025/009', '2025-05-15', 'Comprehensive e-learning platform', '2025-2026'),
(10, '2025-05-18', 'FILE/GP/2025/010', 'SGP/2025/010', 'GP010', 'Renewable Energy Grid', 'Secretary Level', 'Power Systems', 'C', 30000000.00, 'UO/2025/010', '2025-05-25', 'Integrated renewable energy network', '2025-2026');

-- Insert 10 dummy entries for Sanction Misc (2025-26)
INSERT INTO sanction_misc (serial_no, date, file_no, sanction_code, code, np_proj, power, code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) VALUES
(1, '2025-03-12', 'FILE/MISC/2025/001', 'SM/2025/001', 'M001', 'Office Space Modernization', 'Director Level', 'Infrastructure Maintenance', 'R', 800000.00, 'UO/MISC/001', '2025-03-18', 'Workspace ergonomic upgrade', '2025-2026'),
(2, '2025-03-20', 'FILE/MISC/2025/002', 'SM/2025/002', 'M002', 'Fleet Electrification', 'Joint Director', 'Transport Management', 'C', 2500000.00, 'UO/MISC/002', '2025-03-28', 'Electric vehicle procurement', '2025-2026'),
(3, '2025-03-28', 'FILE/MISC/2025/003', 'SM/2025/003', 'M003', 'Annual Tech Conference', 'Assistant Director', 'Event Management', 'R', 400000.00, 'UO/MISC/003', '2025-04-05', 'Technology innovation summit', '2025-2026'),
(4, '2025-04-05', 'FILE/MISC/2025/004', 'SM/2025/004', 'M004', 'Advanced Security Systems', 'Director Level', 'Physical Security', 'C', 1200000.00, 'UO/MISC/004', '2025-04-12', 'Biometric access control upgrade', '2025-2026'),
(5, '2025-04-12', 'FILE/MISC/2025/005', 'SM/2025/005', 'M005', 'Guest Facility Enhancement', 'Joint Director', 'Hospitality Services', 'R', 600000.00, 'UO/MISC/005', '2025-04-20', 'Smart guest accommodation system', '2025-2026'),
(6, '2025-04-20', 'FILE/MISC/2025/006', 'SM/2025/006', 'M006', 'IT Infrastructure Refresh', 'Assistant Director', 'Technology Upgrade', 'C', 1500000.00, 'UO/MISC/006', '2025-04-28', 'Network and server modernization', '2025-2026'),
(7, '2025-04-28', 'FILE/MISC/2025/007', 'SM/2025/007', 'M007', 'Digital Marketing Initiative', 'Director Level', 'Public Relations', 'R', 350000.00, 'UO/MISC/007', '2025-05-05', 'Online presence enhancement', '2025-2026'),
(8, '2025-05-05', 'FILE/MISC/2025/008', 'SM/2025/008', 'M008', 'Legal Compliance Services', 'Joint Director', 'Legal Affairs', 'R', 750000.00, 'UO/MISC/008', '2025-05-12', 'Regulatory compliance consultation', '2025-2026'),
(9, '2025-05-12', 'FILE/MISC/2025/009', 'SM/2025/009', 'M009', 'Innovation Research Study', 'Assistant Director', 'Research & Development', 'C', 900000.00, 'UO/MISC/009', '2025-05-20', 'Technology trend analysis project', '2025-2026'),
(10, '2025-05-20', 'FILE/MISC/2025/010', 'SM/2025/010', 'M010', 'Employee Wellness Program', 'Director Level', 'Human Resources', 'R', 450000.00, 'UO/MISC/010', '2025-05-28', 'Comprehensive health and wellness initiative', '2025-2026');

-- Insert 10 dummy entries for Sanction Training (2025-26)
INSERT INTO sanction_training (serial_no, date, file_no, sanction_code, code, np_proj, power, code_head, rev_cap, amount, uo_no, uo_date, amendment, financial_year) VALUES
(1, '2025-03-08', 'FILE/TRG/2025/001', 'ST/2025/001', 'T001', 'AI & Machine Learning Training', 'Training Director', 'Advanced Technology Skills', 'R', 450000.00, 'UO/TRG/001', '2025-03-15', 'Next-gen technology upskilling', '2025-2026'),
(2, '2025-03-15', 'FILE/TRG/2025/002', 'ST/2025/002', 'T002', 'Cybersecurity Certification', 'Joint Training Director', 'Information Security', 'R', 650000.00, 'UO/TRG/002', '2025-03-22', 'Advanced security training program', '2025-2026'),
(3, '2025-03-22', 'FILE/TRG/2025/003', 'ST/2025/003', 'T003', 'Green Technology Workshop', 'Assistant Training Director', 'Sustainability Skills', 'R', 300000.00, 'UO/TRG/003', '2025-03-28', 'Renewable energy technology training', '2025-2026'),
(4, '2025-03-28', 'FILE/TRG/2025/004', 'ST/2025/004', 'T004', 'International Innovation Program', 'Training Director', 'Global Collaboration', 'C', 2200000.00, 'UO/TRG/004', '2025-04-05', 'International technology exchange', '2025-2026'),
(5, '2025-04-05', 'FILE/TRG/2025/005', 'ST/2025/005', 'T005', 'Digital Communication Skills', 'Joint Training Director', 'Communication Technology', 'R', 280000.00, 'UO/TRG/005', '2025-04-12', 'Virtual collaboration mastery', '2025-2026'),
(6, '2025-04-12', 'FILE/TRG/2025/006', 'ST/2025/006', 'T006', 'Agile Project Management', 'Assistant Training Director', 'Project Management', 'R', 550000.00, 'UO/TRG/006', '2025-04-20', 'Modern project management methodologies', '2025-2026'),
(7, '2025-04-20', 'FILE/TRG/2025/007', 'ST/2025/007', 'T007', 'Data Science & Analytics', 'Training Director', 'Data Technology', 'R', 420000.00, 'UO/TRG/007', '2025-04-28', 'Advanced data analysis capabilities', '2025-2026'),
(8, '2025-04-28', 'FILE/TRG/2025/008', 'ST/2025/008', 'T008', 'Sustainable Finance Training', 'Joint Training Director', 'Green Finance', 'R', 380000.00, 'UO/TRG/008', '2025-05-05', 'ESG and sustainable investment training', '2025-2026'),
(9, '2025-05-05', 'FILE/TRG/2025/009', 'ST/2025/009', 'T009', 'Quality Management Systems', 'Assistant Training Director', 'Quality Assurance', 'R', 320000.00, 'UO/TRG/009', '2025-05-12', 'ISO certification training program', '2025-2026'),
(10, '2025-05-12', 'FILE/TRG/2025/010', 'ST/2025/010', 'T010', 'Innovation & Entrepreneurship', 'Training Director', 'Innovation Development', 'C', 750000.00, 'UO/TRG/010', '2025-05-20', 'Startup and innovation ecosystem training', '2025-2026');

-- Create indexes for better performance
CREATE INDEX idx_supply_orders_financial_year ON supply_orders(financial_year);
CREATE INDEX idx_supply_orders_serial_no ON supply_orders(serial_no);
CREATE INDEX idx_supply_orders_imms_demand_no ON supply_orders(imms_demand_no);
CREATE INDEX idx_demand_orders_financial_year ON demand_orders(financial_year);
CREATE INDEX idx_demand_orders_serial_no ON demand_orders(serial_no);
CREATE INDEX idx_demand_orders_imms_demand_no ON demand_orders(imms_demand_no);
CREATE INDEX idx_bill_orders_financial_year ON bill_orders(financial_year);
CREATE INDEX idx_bill_orders_serial_no ON bill_orders(serial_no);
CREATE INDEX idx_sanction_gen_project_financial_year ON sanction_gen_project(financial_year);
CREATE INDEX idx_sanction_gen_project_serial_no ON sanction_gen_project(serial_no);
CREATE INDEX idx_sanction_misc_financial_year ON sanction_misc(financial_year);
CREATE INDEX idx_sanction_misc_serial_no ON sanction_misc(serial_no);
CREATE INDEX idx_sanction_training_financial_year ON sanction_training(financial_year);
CREATE INDEX idx_sanction_training_serial_no ON sanction_training(serial_no);

-- Add constraints for data integrity
ALTER TABLE supply_orders ADD CONSTRAINT chk_supply_rev_cap CHECK (rev_cap IN ('R', 'C', NULL));
ALTER TABLE supply_orders ADD CONSTRAINT chk_supply_p_np CHECK (p_np IN ('P', 'NP', NULL));
ALTER TABLE supply_orders ADD CONSTRAINT chk_supply_delivery_done CHECK (delivery_done IN ('Completed', 'In Progress', 'Pending', NULL));

ALTER TABLE demand_orders ADD CONSTRAINT chk_demand_rev_cap CHECK (rev_cap IN ('R', 'C', NULL));
ALTER TABLE demand_orders ADD CONSTRAINT chk_demand_supply_order_placed CHECK (supply_order_placed IN ('Yes', 'No', NULL));

ALTER TABLE bill_orders ADD CONSTRAINT chk_bill_rev_cap CHECK (rev_cap IN ('R', 'C', NULL));

ALTER TABLE sanction_gen_project ADD CONSTRAINT chk_sgp_rev_cap CHECK (rev_cap IN ('R', 'C', NULL));
ALTER TABLE sanction_misc ADD CONSTRAINT chk_sm_rev_cap CHECK (rev_cap IN ('R', 'C', NULL));
ALTER TABLE sanction_training ADD CONSTRAINT chk_st_rev_cap CHECK (rev_cap IN ('R', 'C', NULL));

-- Summary of inserted data
SELECT 'Supply Orders 2024-25' as Register, COUNT(*) as Total_Entries FROM supply_orders WHERE financial_year = '2024-2025'
UNION ALL
SELECT 'Supply Orders 2025-26' as Register, COUNT(*) as Total_Entries FROM supply_orders WHERE financial_year = '2025-2026'
UNION ALL
SELECT 'Demand Orders 2024-25' as Register, COUNT(*) as Total_Entries FROM demand_orders WHERE financial_year = '2024-2025'
UNION ALL
SELECT 'Demand Orders 2025-26' as Register, COUNT(*) as Total_Entries FROM demand_orders WHERE financial_year = '2025-2026'
UNION ALL
SELECT 'Bill Orders 2024-25' as Register, COUNT(*) as Total_Entries FROM bill_orders WHERE financial_year = '2024-2025'
UNION ALL
SELECT 'Bill Orders 2025-26' as Register, COUNT(*) as Total_Entries FROM bill_orders WHERE financial_year = '2025-2026'
UNION ALL
SELECT 'Sanction Gen Project 2024-25' as Register, COUNT(*) as Total_Entries FROM sanction_gen_project WHERE financial_year = '2024-2025'
UNION ALL
SELECT 'Sanction Gen Project 2025-26' as Register, COUNT(*) as Total_Entries FROM sanction_gen_project WHERE financial_year = '2025-2026'
UNION ALL
SELECT 'Sanction Misc 2024-25' as Register, COUNT(*) as Total_Entries FROM sanction_misc WHERE financial_year = '2024-2025'
UNION ALL
SELECT 'Sanction Misc 2025-26' as Register, COUNT(*) as Total_Entries FROM sanction_misc WHERE financial_year = '2025-2026'
UNION ALL
SELECT 'Sanction Training 2024-25' as Register, COUNT(*) as Total_Entries FROM sanction_training WHERE financial_year = '2024-2025'
UNION ALL
SELECT 'Sanction Training 2025-26' as Register, COUNT(*) as Total_Entries FROM sanction_training WHERE financial_year = '2025-2026';
