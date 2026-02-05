
-- Fix missing columns in both supply_orders and demand_orders tables

-- Add imms_demand_no column to supply_orders if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supply_orders' AND COLUMN_NAME = 'imms_demand_no');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE supply_orders ADD COLUMN imms_demand_no VARCHAR(255) AFTER rev_cap',
    'SELECT "Column imms_demand_no already exists in supply_orders" as status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure imms_demand_no column exists in demand_orders (it should already exist from database_setup.sql)
SET @col_exists_demand = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'demand_orders' AND COLUMN_NAME = 'imms_demand_no');

SET @sql_demand = IF(@col_exists_demand = 0, 
    'ALTER TABLE demand_orders ADD COLUMN imms_demand_no VARCHAR(255) AFTER serial_no',
    'SELECT "Column imms_demand_no already exists in demand_orders" as status');

PREPARE stmt_demand FROM @sql_demand;
EXECUTE stmt_demand;
DEALLOCATE PREPARE stmt_demand;

-- Show final table structures
DESCRIBE supply_orders;
DESCRIBE demand_orders;
