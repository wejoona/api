"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerifyHQClient = void 0;
class VerifyHQClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }
    async request(method, path, body, isFormData = false) {
        const headers = {
            'X-API-Key': this.apiKey,
        };
        let requestBody;
        if (isFormData) {
            requestBody = body; // FormData
        }
        else if (body) {
            headers['Content-Type'] = 'application/json';
            requestBody = JSON.stringify(body);
        }
        const res = await fetch(`${this.baseUrl}${path}`, {
            method,
            headers,
            body: requestBody,
        });
        if (!res.ok) {
            const error = await res.text();
            throw new Error(`VerifyHQ API error ${res.status}: ${error}`);
        }
        return res.json();
    }
    // === Document Verification ===
    async submitDocument(userId, docType, frontImage, backImage) {
        const form = new FormData();
        form.append('userId', userId);
        form.append('documentType', docType);
        form.append('documentCountry', 'US');
        form.append('frontImage', frontImage);
        if (backImage)
            form.append('backImage', backImage);
        return this.request('POST', '/verifications/document', form, true);
    }
    async getDocumentVerification(id) {
        return this.request('GET', `/verifications/document/${id}`);
    }
    // === Liveness (Challenge-based) ===
    async createLivenessSession(userId) {
        return this.request('POST', '/verifications/liveness/session', { userId });
    }
    async submitChallenge(sessionToken, challengeId, photo) {
        const form = new FormData();
        form.append('sessionToken', sessionToken);
        form.append('challengeId', challengeId);
        form.append('photo', photo);
        return this.request('POST', '/verifications/liveness/challenge', form, true);
    }
    async submitReferenceSelfie(sessionToken, selfie) {
        const form = new FormData();
        form.append('sessionToken', sessionToken);
        form.append('selfie', selfie);
        return this.request('POST', '/verifications/liveness/reference-selfie', form, true);
    }
    /** @deprecated Use submitChallenge() instead */
    async submitLiveness(sessionToken, video, selfie) {
        const form = new FormData();
        form.append('sessionToken', sessionToken);
        form.append('video', video);
        form.append('selfie', selfie);
        return this.request('POST', '/verifications/liveness/submit', form, true);
    }
    async getLivenessCheck(id) {
        return this.request('GET', `/verifications/liveness/${id}`);
    }
    // === Identity Verification ===
    async startIdentityVerification(userId, tier) {
        return this.request('POST', '/verifications/identity', { userId, tier });
    }
    async getVerificationStatus(verificationId) {
        return this.request('GET', `/verifications/identity/${verificationId}`);
    }
    async getUserVerifications(userId) {
        return this.request('GET', `/verifications/identity/user/${userId}`);
    }
}
exports.VerifyHQClient = VerifyHQClient;
