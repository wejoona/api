import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CreateWalletUseCase } from '../../../wallet/application/usecases';
import { UserRepository } from '../../../user/infrastructure/repositories';

export interface KycApprovedEvent {
  userId: string;
  kycVerificationId: string;
  firstName?: string;
  lastName?: string;
  country?: string;
}

/**
 * KYC Approved Event Listener
 *
 * When KYC is approved (either auto or manual), creates wallet for the user.
 * This ensures wallet is only created after KYC verification passes.
 */
@Injectable()
export class KycApprovedListener {
  private readonly logger = new Logger(KycApprovedListener.name);

  constructor(
    private readonly createWalletUseCase: CreateWalletUseCase,
    private readonly userRepository: UserRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('kyc.submitted')
  async handleKycSubmitted(event: {
    userId: string;
    kycVerificationId: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    this.logger.log(`KYC submitted for user ${event.userId}`);
    try {
      const user = await this.userRepository.findById(event.userId);
      if (user) {
        user.updateKycStatus('submitted');

        // Sync name from KYC to user profile if not already set
        if (event.firstName && !user.firstName) {
          user.updateProfile({
            firstName: event.firstName,
            lastName: event.lastName || undefined,
          });
        }

        await this.userRepository.save(user);
      }
    } catch (error) {
      this.logger.error(
        `Failed to update user status after KYC submission: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('kyc.approved')
  async handleKycApproved(event: KycApprovedEvent): Promise<void> {
    this.logger.log(
      `KYC approved for user ${event.userId}, creating wallet...`,
    );

    try {
      // Get user details
      const user = await this.userRepository.findById(event.userId);
      if (!user) {
        this.logger.error(`User ${event.userId} not found for wallet creation`);
        return;
      }

      // Update user KYC status
      user.updateKycStatus('approved');
      await this.userRepository.save(user);

      this.eventEmitter.emit('kyc.status.changed', {
        userId: event.userId,
        status: 'approved',
        timestamp: new Date(),
      });

      this.eventEmitter.emit('kyc.status_updated', {
        userId: event.userId,
        status: 'approved',
        timestamp: new Date(),
      });

      // Create wallet
      const wallet = await this.createWalletUseCase.execute({
        userId: event.userId,
        userName: event.firstName
          ? `${event.firstName} ${event.lastName || ''}`.trim()
          : undefined,
        userEmail: user.email || undefined,
        userPhone: user.phone,
        countryCode: event.country || user.countryCode,
      });

      this.logger.log(
        `Wallet created for user ${event.userId}: ${wallet.id} (Circle: ${wallet.circleWalletAddress})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create wallet for user ${event.userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      // Wallet creation failure shouldn't revert KYC approval
      // User can retry wallet creation via support
    }
  }

  @OnEvent('kyc.rejected')
  async handleKycRejected(event: {
    userId: string;
    kycVerificationId: string;
    reason: string;
    reviewedBy?: string;
  }): Promise<void> {
    this.logger.log(`KYC rejected for user ${event.userId}: ${event.reason}`);

    try {
      // Update user KYC status
      const user = await this.userRepository.findById(event.userId);
      if (user) {
        user.updateKycStatus('rejected');
        await this.userRepository.save(user);

        this.eventEmitter.emit('kyc.status.changed', {
          userId: event.userId,
          status: 'rejected',
          reason: event.reason,
          timestamp: new Date(),
        });

        this.eventEmitter.emit('kyc.status_updated', {
          userId: event.userId,
          status: 'rejected',
          timestamp: new Date(),
        });
      }

      // Notification handled by KycNotificationListener (kyc.rejected event)
    } catch (error) {
      this.logger.error(
        `Failed to update user status after KYC rejection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  @OnEvent('kyc.manual_review_required')
  async handleManualReviewRequired(event: {
    userId: string;
    kycVerificationId: string;
    score: number;
  }): Promise<void> {
    this.logger.log(
      `KYC for user ${event.userId} requires manual review (score: ${event.score})`,
    );

    try {
      // Update user KYC status to submitted (in review) — NOT pending
      // 'pending' would let the user re-submit, 'submitted' shows "under review"
      const user = await this.userRepository.findById(event.userId);
      if (user) {
        user.updateKycStatus('submitted');
        await this.userRepository.save(user);
      }

      // Notification handled by KycNotificationListener (kyc.requires_review event)
    } catch (error) {
      this.logger.error(
        `Failed to update user status for manual review: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
