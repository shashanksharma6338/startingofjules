
-- Migration script to add imms_demand_no column to supply_orders table if it doesn't exist

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_NAME = 'supply_orders' AND COLUMN_NAME = 'imms_demand_no');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE supply_orders ADD COLUMN imms_demand_no VARCHAR(255) AFTER rev_cap',
    'SELECT "Column imms_demand_no already exists" as status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
