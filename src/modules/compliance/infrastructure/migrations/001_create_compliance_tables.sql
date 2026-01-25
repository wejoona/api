-- ==========================================
-- BCEAO Compliance Engine Database Schema
-- ==========================================
--
-- Creates tables for:
-- 1. Compliance Reports (BCEAO periodic reporting)
-- 2. Suspicious Activity Reports (SAR)
-- 3. Compliance Alerts (real-time monitoring)
--
-- Retention: 7 years per BCEAO requirements
-- ==========================================

-- Compliance Reports Table
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type VARCHAR(20) NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'suspicious')),
  period_start TIMESTAMP NOT NULL,
  period_end TIMESTAMP NOT NULL,
  total_transactions INTEGER DEFAULT 0,
  total_volume DECIMAL(18,6) DEFAULT 0,
  total_volume_xof DECIMAL(18,2) DEFAULT 0,
  cross_border_count INTEGER DEFAULT 0,
  cross_border_volume DECIMAL(18,6) DEFAULT 0,
  large_transaction_count INTEGER DEFAULT 0,
  flagged_transactions JSONB DEFAULT '[]',
  unique_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  suspicious_activity_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'submitted', 'acknowledged', 'rejected')),
  report_data JSONB,
  bceao_reference VARCHAR(100) UNIQUE,
  generated_by UUID,
  reviewed_by UUID,
  submitted_by UUID,
  submitted_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP,

  CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- Indexes for compliance_reports
CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_period_start ON compliance_reports(period_start);
CREATE INDEX idx_compliance_reports_period_end ON compliance_reports(period_end);
CREATE INDEX idx_compliance_reports_status ON compliance_reports(status);
CREATE INDEX idx_compliance_reports_submitted ON compliance_reports(submitted_at);
CREATE INDEX idx_compliance_reports_bceao_ref ON compliance_reports(bceao_reference);
CREATE INDEX idx_compliance_reports_archived ON compliance_reports(archived_at);

-- Suspicious Activity Reports Table
CREATE TABLE IF NOT EXISTS suspicious_activity_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_ids JSONB DEFAULT '[]',
  trigger_reason VARCHAR(50) NOT NULL CHECK (trigger_reason IN (
    'structuring', 'velocity_anomaly', 'geographic_risk', 'pep_transaction',
    'sanctions_proximity', 'manual_flag', 'round_amount', 'rapid_movement',
    'inconsistent_profile'
  )),
  risk_score DECIMAL(5,2) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  narrative TEXT NOT NULL,
  detection_method VARCHAR(20) NOT NULL CHECK (detection_method IN ('automated', 'manual')),
  detected_at TIMESTAMP NOT NULL,
  status VARCHAR(30) DEFAULT 'draft' CHECK (status IN ('draft', 'under_investigation', 'submitted', 'closed', 'dismissed')),

  -- User snapshot (preserved even if user deleted)
  user_phone VARCHAR(20) NOT NULL,
  user_first_name VARCHAR(100),
  user_last_name VARCHAR(100),
  user_country_code VARCHAR(3) NOT NULL,
  user_kyc_status VARCHAR(20) NOT NULL,
  user_account_age_days INTEGER NOT NULL,

  -- Transaction summary
  total_amount DECIMAL(18,6) DEFAULT 0,
  total_amount_xof DECIMAL(18,2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,

  -- Investigation
  investigated_by UUID,
  investigation_notes TEXT,
  investigation_started_at TIMESTAMP,

  -- Submission
  submitted_by UUID,
  submitted_at TIMESTAMP,
  bceao_reference VARCHAR(100) UNIQUE,

  -- Closure
  closed_at TIMESTAMP,
  closed_by UUID,
  closed_reason TEXT,

  -- Additional data
  pattern_indicators JSONB,
  related_sar_ids JSONB DEFAULT '[]',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP
);

-- Indexes for suspicious_activity_reports
CREATE INDEX idx_sar_user ON suspicious_activity_reports(user_id);
CREATE INDEX idx_sar_trigger ON suspicious_activity_reports(trigger_reason);
CREATE INDEX idx_sar_status ON suspicious_activity_reports(status);
CREATE INDEX idx_sar_risk_level ON suspicious_activity_reports(risk_level);
CREATE INDEX idx_sar_detected ON suspicious_activity_reports(detected_at);
CREATE INDEX idx_sar_submitted ON suspicious_activity_reports(submitted_at);
CREATE INDEX idx_sar_bceao_ref ON suspicious_activity_reports(bceao_reference);
CREATE INDEX idx_sar_archived ON suspicious_activity_reports(archived_at);

-- Compliance Alerts Table
CREATE TABLE IF NOT EXISTS compliance_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'structuring', 'velocity_anomaly', 'geographic_risk', 'pep_transaction',
    'sanctions_proximity', 'manual_flag', 'round_amount', 'rapid_movement',
    'inconsistent_profile'
  )),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP,
  acknowledged_by UUID,
  resolved_at TIMESTAMP,
  resolved_by UUID,
  resolution TEXT,
  escalated_to_sar BOOLEAN DEFAULT false,
  sar_id UUID REFERENCES suspicious_activity_reports(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for compliance_alerts
CREATE INDEX idx_alert_type ON compliance_alerts(alert_type);
CREATE INDEX idx_alert_severity ON compliance_alerts(severity);
CREATE INDEX idx_alert_user ON compliance_alerts(user_id);
CREATE INDEX idx_alert_transaction ON compliance_alerts(transaction_id);
CREATE INDEX idx_alert_resolved ON compliance_alerts(resolved);
CREATE INDEX idx_alert_created ON compliance_alerts(created_at);
CREATE INDEX idx_alert_sar ON compliance_alerts(sar_id);

-- ==========================================
-- Triggers for updated_at
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_compliance_reports_updated_at
  BEFORE UPDATE ON compliance_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sar_updated_at
  BEFORE UPDATE ON suspicious_activity_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
  BEFORE UPDATE ON compliance_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Sample Data (for development/testing)
-- ==========================================

-- Insert sample compliance configuration
COMMENT ON TABLE compliance_reports IS 'BCEAO periodic compliance reports with 7-year retention';
COMMENT ON TABLE suspicious_activity_reports IS 'Suspicious Activity Reports for BCEAO filing';
COMMENT ON TABLE compliance_alerts IS 'Real-time compliance monitoring alerts';

-- ==========================================
-- Archive Policy (7-year retention)
-- ==========================================

-- Function to archive old compliance data
CREATE OR REPLACE FUNCTION archive_old_compliance_data()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
  retention_days INTEGER := 2555; -- 7 years
  cutoff_date TIMESTAMP;
BEGIN
  cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

  -- Archive old reports
  UPDATE compliance_reports
  SET archived_at = NOW()
  WHERE created_at < cutoff_date
    AND archived_at IS NULL;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  -- Archive old SARs
  UPDATE suspicious_activity_reports
  SET archived_at = NOW()
  WHERE created_at < cutoff_date
    AND archived_at IS NULL;

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_old_compliance_data IS 'Archives compliance data older than 7 years per BCEAO requirements';
