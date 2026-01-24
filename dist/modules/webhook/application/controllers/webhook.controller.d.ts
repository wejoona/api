import { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { ProcessWebhookUseCase } from '../usecases';
export declare class WebhookController {
    private readonly processWebhookUseCase;
    private readonly logger;
    constructor(processWebhookUseCase: ProcessWebhookUseCase);
    handlePaymentWebhook(req: RawBodyRequest<Request>, payload: Record<string, unknown>, signature: string): Promise<import("../usecases/process-webhook.use-case").ProcessWebhookOutput>;
    handleYellowCardWebhook(req: RawBodyRequest<Request>, payload: Record<string, unknown>, signature: string): Promise<import("../usecases/process-webhook.use-case").ProcessWebhookOutput>;
    handleCircleWebhook(req: RawBodyRequest<Request>, payload: Record<string, unknown>, signature: string): Promise<import("../usecases/process-webhook.use-case").ProcessWebhookOutput>;
}
