

-- Database Setup Script for Register Management System
-- This script creates all necessary tables and inserts dummy data

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

-- Insert dummy data for Supply Orders
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

-- Insert dummy data for Demand Orders with IMMS Demand No and Supply Order Placed
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

-- Insert dummy data for Bill Orders
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

-- Insert dummy data for Sanction Gen Project
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

-- Insert dummy data for Sanction Misc
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

-- Insert dummy data for Sanction Training
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

