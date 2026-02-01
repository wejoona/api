-- Rollback Script for: 1741800000000-EnhanceKycVerifications
-- Description: Removes enhanced KYC verification columns
-- WARNING: This will delete document URLs and verification scores

BEGIN;

-- Drop foreign key
ALTER TABLE "kyc_verifications"
    DROP CONSTRAINT IF EXISTS "FK_kyc_verifications_reviewed_by";

-- Drop index
DROP INDEX IF EXISTS "IDX_kyc_verifications_reviewed_by";

-- Drop all new columns
ALTER TABLE "kyc_verifications"
    DROP COLUMN IF EXISTS "document_front_url",
    DROP COLUMN IF EXISTS "document_back_url",
    DROP COLUMN IF EXISTS "selfie_url",
    DROP COLUMN IF EXISTS "video_url",
    DROP COLUMN IF EXISTS "address_proof_url",
    DROP COLUMN IF EXISTS "additional_docs",
    DROP COLUMN IF EXISTS "ocr_data",
    DROP COLUMN IF EXISTS "face_match_score",
    DROP COLUMN IF EXISTS "liveness_score",
    DROP COLUMN IF EXISTS "reviewed_by",
    DROP COLUMN IF EXISTS "reviewed_at",
    DROP COLUMN IF EXISTS "review_notes";

COMMIT;

DO $$
BEGIN
    RAISE NOTICE 'Rollback of 1741800000000-EnhanceKycVerifications completed successfully';
END $$;
