"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FcmPushAdapter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FcmPushAdapter = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let FcmPushAdapter = FcmPushAdapter_1 = class FcmPushAdapter {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(FcmPushAdapter_1.name);
        this.accessToken = null;
        this.tokenExpiry = null;
        this.providerName = 'fcm';
        this.projectId = this.configService.get('fcm.projectId') || '';
        this.clientEmail = this.configService.get('fcm.clientEmail') || '';
        this.privateKey = this.configService.get('fcm.privateKey') || '';
        this.baseUrl = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
        if (!this.projectId || !this.clientEmail || !this.privateKey) {
            this.logger.warn('FCM credentials not configured. Push notifications will fail.');
        }
        else {
            this.logger.log('FCM Push adapter initialized');
        }
    }
    async send(request) {
        try {
            const token = await this.getAccessToken();
            const fcmMessage = {
                message: {
                    token: request.deviceToken,
                    notification: {
                        title: request.title,
                        body: request.body,
                        image: request.imageUrl,
                    },
                    data: request.data,
                    android: {
                        priority: request.priority === 'high' ? 'HIGH' : 'NORMAL',
                        notification: {
                            sound: request.sound || 'default',
                        },
                    },
                    apns: {
                        payload: {
                            aps: {
                                badge: request.badge,
                                sound: request.sound || 'default',
                            },
                        },
                    },
                },
            };
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(fcmMessage),
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`FCM error: ${error.error.message}`);
            }
            const result = (await response.json());
            this.logger.log(`Push notification sent: ${result.name}`);
            return {
                id: result.name,
                success: true,
                deviceToken: request.deviceToken,
                provider: this.providerName,
                createdAt: new Date(),
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send FCM push notification: ${errorMessage}`);
            return {
                id: `error_${Date.now()}`,
                success: false,
                deviceToken: request.deviceToken,
                failureReason: errorMessage,
                provider: this.providerName,
                createdAt: new Date(),
            };
        }
    }
    async sendMulticast(request) {
        const responses = [];
        for (const token of request.deviceTokens) {
            const response = await this.send({
                deviceToken: token,
                title: request.title,
                body: request.body,
                data: request.data,
                imageUrl: request.imageUrl,
                sound: request.sound,
                priority: request.priority,
            });
            responses.push(response);
        }
        return {
            successCount: responses.filter((r) => r.success).length,
            failureCount: responses.filter((r) => !r.success).length,
            responses,
        };
    }
    async subscribeToTopic(deviceToken, topic) {
        try {
            const token = await this.getAccessToken();
            const response = await fetch(`https://iid.googleapis.com/iid/v1/${deviceToken}/rel/topics/${topic}`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to subscribe to topic: ${response.statusText}`);
            }
            this.logger.log(`Device subscribed to topic: ${topic}`);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to subscribe to topic: ${errorMessage}`);
            return false;
        }
    }
    async unsubscribeFromTopic(deviceToken, topic) {
        try {
            const token = await this.getAccessToken();
            const response = await fetch(`https://iid.googleapis.com/iid/v1/${deviceToken}/rel/topics/${topic}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to unsubscribe from topic: ${response.statusText}`);
            }
            this.logger.log(`Device unsubscribed from topic: ${topic}`);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to unsubscribe from topic: ${errorMessage}`);
            return false;
        }
    }
    async sendToTopic(topic, title, body, data) {
        try {
            const token = await this.getAccessToken();
            const fcmMessage = {
                message: {
                    topic,
                    notification: {
                        title,
                        body,
                    },
                    data,
                },
            };
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(fcmMessage),
            });
            if (!response.ok) {
                const error = (await response.json());
                throw new Error(`FCM error: ${error.error.message}`);
            }
            const result = (await response.json());
            this.logger.log(`Topic notification sent: ${result.name}`);
            return { messageId: result.name };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to send FCM topic notification: ${errorMessage}`);
            throw error;
        }
    }
    async getAccessToken() {
        if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.accessToken;
        }
        const now = Math.floor(Date.now() / 1000);
        const expiry = now + 3600;
        const header = {
            alg: 'RS256',
            typ: 'JWT',
        };
        const claims = {
            iss: this.clientEmail,
            sub: this.clientEmail,
            aud: 'https://oauth2.googleapis.com/token',
            iat: now,
            exp: expiry,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
        };
        const jwt = await this.signJwt(header, claims, this.privateKey);
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: jwt,
            }).toString(),
        });
        if (!response.ok) {
            throw new Error(`Failed to get FCM access token: ${response.statusText}`);
        }
        const data = (await response.json());
        this.accessToken = data.access_token;
        this.tokenExpiry = new Date(Date.now() + data.expires_in * 1000 - 60000);
        return this.accessToken;
    }
    async signJwt(header, claims, privateKey) {
        const crypto = await Promise.resolve().then(() => require('crypto'));
        const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
        const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
        const signatureInput = `${encodedHeader}.${encodedClaims}`;
        const sign = crypto.createSign('RSA-SHA256');
        sign.update(signatureInput);
        const signature = sign.sign(privateKey, 'base64url');
        return `${signatureInput}.${signature}`;
    }
};
exports.FcmPushAdapter = FcmPushAdapter;
exports.FcmPushAdapter = FcmPushAdapter = FcmPushAdapter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], FcmPushAdapter);
//# sourceMappingURL=fcm-push.adapter.js.map