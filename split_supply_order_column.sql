
-- Migration script to split Supply Order No & Date column into two separate columns

-- Add new columns
ALTER TABLE supply_orders 
ADD COLUMN supply_order_no VARCHAR(255) AFTER serial_no,
ADD COLUMN so_date DATE AFTER supply_order_no;

-- Extract data from existing column and populate new columns
-- This assumes the format is "SO/YYYY/XXX - DD/MM/YYYY"
UPDATE supply_orders 
SET 
    supply_order_no = TRIM(SUBSTRING_INDEX(supply_order_no_date, ' - ', 1)),
    so_date = STR_TO_DATE(TRIM(SUBSTRING_INDEX(supply_order_no_date, ' - ', -1)), '%d/%m/%Y')
WHERE supply_order_no_date IS NOT NULL AND supply_order_no_date != '';

-- Drop the old column after data migration
ALTER TABLE supply_orders DROP COLUMN supply_order_no_date;

-- Add indexes for better performance
CREATE INDEX idx_supply_orders_supply_order_no ON supply_orders(supply_order_no);
CREATE INDEX idx_supply_orders_so_date ON supply_orders(so_date);

-- Show the updated structure
DESCRIBE supply_orders;
