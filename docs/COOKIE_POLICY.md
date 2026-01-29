# JoonaPay Cookie Policy

**Last Updated:** January 2024
**Version:** 1.0.0
**Effective Date:** January 1, 2024

---

## 1. Introduction

This Cookie Policy explains how JoonaPay ("we," "us," or "our") uses cookies and similar technologies when you access our services through our website, mobile application, or admin dashboard. This policy should be read alongside our [Privacy Policy](/privacy-policy) and [Terms of Service](/terms-of-service).

By using our services, you consent to the use of cookies as described in this policy. If you do not agree to the use of cookies, you should adjust your browser settings accordingly or refrain from using our services.

---

## 2. What Are Cookies?

Cookies are small text files that are stored on your device (computer, tablet, or mobile phone) when you visit a website. They are widely used to make websites work efficiently, provide security features, and give us information about how users interact with our services.

### Types of Technologies We Use

- **Cookies:** Small text files stored in your browser
- **Local Storage:** Data stored in your browser for longer-term persistence
- **Session Storage:** Temporary data stored for the duration of your session
- **Secure Storage:** Encrypted storage for sensitive authentication tokens (mobile app)

---

## 3. Cookies We Use

### 3.1 Essential Cookies (Required)

These cookies are strictly necessary for our services to function. They cannot be disabled.

| Cookie Name | Purpose | Duration | Type |
|------------|---------|----------|------|
| `session_id` | Maintains your authenticated session | Session | First-party |
| `auth_token` | JWT authentication token | 1 hour | First-party |
| `refresh_token` | Token to refresh authentication | 7 days | First-party |
| `device_id` | Identifies your device for security | 1 year | First-party |
| `csrf_token` | Cross-site request forgery protection | Session | First-party |
| `cookie_consent` | Stores your cookie preferences | 1 year | First-party |

**Why These Are Essential:**
- Without session cookies, you would need to log in on every page
- Authentication tokens ensure secure access to your wallet
- CSRF tokens protect against malicious attacks
- Device identification helps detect unauthorized access

### 3.2 Security Cookies (Required)

These cookies protect your account and transactions.

| Cookie Name | Purpose | Duration | Type |
|------------|---------|----------|------|
| `risk_session` | Risk assessment for transactions | Session | First-party |
| `step_up_token` | Step-up authentication for sensitive actions | 5 minutes | First-party |
| `lockout_counter` | Tracks failed login attempts | 15 minutes | First-party |
| `biometric_enabled` | Biometric authentication preference | Persistent | First-party |

### 3.3 Functional Cookies (Optional)

These cookies remember your preferences to enhance your experience.

| Cookie Name | Purpose | Duration | Type |
|------------|---------|----------|------|
| `locale` | Your language preference (en/fr) | 1 year | First-party |
| `theme` | Dark/light mode preference | 1 year | First-party |
| `currency_display` | Reference currency preference | 1 year | First-party |
| `last_recipient` | Recently used recipients | 30 days | First-party |

### 3.4 Analytics Cookies (Optional)

We may use analytics cookies to understand how users interact with our services.

| Cookie Name | Purpose | Duration | Type |
|------------|---------|----------|------|
| `_ga` | Google Analytics visitor tracking | 2 years | Third-party |
| `_gid` | Google Analytics session tracking | 24 hours | Third-party |
| `_gat` | Google Analytics rate limiting | 1 minute | Third-party |

**Note:** Analytics cookies are only set if you have consented to non-essential cookies.

---

## 4. Third-Party Cookies

### 4.1 Payment Providers

When processing transactions, our payment partners may set cookies:

- **Yellow Card:** Mobile money transaction processing
- **Circle:** USDC cryptocurrency operations

These partners have their own cookie policies that apply when you use their services.

### 4.2 Identity Verification (KYC)

Our identity verification partners may set cookies during the verification process:

- **Identity verification provider:** Document and selfie verification

### 4.3 Customer Support

If you use our customer support chat, the support platform may set cookies to maintain your conversation history.

---

## 5. How to Manage Cookies

### 5.1 Cookie Consent Banner

When you first visit our dashboard, you will see a cookie consent banner. You can:
- **Accept All:** Enable all cookies including analytics
- **Essential Only:** Only enable required cookies
- **Customize:** Choose which categories to enable

### 5.2 Browser Settings

You can control cookies through your browser settings:

**Google Chrome:**
Settings > Privacy and Security > Cookies and other site data

