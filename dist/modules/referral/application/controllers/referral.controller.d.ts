import { ReferralService } from '../domain/services/referral.service';
import { ApplyReferralCodeRequest } from '../dto/requests/apply-referral-code.request';
import { ReferralResponse, ReferralStatsResponse, LeaderboardResponse } from '../dto/responses/referral.response';
export declare class ReferralController {
    private readonly referralService;
    constructor(referralService: ReferralService);
    getReferralCode(userId: string): Promise<{
        code: string;
        link: string;
    }>;
    getStats(userId: string): Promise<ReferralStatsResponse>;
    getHistory(userId: string): Promise<ReferralResponse[]>;
    applyCode(userId: string, dto: ApplyReferralCodeRequest): Promise<ReferralResponse>;
    getLeaderboard(limit?: number): Promise<LeaderboardResponse>;
}
