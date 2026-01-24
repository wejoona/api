import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '../../modules/user/infrastructure/repositories';
export interface JwtPayload {
    sub: string;
    phone: string;
}
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly configService;
    private readonly userRepository;
    constructor(configService: ConfigService, userRepository: UserRepository);
    validate(payload: JwtPayload): Promise<import("../../modules/user/application/domain/entities").User>;
}
export {};
