import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * SLA Configurations Seed
 *
 * Seeds Service Level Agreement configurations for:
 * - Support ticket response/resolution times
 * - KYC review timelines
 * - Compliance case handling
 *
 * All times are in minutes.
 */

interface SlaConfigSeedData {
  name: string;
  category: string;
  priority: string;
  responseTimeMinutes: number;
  resolutionTimeMinutes: number;
  escalationAfterMinutes: number | null;
  businessHoursOnly: boolean;
}

const slaConfigurations: SlaConfigSeedData[] = [
  // Support Ticket SLAs
  {
    name: 'Support - Critical Priority',
    category: 'support_ticket',
    priority: 'critical',
    responseTimeMinutes: 15,
    resolutionTimeMinutes: 60,
    escalationAfterMinutes: 30,
    businessHoursOnly: false,
  },
  {
    name: 'Support - High Priority',
    category: 'support_ticket',
    priority: 'high',
    responseTimeMinutes: 60,
    resolutionTimeMinutes: 240,
    escalationAfterMinutes: 120,
    businessHoursOnly: false,
  },
  {
    name: 'Support - Medium Priority',
    category: 'support_ticket',
    priority: 'medium',
    responseTimeMinutes: 240,
    resolutionTimeMinutes: 1440,
    escalationAfterMinutes: 480,
    businessHoursOnly: true,
  },
  {
    name: 'Support - Low Priority',
    category: 'support_ticket',
    priority: 'low',
    responseTimeMinutes: 480,
    resolutionTimeMinutes: 2880,
    escalationAfterMinutes: 1440,
    businessHoursOnly: true,
  },

  // KYC Review SLAs
  {
    name: 'KYC Review - Critical (Blocked User)',
    category: 'kyc_review',
    priority: 'critical',
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 120,
    escalationAfterMinutes: 60,
    businessHoursOnly: false,
  },
  {
    name: 'KYC Review - High (Manual Review)',
    category: 'kyc_review',
    priority: 'high',
    responseTimeMinutes: 120,
    resolutionTimeMinutes: 480,
    escalationAfterMinutes: 240,
    businessHoursOnly: true,
  },
  {
    name: 'KYC Review - Medium (Document Resubmission)',
    category: 'kyc_review',
    priority: 'medium',
    responseTimeMinutes: 240,
    resolutionTimeMinutes: 1440,
    escalationAfterMinutes: 720,
    businessHoursOnly: true,
  },
  {
    name: 'KYC Review - Low (Enhancement Request)',
    category: 'kyc_review',
    priority: 'low',
    responseTimeMinutes: 480,
    resolutionTimeMinutes: 2880,
    escalationAfterMinutes: 1440,
    businessHoursOnly: true,
  },

  // Compliance Case SLAs
  {
    name: 'Compliance - Critical (Sanctions Hit)',
    category: 'compliance_case',
    priority: 'critical',
    responseTimeMinutes: 5,
    resolutionTimeMinutes: 30,
    escalationAfterMinutes: 15,
    businessHoursOnly: false,
  },
  {
    name: 'Compliance - High (Fraud Alert)',
    category: 'compliance_case',
    priority: 'high',
    responseTimeMinutes: 15,
    resolutionTimeMinutes: 120,
    escalationAfterMinutes: 60,
    businessHoursOnly: false,
  },
  {
    name: 'Compliance - Medium (Velocity Breach)',
    category: 'compliance_case',
    priority: 'medium',
    responseTimeMinutes: 60,
    resolutionTimeMinutes: 480,
    escalationAfterMinutes: 240,
    businessHoursOnly: true,
  },
  {
    name: 'Compliance - Low (Routine Review)',
    category: 'compliance_case',
    priority: 'low',
    responseTimeMinutes: 240,
    resolutionTimeMinutes: 1440,
    escalationAfterMinutes: 720,
    businessHoursOnly: true,
  },

  // Transaction Dispute SLAs
  {
    name: 'Dispute - Critical (Large Amount)',
    category: 'transaction_dispute',
    priority: 'critical',
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 240,
    escalationAfterMinutes: 120,
    businessHoursOnly: false,
  },
  {
    name: 'Dispute - High Priority',
    category: 'transaction_dispute',
    priority: 'high',
    responseTimeMinutes: 120,
    resolutionTimeMinutes: 480,
    escalationAfterMinutes: 240,
    businessHoursOnly: true,
  },
  {
    name: 'Dispute - Medium Priority',
    category: 'transaction_dispute',
    priority: 'medium',
    responseTimeMinutes: 480,
    resolutionTimeMinutes: 1440,
    escalationAfterMinutes: 720,
    businessHoursOnly: true,
  },
  {
    name: 'Dispute - Low Priority',
    category: 'transaction_dispute',
    priority: 'low',
    responseTimeMinutes: 1440,
    resolutionTimeMinutes: 4320,
    escalationAfterMinutes: 2160,
    businessHoursOnly: true,
  },

  // Account Recovery SLAs
  {
    name: 'Account Recovery - Critical (Compromised)',
    category: 'account_recovery',
    priority: 'critical',
    responseTimeMinutes: 5,
    resolutionTimeMinutes: 60,
    escalationAfterMinutes: 30,
    businessHoursOnly: false,
  },
  {
    name: 'Account Recovery - High (Locked Out)',
    category: 'account_recovery',
    priority: 'high',
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 240,
    escalationAfterMinutes: 120,
    businessHoursOnly: false,
  },
  {
    name: 'Account Recovery - Medium (Device Change)',
    category: 'account_recovery',
    priority: 'medium',
    responseTimeMinutes: 120,
    resolutionTimeMinutes: 480,
    escalationAfterMinutes: 240,
    businessHoursOnly: true,
  },
  {
    name: 'Account Recovery - Low (Info Update)',
    category: 'account_recovery',
    priority: 'low',
    responseTimeMinutes: 480,
    resolutionTimeMinutes: 1440,
    escalationAfterMinutes: 720,
    businessHoursOnly: true,
  },

  // Withdrawal Request SLAs (Provider Issues)
  {
    name: 'Withdrawal - Critical (Failed)',
    category: 'withdrawal_issue',
    priority: 'critical',
    responseTimeMinutes: 15,
    resolutionTimeMinutes: 120,
    escalationAfterMinutes: 60,
    businessHoursOnly: false,
  },
  {
    name: 'Withdrawal - High (Delayed)',
    category: 'withdrawal_issue',
    priority: 'high',
    responseTimeMinutes: 60,
    resolutionTimeMinutes: 480,
    escalationAfterMinutes: 240,
    businessHoursOnly: false,
  },
  {
    name: 'Withdrawal - Medium (Inquiry)',
    category: 'withdrawal_issue',
    priority: 'medium',
    responseTimeMinutes: 240,
    resolutionTimeMinutes: 1440,
    escalationAfterMinutes: 720,
    businessHoursOnly: true,
  },
  {
    name: 'Withdrawal - Low (General)',
    category: 'withdrawal_issue',
    priority: 'low',
    responseTimeMinutes: 480,
    resolutionTimeMinutes: 2880,
    escalationAfterMinutes: 1440,
    businessHoursOnly: true,
  },
];

export async function seedSlaConfigurations(
  dataSource: DataSource,
): Promise<void> {
  console.log('Seeding SLA configurations...');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // Ensure schema exists
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS system`);

    for (const sla of slaConfigurations) {
      // Check if SLA already exists (unique by category + priority)
      const existing = await queryRunner.query(
        `SELECT id FROM system.sla_configurations
         WHERE category = $1 AND priority = $2`,
        [sla.category, sla.priority],
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO system.sla_configurations (
            id, name, category, priority, response_time_minutes,
            resolution_time_minutes, escalation_after_minutes,
            is_active, business_hours_only, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
          [
            uuidv4(),
            sla.name,
            sla.category,
            sla.priority,
            sla.responseTimeMinutes,
            sla.resolutionTimeMinutes,
            sla.escalationAfterMinutes,
            true,
            sla.businessHoursOnly,
          ],
        );
        console.log(`  Created SLA: ${sla.name}`);
      } else {
        console.log(`  Skipped (exists): ${sla.name}`);
      }
    }

    await queryRunner.commitTransaction();
    console.log(
      `SLA configurations seeded: ${slaConfigurations.length} configurations processed`,
    );
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Failed to seed SLA configurations:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

export default seedSlaConfigurations;
