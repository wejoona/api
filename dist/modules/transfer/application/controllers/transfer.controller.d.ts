import { AuthenticatedRequest } from '../../../../common/guards';
import { CreateInternalTransferDto, CreateExternalTransferDto } from '../dto/requests';
import { TransferResponse, TransferListResponse } from '../dto/responses';
import { TransferRepository } from '../../infrastructure/repositories/transfer.repository';
import { InternalTransferUseCase } from '../../../wallet/application/usecases/internal-transfer.use-case';
import { ExternalTransferUseCase } from '../../../wallet/application/usecases/external-transfer.use-case';
export declare class TransferController {
    private readonly transferRepository;
    private readonly internalTransferUseCase;
    private readonly externalTransferUseCase;
    constructor(transferRepository: TransferRepository, internalTransferUseCase: InternalTransferUseCase, externalTransferUseCase: ExternalTransferUseCase);
    createInternalTransfer(req: AuthenticatedRequest, dto: CreateInternalTransferDto): Promise<TransferResponse>;
    createExternalTransfer(req: AuthenticatedRequest, dto: CreateExternalTransferDto): Promise<TransferResponse>;
    getTransfers(req: AuthenticatedRequest, limit: number, offset: number): Promise<TransferListResponse>;
    getTransferById(req: AuthenticatedRequest, id: string): Promise<TransferResponse>;
}
