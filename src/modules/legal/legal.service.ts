import { Injectable, Logger } from '@nestjs/common';
import { LegalDocumentDto, LegalConsentDto } from './legal.dto';
import { maskUserId } from '@common/utils/pii-sanitizer';

export enum LegalDocumentType {
  TERMS_OF_SERVICE = 'terms_of_service',
  PRIVACY_POLICY = 'privacy_policy',
  COOKIE_POLICY = 'cookie_policy',
}

@Injectable()
export class LegalService {
  private readonly logger = new Logger(LegalService.name);

  // In production, these would come from a database or CMS
  private readonly documents: Record<string, LegalDocumentDto> = {
    terms_of_service_en: {
      id: 'tos-2024-01',
      type: 'terms_of_service',
      version: '1.2.0',
      title: 'Terms of Service',
      content: this.getTermsContent(),
      content_html: this.getTermsContentHtml(),
      effective_date: '2024-01-15T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      summary:
        'Updated payment processing terms and added USDC stablecoin disclosures.',
      locale: 'en',
    },
    privacy_policy_en: {
      id: 'privacy-2024-01',
      type: 'privacy_policy',
      version: '1.1.0',
      title: 'Privacy Policy',
      content: this.getPrivacyContent(),
      content_html: this.getPrivacyContentHtml(),
      effective_date: '2024-01-15T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      summary:
        'Added details about biometric data handling and third-party integrations.',
      locale: 'en',
    },
    terms_of_service_fr: {
      id: 'tos-2024-01-fr',
      type: 'terms_of_service',
      version: '1.2.0',
      title: "Conditions d'Utilisation",
      content: this.getTermsContentFr(),
      content_html: this.getTermsContentHtmlFr(),
      effective_date: '2024-01-15T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      summary: 'Mise à jour des conditions de traitement des paiements.',
      locale: 'fr',
    },
    privacy_policy_fr: {
      id: 'privacy-2024-01-fr',
      type: 'privacy_policy',
      version: '1.1.0',
      title: 'Politique de Confidentialité',
      content: this.getPrivacyContentFr(),
      content_html: this.getPrivacyContentHtmlFr(),
      effective_date: '2024-01-15T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      summary: 'Ajout de détails sur le traitement des données biométriques.',
      locale: 'fr',
    },
    cookie_policy_en: {
      id: 'cookie-2024-01',
      type: 'cookie_policy',
      version: '1.0.0',
      title: 'Cookie Policy',
      content: this.getCookiePolicyContent(),
      content_html: this.getCookiePolicyContentHtml(),
      effective_date: '2024-01-15T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      summary: 'Initial cookie policy with GDPR and ePrivacy compliance.',
      locale: 'en',
    },
    cookie_policy_fr: {
      id: 'cookie-2024-01-fr',
      type: 'cookie_policy',
      version: '1.0.0',
      title: 'Politique de Cookies',
      content: this.getCookiePolicyContentFr(),
      content_html: this.getCookiePolicyContentHtmlFr(),
      effective_date: '2024-01-15T00:00:00Z',
      last_updated: '2024-01-15T00:00:00Z',
      summary: 'Politique initiale conforme au RGPD et à ePrivacy.',
      locale: 'fr',
    },
  };

  getTermsOfService(locale: string = 'en'): LegalDocumentDto {
    const key = `terms_of_service_${locale}`;
    return this.documents[key] || this.documents['terms_of_service_en'];
  }

  getPrivacyPolicy(locale: string = 'en'): LegalDocumentDto {
    const key = `privacy_policy_${locale}`;
    return this.documents[key] || this.documents['privacy_policy_en'];
  }

  getCookiePolicy(locale: string = 'en'): LegalDocumentDto {
    const key = `cookie_policy_${locale}`;
    return this.documents[key] || this.documents['cookie_policy_en'];
  }

