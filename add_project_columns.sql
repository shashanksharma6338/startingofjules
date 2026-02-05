
-- Migration script to add new project columns to supply_orders table

-- Add project_less_2cr column if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supply_orders' AND COLUMN_NAME = 'project_less_2cr');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE supply_orders ADD COLUMN project_less_2cr DECIMAL(15,2) AFTER misc',
    'SELECT "Column project_less_2cr already exists" as status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add project_more_2cr column if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supply_orders' AND COLUMN_NAME = 'project_more_2cr');

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE supply_orders ADD COLUMN project_more_2cr DECIMAL(15,2) AFTER project_less_2cr',
    'SELECT "Column project_more_2cr already exists" as status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show final table structure
DESCRIBE supply_orders;
