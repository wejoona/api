/**
 * Template Renderer Service
 * Renders notification templates with localization support
 */

import { Injectable, Logger } from '@nestjs/common';

// Notification templates
const TEMPLATES: Record<
  string,
  {
    title: Record<string, string>;
    body: Record<string, string>;
  }
> = {
  // Transaction templates
  'transaction.deposit.received': {
    title: {
      en: 'Deposit Received',
      fr: 'Dépôt Reçu',
    },
    body: {
      en: 'You have received {{amount}} {{currency}}. Your new balance is {{balance}} {{currency}}.',
      fr: 'Vous avez reçu {{amount}} {{currency}}. Votre nouveau solde est de {{balance}} {{currency}}.',
    },
  },
  'transaction.transfer.sent': {
    title: {
      en: 'Transfer Sent',
      fr: 'Transfert Envoyé',
    },
    body: {
      en: 'You sent {{amount}} {{currency}} to {{recipientName}}.',
      fr: 'Vous avez envoyé {{amount}} {{currency}} à {{recipientName}}.',
    },
  },
  'transaction.transfer.received': {
    title: {
      en: 'Money Received',
      fr: 'Argent Reçu',
    },
    body: {
      en: '{{senderName}} sent you {{amount}} {{currency}}.',
      fr: '{{senderName}} vous a envoyé {{amount}} {{currency}}.',
    },
  },
  'transaction.withdrawal.completed': {
    title: {
      en: 'Withdrawal Completed',
      fr: 'Retrait Terminé',
    },
    body: {
      en: 'Your withdrawal of {{amount}} {{currency}} has been completed.',
      fr: 'Votre retrait de {{amount}} {{currency}} a été effectué.',
    },
  },
  'transaction.withdrawal.failed': {
    title: {
      en: 'Withdrawal Failed',
      fr: 'Échec du Retrait',
    },
    body: {
      en: 'Your withdrawal of {{amount}} {{currency}} could not be processed. Reason: {{reason}}',
      fr: "Votre retrait de {{amount}} {{currency}} n'a pas pu être traité. Raison: {{reason}}",
    },
  },

  // KYC templates
  'kyc.submitted': {
    title: {
      en: 'KYC Documents Submitted',
      fr: 'Documents KYC Soumis',
    },
    body: {
      en: 'Your KYC documents have been submitted and are being reviewed.',
      fr: 'Vos documents KYC ont été soumis et sont en cours de vérification.',
    },
  },
  'kyc.approved': {
    title: {
      en: 'KYC Approved',
      fr: 'KYC Approuvé',
    },
    body: {
      en: 'Congratulations! Your identity has been verified. You now have full access to all features.',
      fr: 'Félicitations ! Votre identité a été vérifiée. Vous avez maintenant accès à toutes les fonctionnalités.',
    },
  },
  'kyc.rejected': {
    title: {
      en: 'KYC Review Required',
      fr: 'Révision KYC Requise',
    },
    body: {
      en: 'We could not verify your documents. Reason: {{reason}}. Please resubmit.',
      fr: "Nous n'avons pas pu vérifier vos documents. Raison: {{reason}}. Veuillez resoumettre.",
    },
  },

  // Security templates
  'security.login.new_device': {
    title: {
      en: 'New Device Login',
      fr: 'Connexion Nouvel Appareil',
    },
    body: {
      en: "A new device logged into your account from {{location}}. If this wasn't you, please secure your account immediately.",
      fr: "Un nouvel appareil s'est connecté à votre compte depuis {{location}}. Si ce n'était pas vous, sécurisez votre compte immédiatement.",
    },
  },
  'security.password.changed': {
    title: {
      en: 'Password Changed',
      fr: 'Mot de Passe Modifié',
    },
    body: {
      en: "Your password was changed successfully. If you didn't make this change, contact support immediately.",
      fr: "Votre mot de passe a été modifié avec succès. Si vous n'avez pas effectué ce changement, contactez le support immédiatement.",
    },
  },

  // Risk templates
  'risk.transaction.blocked': {
    title: {
      en: 'Transaction Blocked',
      fr: 'Transaction Bloquée',
    },
    body: {
      en: 'Your transaction was blocked for security reasons. Please contact support if you believe this is an error.',
      fr: "Votre transaction a été bloquée pour des raisons de sécurité. Contactez le support si vous pensez qu'il s'agit d'une erreur.",
    },
  },
  'risk.step_up.required': {
    title: {
      en: 'Additional Verification Required',
      fr: 'Vérification Supplémentaire Requise',
    },
    body: {
      en: 'Please complete additional verification to proceed with your transaction.',
      fr: 'Veuillez effectuer une vérification supplémentaire pour procéder à votre transaction.',
    },
  },

  // Referral templates
  'referral.signed_up': {
    title: {
      en: 'New Referral',
      fr: 'Nouveau Parrainage',
    },
    body: {
      en: "{{refereeName}} signed up using your referral code! You'll receive your reward once they complete KYC.",
      fr: "{{refereeName}} s'est inscrit avec votre code de parrainage ! Vous recevrez votre récompense une fois qu'il aura complété le KYC.",
    },
  },
  'referral.reward.earned': {
    title: {
      en: 'Reward Earned!',
      fr: 'Récompense Gagnée !',
    },
    body: {
      en: "You've earned {{amount}} {{currency}} from your referral. Check your rewards balance.",
      fr: 'Vous avez gagné {{amount}} {{currency}} grâce à votre parrainage. Vérifiez votre solde de récompenses.',
    },
  },
  'referral.reward.credited': {
    title: {
      en: 'Reward Credited',
      fr: 'Récompense Créditée',
    },
    body: {
      en: '{{amount}} {{currency}} has been added to your wallet from referral rewards.',
      fr: '{{amount}} {{currency}} a été ajouté à votre portefeuille grâce aux récompenses de parrainage.',
    },
  },

  // Scheduled payment templates
  'scheduled.payment.upcoming': {
    title: {
      en: 'Upcoming Scheduled Payment',
      fr: 'Paiement Programmé à Venir',
    },
    body: {
      en: 'Reminder: A payment of {{amount}} {{currency}} to {{recipientName}} is scheduled for {{date}}.',
      fr: 'Rappel: Un paiement de {{amount}} {{currency}} à {{recipientName}} est programmé pour le {{date}}.',
    },
  },
  'scheduled.payment.executed': {
    title: {
      en: 'Scheduled Payment Sent',
      fr: 'Paiement Programmé Envoyé',
    },
    body: {
      en: 'Your scheduled payment of {{amount}} {{currency}} to {{recipientName}} has been sent.',
      fr: 'Votre paiement programmé de {{amount}} {{currency}} à {{recipientName}} a été envoyé.',
    },
  },
  'scheduled.payment.failed': {
    title: {
      en: 'Scheduled Payment Failed',
      fr: 'Échec du Paiement Programmé',
    },
    body: {
      en: 'Your scheduled payment of {{amount}} {{currency}} to {{recipientName}} failed. Reason: {{reason}}',
      fr: 'Votre paiement programmé de {{amount}} {{currency}} à {{recipientName}} a échoué. Raison: {{reason}}',
    },
  },
  'scheduled.payment.low_balance': {
    title: {
      en: 'Low Balance Warning',
      fr: 'Avertissement Solde Faible',
    },
    body: {
      en: 'Your upcoming payment of {{amount}} {{currency}} may fail due to insufficient balance. Please fund your account.',
      fr: "Votre prochain paiement de {{amount}} {{currency}} pourrait échouer en raison d'un solde insuffisant. Veuillez alimenter votre compte.",
    },
  },
};

export interface RenderedTemplate {
  title: string;
  body: string;
}

@Injectable()
export class TemplateRendererService {
  private readonly logger = new Logger(TemplateRendererService.name);

  /**
   * Render a notification template
   */
  async render(
    templateId: string,
    data: Record<string, any>,
    language: string = 'en',
  ): Promise<RenderedTemplate> {
    const template = TEMPLATES[templateId];
    if (!template) {
      this.logger.warn(`Template not found: ${templateId}, using fallback`);
      return {
        title: data.title || 'Notification',
        body: data.body || '',
      };
    }

    const title = this.renderString(
      template.title[language] || template.title['en'],
      data,
    );

    const body = this.renderString(
      template.body[language] || template.body['en'],
      data,
    );

    return { title, body };
  }

  /**
   * Get available templates
   */
  getAvailableTemplates(): string[] {
    return Object.keys(TEMPLATES);
  }

  /**
   * Check if template exists
   */
  templateExists(templateId: string): boolean {
    return templateId in TEMPLATES;
  }

  /**
   * Render a string with data placeholders
   */
  private renderString(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = data[key];
      if (value === undefined || value === null) {
        this.logger.warn(`Missing template variable: ${key}`);
        return match;
      }
      return String(value);
    });
  }
}