**Mozilla Firefox:**
Settings > Privacy & Security > Cookies and Site Data

**Safari:**
Preferences > Privacy > Cookies and website data

**Microsoft Edge:**
Settings > Cookies and site permissions > Cookies and site data

### 5.3 Mobile Application

In our mobile app, you can manage data storage preferences:
Settings > Privacy > Data Preferences

Note: Essential storage for authentication cannot be disabled in the mobile app.

### 5.4 Opt-Out Links

To opt out of specific third-party cookies:
- Google Analytics: [tools.google.com/dlpage/gaoptout](https://tools.google.com/dlpage/gaoptout)

---

## 6. Impact of Disabling Cookies

### Essential Cookies
If you block essential cookies:
- You will not be able to log in to your account
- Transactions will fail
- Security features will not work

### Functional Cookies
If you block functional cookies:
- Language preferences will not be saved
- Theme preferences will reset
- You may need to re-enter information

### Analytics Cookies
If you block analytics cookies:
- No impact on functionality
- We will have less insight into service improvements

---

## 7. Cookie Security

### 7.1 Security Measures

All our cookies use security best practices:

- **Secure Flag:** Cookies are only transmitted over HTTPS
- **HttpOnly Flag:** Authentication cookies cannot be accessed by JavaScript
- **SameSite Attribute:** Protection against cross-site request forgery
- **Encryption:** Sensitive data in cookies is encrypted

### 7.2 Cookie Attributes

| Attribute | Purpose |
|-----------|---------|
| `Secure` | Only sent over HTTPS connections |
| `HttpOnly` | Not accessible via JavaScript (prevents XSS attacks) |
| `SameSite=Strict` | Only sent with same-site requests |
| `SameSite=Lax` | Sent with same-site requests and top-level navigations |

---

## 8. Data Retention

| Cookie Type | Retention Period |
|-------------|-----------------|
| Session cookies | Deleted when you close your browser |
| Authentication tokens | 1 hour (access), 7 days (refresh) |
| Preference cookies | 1 year |
| Analytics cookies | Up to 2 years (as per provider policy) |

---

## 9. Updates to This Policy

We may update this Cookie Policy from time to time. When we make changes:
- We will update the "Last Updated" date
- For significant changes, we will notify you via email or in-app notification
- Continued use of our services after changes constitutes acceptance

---

## 10. Regional Compliance

### 10.1 European Union (GDPR)

If you are in the EU, you have the right to:
- Access information about cookies we use
- Withdraw consent at any time
- Request deletion of cookie data

### 10.2 West Africa (ECOWAS)

We comply with data protection regulations applicable in:
- Cote d'Ivoire (Loi n 2013-450)
- Senegal (Loi n 2008-12)
- Other ECOWAS member states

### 10.3 ePrivacy Directive

We comply with the ePrivacy Directive requirements for:
- Obtaining consent before setting non-essential cookies
- Providing clear information about cookie purposes
- Allowing easy withdrawal of consent

---

## 11. Contact Us

If you have questions about this Cookie Policy:

**Email:** privacy@joonapay.com

**Data Protection Officer:**
JoonaPay DPO
Email: dpo@joonapay.com

**Postal Address:**
JoonaPay
Abidjan, Cote d'Ivoire

---

## 12. Definitions

| Term | Definition |
|------|------------|
| **First-party cookie** | Cookie set by JoonaPay directly |
| **Third-party cookie** | Cookie set by external services we use |
| **Session cookie** | Temporary cookie deleted when you close your browser |
| **Persistent cookie** | Cookie that remains until expiration or deletion |
| **JWT** | JSON Web Token, a secure method of transmitting information |
| **CSRF** | Cross-Site Request Forgery, a type of security attack |

---

*This Cookie Policy is provided in English and French. In case of discrepancy, the English version prevails.*

---

# Politique de Cookies JoonaPay

**Derniere mise a jour:** Janvier 2024
**Version:** 1.0.0

## Resume

JoonaPay utilise des cookies pour:
- **Cookies essentiels:** Connexion securisee et fonctionnement du service
- **Cookies fonctionnels:** Sauvegarde de vos preferences (langue, theme)
- **Cookies analytiques:** Amelioration de nos services (optionnel)

Vous pouvez gerer vos preferences de cookies a tout moment via la banniere de consentement ou les parametres de votre navigateur.

Pour toute question: privacy@joonapay.com

---

*Copyright 2024 JoonaPay. Tous droits reserves.*
