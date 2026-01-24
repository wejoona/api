export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export declare class ScheduledJobEntity {
    id: string;
    jobName: string;
    status: JobStatus;
    startedAt: Date | null;
    completedAt: Date | null;
    recordsProcessed: number;
    errorMessage: string | null;
    createdAt: Date;
}
