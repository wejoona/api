export type ActorType = 'user' | 'admin' | 'system';
export declare class AuditLogEntity {
    id: string;
    actorId: string | null;
    actorType: ActorType;
    action: string;
    resourceType: string;
    resourceId: string | null;
    details: Record<string, unknown> | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
}
