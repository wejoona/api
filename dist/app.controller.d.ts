import { AppService } from './app.service';
export declare class AppController {
    constructor(_appService: AppService);
    getHealth(): {
        status: string;
        timestamp: string;
    };
}
