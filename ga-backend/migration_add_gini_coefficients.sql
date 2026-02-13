-- Migration: Add Gini Coefficient columns to generated_schedules table
-- Date: 2026-02-14
-- Description: Adds fairness metrics (Gini coefficients) to track distribution equality

-- Add Gini coefficient columns
ALTER TABLE generated_schedules 
ADD COLUMN IF NOT EXISTS gini_workload DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gini_room_usage DECIMAL(10, 4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS gini_ac_access DECIMAL(10, 4) DEFAULT 0;

-- Add comment
COMMENT ON COLUMN generated_schedules.gini_workload IS 'Gini coefficient for professor workload distribution (0=equal, 1=unequal)';
COMMENT ON COLUMN generated_schedules.gini_room_usage IS 'Gini coefficient for room utilization (0=equal, 1=unequal)';
COMMENT ON COLUMN generated_schedules.gini_ac_access IS 'Gini coefficient for AC room access among AC-preferring professors (0=equal, 1=unequal)';

-- Verify migration
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'generated_schedules'
AND column_name LIKE 'gini%';
