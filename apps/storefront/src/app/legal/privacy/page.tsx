import type { Metadata } from 'next';
import { LegalDoc, Section } from '../../../components/LegalDoc';
import { BRAND, LEGAL_ENTITY } from '../../../lib/brand';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated="[date]">
      <p>
        This policy explains how {BRAND} (operated by {LEGAL_ENTITY}, &quot;we&quot;) collects, uses, and
        protects your information when you use the Broadcast and make purchases.
      </p>
      <Section title="Information we collect">
        <p>
          Order and account details (name, email, shipping/billing address); payment confirmations from our
          processor; and behavioral signals (pages viewed, items saved, searches) used to personalize your
          experience. We never store full card numbers.
        </p>
      </Section>
      <Section title="How we use it">
        <p>
          To fulfil orders, personalize the Broadcast and recommendations, run loyalty (Lumens / Luminance),
          prevent fraud, and improve the service. [Add any marketing/email use and the legal basis if you
          serve the EU/UK.]
        </p>
      </Section>
      <Section title="Sharing">
        <p>
          With the providers who run the platform for us — payments ([Stripe]), hosting/infrastructure
          ([Medusa Cloud / Vercel]), and analytics — under contract and only as needed. We do not sell
          personal data. [List your sub-processors.]
        </p>
      </Section>
      <Section title="Cookies">
        <p>
          We use a visitor identifier and essential cookies to keep your cart and personalize content. [Add
          cookie-consent details for your jurisdiction.]
        </p>
      </Section>
      <Section title="Your rights">
        <p>
          You may request access, correction, deletion, or export of your data, and opt out of marketing.
          [Adjust to GDPR / CCPA as applicable.] Contact us to exercise these rights.
        </p>
      </Section>
      <Section title="Contact">
        <p>[privacy@lumera.example] · {LEGAL_ENTITY} [registered address].</p>
      </Section>
    </LegalDoc>
  );
}