  async recordConsent(
    consent: LegalConsentDto,
    userId?: string,
  ): Promise<void> {
    // In production, store this in database
    // SECURITY: PII (ipAddress, deviceId) intentionally excluded from logs
    // to comply with data protection regulations (GDPR, CCPA)
    // @see CWE-532: Insertion of Sensitive Information into Log File
    this.logger.log('Legal consent recorded', {
      userId: maskUserId(userId),
      documentId: consent.document_id,
      documentVersion: consent.document_version,
      documentType: consent.document_type,
      consentedAt: consent.consented_at,
      // ipAddress and deviceId intentionally omitted - PII should not be logged
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT CONTENT (English)
  // ═══════════════════════════════════════════════════════════════════════════

  private getTermsContent(): string {
    return `
JOONAPAY TERMS OF SERVICE

Last Updated: January 15, 2024
Version: 1.2.0

1. ACCEPTANCE OF TERMS

By downloading, installing, or using the JoonaPay mobile application ("App") or any related services (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Services.

2. DESCRIPTION OF SERVICES

JoonaPay provides a digital wallet service that enables you to:
- Store, send, and receive USDC (USD Coin) stablecoin
- Convert between USDC and supported local currencies
- Make payments to merchants and individuals
- Access your transaction history

USDC is a stablecoin pegged to the US Dollar. While USDC aims to maintain a 1:1 value with USD, we do not guarantee this peg will always be maintained.

3. ELIGIBILITY

To use the Services, you must:
- Be at least 18 years of age
- Be capable of forming a legally binding contract
- Not be prohibited from using the Services under applicable laws
- Complete our identity verification (KYC) process

4. ACCOUNT REGISTRATION AND SECURITY

4.1 You must provide accurate, current, and complete information during registration.
4.2 You are responsible for maintaining the confidentiality of your account credentials.
4.3 You must enable recommended security features (PIN, biometric authentication).
4.4 You must notify us immediately of any unauthorized access to your account.

5. FEES AND CHARGES

5.1 We may charge fees for certain transactions. Current fees are displayed before you confirm each transaction.
5.2 Third-party fees (network fees, exchange fees) may apply and are your responsibility.
5.3 We reserve the right to change our fee structure with 30 days notice.

6. PROHIBITED ACTIVITIES

You may not use the Services for:
- Illegal activities or money laundering
- Fraud or deceptive practices
- Terrorism financing
- Circumventing financial sanctions
- Any activity that violates these Terms

7. INTELLECTUAL PROPERTY

All content, features, and functionality of the Services are owned by JoonaPay and are protected by intellectual property laws.

8. DISCLAIMERS

8.1 THE SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.
8.2 We do not guarantee uninterrupted or error-free service.
8.3 Cryptocurrency values can be volatile. You assume all risks associated with holding digital assets.

9. LIMITATION OF LIABILITY

TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOONAPAY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.

10. DISPUTE RESOLUTION

Any disputes shall be resolved through binding arbitration in accordance with applicable arbitration rules.

11. GOVERNING LAW

These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which JoonaPay operates.

12. CHANGES TO TERMS

We may update these Terms from time to time. Continued use of the Services after changes constitutes acceptance of the new Terms.

13. CONTACT US

For questions about these Terms, contact us at: legal@joonapay.com
    `.trim();
  }

  private getTermsContentHtml(): string {
    return `
<h1>JoonaPay Terms of Service</h1>
<p><strong>Last Updated:</strong> January 15, 2024<br><strong>Version:</strong> 1.2.0</p>

<h2>1. Acceptance of Terms</h2>
<p>By downloading, installing, or using the JoonaPay mobile application ("App") or any related services (collectively, the "Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Services.</p>

<h2>2. Description of Services</h2>
<p>JoonaPay provides a digital wallet service that enables you to:</p>
<ul>
  <li>Store, send, and receive USDC (USD Coin) stablecoin</li>
  <li>Convert between USDC and supported local currencies</li>
  <li>Make payments to merchants and individuals</li>
  <li>Access your transaction history</li>
</ul>
<p><strong>Important:</strong> USDC is a stablecoin pegged to the US Dollar. While USDC aims to maintain a 1:1 value with USD, we do not guarantee this peg will always be maintained.</p>

<h2>3. Eligibility</h2>
<p>To use the Services, you must:</p>
<ul>
  <li>Be at least 18 years of age</li>
  <li>Be capable of forming a legally binding contract</li>
  <li>Not be prohibited from using the Services under applicable laws</li>
  <li>Complete our identity verification (KYC) process</li>
</ul>

<h2>4. Account Registration and Security</h2>
<p>4.1 You must provide accurate, current, and complete information during registration.</p>
<p>4.2 You are responsible for maintaining the confidentiality of your account credentials.</p>
<p>4.3 You must enable recommended security features (PIN, biometric authentication).</p>
<p>4.4 You must notify us immediately of any unauthorized access to your account.</p>

<h2>5. Fees and Charges</h2>
<p>5.1 We may charge fees for certain transactions. Current fees are displayed before you confirm each transaction.</p>
<p>5.2 Third-party fees (network fees, exchange fees) may apply and are your responsibility.</p>
<p>5.3 We reserve the right to change our fee structure with 30 days notice.</p>

<h2>6. Prohibited Activities</h2>
<p>You may not use the Services for:</p>
<ul>
  <li>Illegal activities or money laundering</li>
  <li>Fraud or deceptive practices</li>
  <li>Terrorism financing</li>
  <li>Circumventing financial sanctions</li>
  <li>Any activity that violates these Terms</li>
</ul>

<h2>7. Intellectual Property</h2>
<p>All content, features, and functionality of the Services are owned by JoonaPay and are protected by intellectual property laws.</p>

<h2>8. Disclaimers</h2>
<p>8.1 THE SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</p>
<p>8.2 We do not guarantee uninterrupted or error-free service.</p>
<p>8.3 Cryptocurrency values can be volatile. You assume all risks associated with holding digital assets.</p>

<h2>9. Limitation of Liability</h2>
<p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, JOONAPAY SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.</p>

<h2>10. Dispute Resolution</h2>
<p>Any disputes shall be resolved through binding arbitration in accordance with applicable arbitration rules.</p>

<h2>11. Governing Law</h2>
<p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which JoonaPay operates.</p>

<h2>12. Changes to Terms</h2>
<p>We may update these Terms from time to time. Continued use of the Services after changes constitutes acceptance of the new Terms.</p>

<h2>13. Contact Us</h2>
<p>For questions about these Terms, contact us at: <a href="mailto:legal@joonapay.com">legal@joonapay.com</a></p>
    `.trim();
  }

  private getPrivacyContent(): string {
    return `
JOONAPAY PRIVACY POLICY

Last Updated: January 15, 2024
Version: 1.1.0

1. INTRODUCTION

JoonaPay ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.

2. INFORMATION WE COLLECT

2.1 Personal Information
- Full name and date of birth
- Phone number and email address
- Government-issued ID (for KYC verification)
- Selfie/photo (for identity verification)
- Address and nationality

2.2 Financial Information
- Transaction history
- Wallet balances
- Bank account details (for cash-out)
- Payment preferences

2.3 Device Information
- Device type and operating system
- Device identifiers
- IP address
- App usage data

2.4 Biometric Data
- Fingerprint data (stored locally on your device)
- Face recognition data (stored locally on your device)
Note: Biometric data never leaves your device and is used only for authentication.

3. HOW WE USE YOUR INFORMATION

We use your information to:
- Provide and maintain our Services
- Process your transactions
- Verify your identity (KYC/AML compliance)
- Prevent fraud and enhance security
- Send you important notifications
- Improve our Services
- Comply with legal obligations

4. INFORMATION SHARING

We may share your information with:

4.1 Service Providers
- Payment processors
- Identity verification services
- Cloud storage providers
- Analytics providers

4.2 Legal Requirements
- Law enforcement agencies (when required)
- Regulatory authorities
- Courts and tribunals

4.3 Business Transfers
In the event of a merger, acquisition, or sale, your information may be transferred.

We DO NOT sell your personal information to third parties.

5. DATA SECURITY

We implement industry-standard security measures:
- End-to-end encryption for transactions
- Secure data storage with encryption at rest
- Regular security audits
- Access controls and authentication

6. DATA RETENTION

We retain your information for as long as necessary to:
- Provide our Services
- Comply with legal obligations
- Resolve disputes
- Enforce our agreements

7. YOUR RIGHTS

Depending on your location, you may have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data (subject to legal requirements)
- Export your data
- Opt-out of marketing communications

8. INTERNATIONAL TRANSFERS

Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place.

9. CHILDREN'S PRIVACY

Our Services are not intended for users under 18 years of age. We do not knowingly collect information from children.

10. CHANGES TO THIS POLICY

We may update this Privacy Policy from time to time. We will notify you of significant changes through the App or by email.

11. CONTACT US

For privacy-related questions:
Email: privacy@joonapay.com
    `.trim();
  }

  private getPrivacyContentHtml(): string {
    return `
<h1>JoonaPay Privacy Policy</h1>
<p><strong>Last Updated:</strong> January 15, 2024<br><strong>Version:</strong> 1.1.0</p>

<h2>1. Introduction</h2>
<p>JoonaPay ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and services.</p>

<h2>2. Information We Collect</h2>

<h3>2.1 Personal Information</h3>
<ul>
  <li>Full name and date of birth</li>
  <li>Phone number and email address</li>
  <li>Government-issued ID (for KYC verification)</li>
  <li>Selfie/photo (for identity verification)</li>
  <li>Address and nationality</li>
</ul>

<h3>2.2 Financial Information</h3>
<ul>
  <li>Transaction history</li>
  <li>Wallet balances</li>
  <li>Bank account details (for cash-out)</li>
  <li>Payment preferences</li>
</ul>

<h3>2.3 Device Information</h3>
<ul>
  <li>Device type and operating system</li>
  <li>Device identifiers</li>
  <li>IP address</li>
  <li>App usage data</li>
</ul>

<h3>2.4 Biometric Data</h3>
<ul>
  <li>Fingerprint data (stored locally on your device)</li>
  <li>Face recognition data (stored locally on your device)</li>
</ul>
<p><strong>Note:</strong> Biometric data never leaves your device and is used only for authentication.</p>

<h2>3. How We Use Your Information</h2>
<p>We use your information to:</p>
<ul>
  <li>Provide and maintain our Services</li>
  <li>Process your transactions</li>
  <li>Verify your identity (KYC/AML compliance)</li>
  <li>Prevent fraud and enhance security</li>
  <li>Send you important notifications</li>
  <li>Improve our Services</li>
  <li>Comply with legal obligations</li>
</ul>

<h2>4. Information Sharing</h2>
<p>We may share your information with:</p>

<h3>4.1 Service Providers</h3>
<ul>
  <li>Payment processors</li>
  <li>Identity verification services</li>
  <li>Cloud storage providers</li>
  <li>Analytics providers</li>
</ul>

<h3>4.2 Legal Requirements</h3>
<ul>
  <li>Law enforcement agencies (when required)</li>
  <li>Regulatory authorities</li>
  <li>Courts and tribunals</li>
</ul>

<h3>4.3 Business Transfers</h3>
<p>In the event of a merger, acquisition, or sale, your information may be transferred.</p>

<p><strong>We DO NOT sell your personal information to third parties.</strong></p>

<h2>5. Data Security</h2>
<p>We implement industry-standard security measures:</p>
<ul>
  <li>End-to-end encryption for transactions</li>
  <li>Secure data storage with encryption at rest</li>
  <li>Regular security audits</li>
  <li>Access controls and authentication</li>
</ul>

<h2>6. Data Retention</h2>
<p>We retain your information for as long as necessary to:</p>
<ul>
  <li>Provide our Services</li>
  <li>Comply with legal obligations</li>
  <li>Resolve disputes</li>
  <li>Enforce our agreements</li>
</ul>

<h2>7. Your Rights</h2>
<p>Depending on your location, you may have the right to:</p>
<ul>
  <li>Access your personal data</li>
  <li>Correct inaccurate data</li>
  <li>Delete your data (subject to legal requirements)</li>
  <li>Export your data</li>
  <li>Opt-out of marketing communications</li>
</ul>

<h2>8. International Transfers</h2>
<p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place.</p>

<h2>9. Children's Privacy</h2>
<p>Our Services are not intended for users under 18 years of age. We do not knowingly collect information from children.</p>

<h2>10. Changes to This Policy</h2>
<p>We may update this Privacy Policy from time to time. We will notify you of significant changes through the App or by email.</p>

<h2>11. Contact Us</h2>
<p>For privacy-related questions:<br>Email: <a href="mailto:privacy@joonapay.com">privacy@joonapay.com</a></p>
    `.trim();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT CONTENT (French)
  // ═══════════════════════════════════════════════════════════════════════════

  private getTermsContentFr(): string {
    return `
CONDITIONS D'UTILISATION DE JOONAPAY

Dernière mise à jour : 15 janvier 2024
Version : 1.2.0

1. ACCEPTATION DES CONDITIONS

En téléchargeant, installant ou utilisant l'application mobile JoonaPay ("Application") ou tout service connexe (collectivement, les "Services"), vous acceptez d'être lié par ces Conditions d'Utilisation ("Conditions").

2. DESCRIPTION DES SERVICES

JoonaPay fournit un service de portefeuille numérique qui vous permet de :
- Stocker, envoyer et recevoir des USDC (USD Coin)
- Convertir entre USDC et les devises locales prises en charge
- Effectuer des paiements aux commerçants et aux particuliers
- Accéder à votre historique de transactions

3. ÉLIGIBILITÉ

Pour utiliser les Services, vous devez :
- Avoir au moins 18 ans
- Être capable de former un contrat juridiquement contraignant
- Ne pas être interdit d'utiliser les Services en vertu des lois applicables
- Compléter notre processus de vérification d'identité (KYC)

Pour plus de détails, veuillez contacter : legal@joonapay.com
    `.trim();
  }

  private getTermsContentHtmlFr(): string {
    return `
<h1>Conditions d'Utilisation de JoonaPay</h1>
<p><strong>Dernière mise à jour :</strong> 15 janvier 2024<br><strong>Version :</strong> 1.2.0</p>

<h2>1. Acceptation des Conditions</h2>
<p>En téléchargeant, installant ou utilisant l'application mobile JoonaPay ("Application") ou tout service connexe (collectivement, les "Services"), vous acceptez d'être lié par ces Conditions d'Utilisation ("Conditions").</p>

<h2>2. Description des Services</h2>
<p>JoonaPay fournit un service de portefeuille numérique qui vous permet de :</p>
<ul>
  <li>Stocker, envoyer et recevoir des USDC (USD Coin)</li>
  <li>Convertir entre USDC et les devises locales prises en charge</li>
  <li>Effectuer des paiements aux commerçants et aux particuliers</li>
  <li>Accéder à votre historique de transactions</li>
</ul>

<h2>3. Éligibilité</h2>
<p>Pour utiliser les Services, vous devez :</p>
<ul>
  <li>Avoir au moins 18 ans</li>
  <li>Être capable de former un contrat juridiquement contraignant</li>
  <li>Ne pas être interdit d'utiliser les Services en vertu des lois applicables</li>
  <li>Compléter notre processus de vérification d'identité (KYC)</li>
</ul>

<p>Pour plus de détails, veuillez contacter : <a href="mailto:legal@joonapay.com">legal@joonapay.com</a></p>
    `.trim();
  }

  private getPrivacyContentFr(): string {
    return `
POLITIQUE DE CONFIDENTIALITÉ DE JOONAPAY

Dernière mise à jour : 15 janvier 2024
Version : 1.1.0

1. INTRODUCTION

JoonaPay ("nous", "notre" ou "nos") s'engage à protéger votre vie privée. Cette Politique de Confidentialité explique comment nous collectons, utilisons, divulguons et protégeons vos informations.

2. INFORMATIONS QUE NOUS COLLECTONS

2.1 Informations Personnelles
- Nom complet et date de naissance
- Numéro de téléphone et adresse e-mail
- Pièce d'identité (pour la vérification KYC)
- Photo/selfie (pour la vérification d'identité)

2.2 Données Biométriques
- Données d'empreintes digitales (stockées localement sur votre appareil)
- Données de reconnaissance faciale (stockées localement sur votre appareil)
Note : Les données biométriques ne quittent jamais votre appareil.

3. NOUS CONTACTER

Pour les questions relatives à la confidentialité :
Email : privacy@joonapay.com
    `.trim();
  }

  private getPrivacyContentHtmlFr(): string {
    return `
<h1>Politique de Confidentialité de JoonaPay</h1>
<p><strong>Dernière mise à jour :</strong> 15 janvier 2024<br><strong>Version :</strong> 1.1.0</p>

<h2>1. Introduction</h2>
<p>JoonaPay ("nous", "notre" ou "nos") s'engage à protéger votre vie privée. Cette Politique de Confidentialité explique comment nous collectons, utilisons, divulguons et protégeons vos informations.</p>

<h2>2. Informations Que Nous Collectons</h2>

<h3>2.1 Informations Personnelles</h3>
<ul>
  <li>Nom complet et date de naissance</li>
  <li>Numéro de téléphone et adresse e-mail</li>
  <li>Pièce d'identité (pour la vérification KYC)</li>
  <li>Photo/selfie (pour la vérification d'identité)</li>
</ul>

<h3>2.2 Données Biométriques</h3>
<ul>
  <li>Données d'empreintes digitales (stockées localement sur votre appareil)</li>
  <li>Données de reconnaissance faciale (stockées localement sur votre appareil)</li>
</ul>
<p><strong>Note :</strong> Les données biométriques ne quittent jamais votre appareil.</p>

<h2>3. Nous Contacter</h2>
<p>Pour les questions relatives à la confidentialité :<br>Email : <a href="mailto:privacy@joonapay.com">privacy@joonapay.com</a></p>
    `.trim();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COOKIE POLICY CONTENT (English)
  // ═══════════════════════════════════════════════════════════════════════════

  private getCookiePolicyContent(): string {
    return `
JOONAPAY COOKIE POLICY

Last Updated: January 15, 2024
Version: 1.0.0

1. INTRODUCTION

This Cookie Policy explains how JoonaPay uses cookies and similar technologies when you access our services.

2. WHAT ARE COOKIES?

Cookies are small text files stored on your device when you use our services. They help us provide essential functionality and improve your experience.

3. TYPES OF COOKIES WE USE

3.1 Essential Cookies (Required)
These cookies are necessary for our services to function:
- session_id: Maintains your authenticated session
- auth_token: JWT authentication token
- refresh_token: Token to refresh authentication
- csrf_token: Cross-site request forgery protection
- device_id: Device identification for security
- cookie_consent: Stores your cookie preferences

3.2 Security Cookies (Required)
- risk_session: Risk assessment for transactions
- step_up_token: Step-up authentication for sensitive actions
- lockout_counter: Tracks failed login attempts

3.3 Functional Cookies (Optional)
- locale: Language preference (English/French)
- theme: Dark/light mode preference
- currency_display: Reference currency preference

3.4 Analytics Cookies (Optional)
We may use analytics cookies to understand service usage. These are only set with your consent.

4. HOW TO MANAGE COOKIES

4.1 Cookie Banner
Use the cookie consent banner on first visit to manage preferences.

4.2 Browser Settings
Configure cookies through your browser's privacy settings.

4.3 Mobile Application
Manage data storage in Settings > Privacy > Data Preferences.

5. COOKIE SECURITY

All cookies use security best practices:
- Secure flag: Only transmitted over HTTPS
- HttpOnly: Authentication cookies not accessible by JavaScript
- SameSite: Protection against cross-site attacks
- Encryption: Sensitive data is encrypted

6. DATA RETENTION

- Session cookies: Deleted when browser closes
- Authentication tokens: 1 hour (access), 7 days (refresh)
- Preference cookies: 1 year
- Analytics cookies: Up to 2 years

7. THIRD-PARTY COOKIES

Our payment and verification partners may set their own cookies during transactions.

8. CONTACT US

For questions about cookies: privacy@joonapay.com
    `.trim();
  }

  private getCookiePolicyContentHtml(): string {
    return `
<h1>JoonaPay Cookie Policy</h1>
<p><strong>Last Updated:</strong> January 15, 2024<br><strong>Version:</strong> 1.0.0</p>

<h2>1. Introduction</h2>
<p>This Cookie Policy explains how JoonaPay uses cookies and similar technologies when you access our services.</p>

<h2>2. What Are Cookies?</h2>
<p>Cookies are small text files stored on your device when you use our services. They help us provide essential functionality and improve your experience.</p>

<h2>3. Types of Cookies We Use</h2>

<h3>3.1 Essential Cookies (Required)</h3>
<p>These cookies are necessary for our services to function:</p>
<table>
  <thead>
    <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
  </thead>
  <tbody>
    <tr><td><code>session_id</code></td><td>Maintains your authenticated session</td><td>Session</td></tr>
    <tr><td><code>auth_token</code></td><td>JWT authentication token</td><td>1 hour</td></tr>
    <tr><td><code>refresh_token</code></td><td>Token to refresh authentication</td><td>7 days</td></tr>
    <tr><td><code>csrf_token</code></td><td>Cross-site request forgery protection</td><td>Session</td></tr>
    <tr><td><code>device_id</code></td><td>Device identification for security</td><td>1 year</td></tr>
    <tr><td><code>cookie_consent</code></td><td>Stores your cookie preferences</td><td>1 year</td></tr>
  </tbody>
</table>

<h3>3.2 Security Cookies (Required)</h3>
<ul>
  <li><strong>risk_session:</strong> Risk assessment for transactions</li>
  <li><strong>step_up_token:</strong> Step-up authentication for sensitive actions</li>
  <li><strong>lockout_counter:</strong> Tracks failed login attempts</li>
</ul>

<h3>3.3 Functional Cookies (Optional)</h3>
<ul>
  <li><strong>locale:</strong> Language preference (English/French)</li>
  <li><strong>theme:</strong> Dark/light mode preference</li>
  <li><strong>currency_display:</strong> Reference currency preference</li>
</ul>

<h3>3.4 Analytics Cookies (Optional)</h3>
<p>We may use analytics cookies to understand service usage. These are only set with your consent.</p>

<h2>4. How to Manage Cookies</h2>

<h3>4.1 Cookie Banner</h3>
<p>Use the cookie consent banner on first visit to manage preferences.</p>

<h3>4.2 Browser Settings</h3>
<p>Configure cookies through your browser's privacy settings.</p>

<h3>4.3 Mobile Application</h3>
<p>Manage data storage in Settings > Privacy > Data Preferences.</p>

<h2>5. Cookie Security</h2>
<p>All cookies use security best practices:</p>
<ul>
  <li><strong>Secure flag:</strong> Only transmitted over HTTPS</li>
  <li><strong>HttpOnly:</strong> Authentication cookies not accessible by JavaScript</li>
  <li><strong>SameSite:</strong> Protection against cross-site attacks</li>
  <li><strong>Encryption:</strong> Sensitive data is encrypted</li>
</ul>

<h2>6. Data Retention</h2>
<ul>
  <li>Session cookies: Deleted when browser closes</li>
  <li>Authentication tokens: 1 hour (access), 7 days (refresh)</li>
  <li>Preference cookies: 1 year</li>
  <li>Analytics cookies: Up to 2 years</li>
</ul>

<h2>7. Third-Party Cookies</h2>
<p>Our payment and verification partners may set their own cookies during transactions.</p>

<h2>8. Contact Us</h2>
<p>For questions about cookies: <a href="mailto:privacy@joonapay.com">privacy@joonapay.com</a></p>
    `.trim();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COOKIE POLICY CONTENT (French)
  // ═══════════════════════════════════════════════════════════════════════════

  private getCookiePolicyContentFr(): string {
    return `
POLITIQUE DE COOKIES JOONAPAY

Dernière mise à jour : 15 janvier 2024
Version : 1.0.0

1. INTRODUCTION

Cette Politique de Cookies explique comment JoonaPay utilise les cookies et technologies similaires lorsque vous accédez à nos services.

2. QU'EST-CE QU'UN COOKIE ?

Les cookies sont de petits fichiers texte stockés sur votre appareil lorsque vous utilisez nos services. Ils nous aident à fournir des fonctionnalités essentielles et à améliorer votre expérience.

3. TYPES DE COOKIES UTILISÉS

3.1 Cookies Essentiels (Obligatoires)
Ces cookies sont nécessaires au fonctionnement de nos services :
- session_id : Maintient votre session authentifiée
- auth_token : Jeton d'authentification JWT
- refresh_token : Jeton de rafraîchissement
- csrf_token : Protection contre les attaques CSRF
- device_id : Identification de l'appareil pour la sécurité
- cookie_consent : Stocke vos préférences de cookies

3.2 Cookies de Sécurité (Obligatoires)
- risk_session : Évaluation des risques pour les transactions
- step_up_token : Authentification renforcée pour les actions sensibles
- lockout_counter : Suivi des tentatives de connexion échouées

3.3 Cookies Fonctionnels (Optionnels)
- locale : Préférence de langue (Anglais/Français)
- theme : Préférence de thème sombre/clair
- currency_display : Devise de référence préférée

3.4 Cookies Analytiques (Optionnels)
Nous pouvons utiliser des cookies analytiques pour comprendre l'utilisation du service. Ils ne sont définis qu'avec votre consentement.

4. GESTION DES COOKIES

4.1 Bannière de Cookies
Utilisez la bannière de consentement lors de votre première visite.

4.2 Paramètres du Navigateur
Configurez les cookies via les paramètres de confidentialité de votre navigateur.

4.3 Application Mobile
Gérez le stockage des données dans Paramètres > Confidentialité > Préférences de données.

5. SÉCURITÉ DES COOKIES

Tous nos cookies utilisent les meilleures pratiques de sécurité :
- Drapeau Secure : Transmis uniquement via HTTPS
- HttpOnly : Cookies d'authentification non accessibles par JavaScript
- SameSite : Protection contre les attaques cross-site
- Chiffrement : Les données sensibles sont chiffrées

6. CONSERVATION DES DONNÉES

- Cookies de session : Supprimés à la fermeture du navigateur
- Jetons d'authentification : 1 heure (accès), 7 jours (rafraîchissement)
- Cookies de préférences : 1 an
- Cookies analytiques : Jusqu'à 2 ans

7. COOKIES TIERS

Nos partenaires de paiement et de vérification peuvent définir leurs propres cookies lors des transactions.

8. NOUS CONTACTER

Pour les questions sur les cookies : privacy@joonapay.com
    `.trim();
  }

  private getCookiePolicyContentHtmlFr(): string {
    return `
<h1>Politique de Cookies JoonaPay</h1>
<p><strong>Dernière mise à jour :</strong> 15 janvier 2024<br><strong>Version :</strong> 1.0.0</p>

<h2>1. Introduction</h2>
<p>Cette Politique de Cookies explique comment JoonaPay utilise les cookies et technologies similaires lorsque vous accédez à nos services.</p>

<h2>2. Qu'est-ce qu'un Cookie ?</h2>
<p>Les cookies sont de petits fichiers texte stockés sur votre appareil lorsque vous utilisez nos services. Ils nous aident à fournir des fonctionnalités essentielles et à améliorer votre expérience.</p>

<h2>3. Types de Cookies Utilisés</h2>

<h3>3.1 Cookies Essentiels (Obligatoires)</h3>
<p>Ces cookies sont nécessaires au fonctionnement de nos services :</p>
<table>
  <thead>
    <tr><th>Cookie</th><th>Objectif</th><th>Durée</th></tr>
  </thead>
  <tbody>
    <tr><td><code>session_id</code></td><td>Maintient votre session authentifiée</td><td>Session</td></tr>
    <tr><td><code>auth_token</code></td><td>Jeton d'authentification JWT</td><td>1 heure</td></tr>
    <tr><td><code>refresh_token</code></td><td>Jeton de rafraîchissement</td><td>7 jours</td></tr>
    <tr><td><code>csrf_token</code></td><td>Protection contre les attaques CSRF</td><td>Session</td></tr>
    <tr><td><code>device_id</code></td><td>Identification de l'appareil</td><td>1 an</td></tr>
    <tr><td><code>cookie_consent</code></td><td>Stocke vos préférences</td><td>1 an</td></tr>
  </tbody>
</table>

<h3>3.2 Cookies de Sécurité (Obligatoires)</h3>
<ul>
  <li><strong>risk_session :</strong> Évaluation des risques pour les transactions</li>
  <li><strong>step_up_token :</strong> Authentification renforcée pour les actions sensibles</li>
  <li><strong>lockout_counter :</strong> Suivi des tentatives de connexion échouées</li>
</ul>

<h3>3.3 Cookies Fonctionnels (Optionnels)</h3>
<ul>
  <li><strong>locale :</strong> Préférence de langue (Anglais/Français)</li>
  <li><strong>theme :</strong> Préférence de thème sombre/clair</li>
  <li><strong>currency_display :</strong> Devise de référence préférée</li>
</ul>

<h3>3.4 Cookies Analytiques (Optionnels)</h3>
<p>Nous pouvons utiliser des cookies analytiques pour comprendre l'utilisation du service. Ils ne sont définis qu'avec votre consentement.</p>

<h2>4. Gestion des Cookies</h2>

<h3>4.1 Bannière de Cookies</h3>
<p>Utilisez la bannière de consentement lors de votre première visite.</p>

<h3>4.2 Paramètres du Navigateur</h3>
<p>Configurez les cookies via les paramètres de confidentialité de votre navigateur.</p>

<h3>4.3 Application Mobile</h3>
<p>Gérez le stockage des données dans Paramètres > Confidentialité > Préférences de données.</p>

<h2>5. Sécurité des Cookies</h2>
<ul>
  <li><strong>Drapeau Secure :</strong> Transmis uniquement via HTTPS</li>
  <li><strong>HttpOnly :</strong> Cookies d'authentification non accessibles par JavaScript</li>
  <li><strong>SameSite :</strong> Protection contre les attaques cross-site</li>
  <li><strong>Chiffrement :</strong> Les données sensibles sont chiffrées</li>
</ul>

<h2>6. Conservation des Données</h2>
<ul>
  <li>Cookies de session : Supprimés à la fermeture du navigateur</li>
  <li>Jetons d'authentification : 1 heure (accès), 7 jours (rafraîchissement)</li>
  <li>Cookies de préférences : 1 an</li>
  <li>Cookies analytiques : Jusqu'à 2 ans</li>
</ul>

<h2>7. Cookies Tiers</h2>
<p>Nos partenaires de paiement et de vérification peuvent définir leurs propres cookies lors des transactions.</p>

<h2>8. Nous Contacter</h2>
<p>Pour les questions sur les cookies : <a href="mailto:privacy@joonapay.com">privacy@joonapay.com</a></p>
    `.trim();
  }
}
