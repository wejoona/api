-- Rollback Script for: 1742100000000-CreateFraudRingDetectionsTable
-- Description: Drops fraud_ring_detections table from compliance schema
-- WARNING: This will delete all fraud ring detection data

BEGIN;

-- Drop table
DROP TABLE IF EXISTS "compliance"."fraud_ring_detections" CASCADE;

-- Drop enum types
DROP TYPE IF EXISTS "compliance"."fraud_ring_detection_status_enum" CASCADE;
DROP TYPE IF EXISTS "compliance"."fraud_ring_detection_type_enum" CASCADE;

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1742100000000-CreateFraudRingDetectionsTable completed successfully';
END $$;
