import type { Metadata } from 'next';
import { LegalDoc, Section } from '../../../components/LegalDoc';
import { BRAND, LEGAL_ENTITY } from '../../../lib/brand';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" updated="[date]">
      <p>
        These terms govern your use of {BRAND} and any purchase you make through the Broadcast. {BRAND} is owned
        and operated by {LEGAL_ENTITY} (&quot;we&quot;). By using the site you agree to them. We may update these
        terms; material changes will be posted here.
      </p>
      <Section title="Accounts">
        <p>You are responsible for your account and for keeping your credentials secure. You must be of legal age in your jurisdiction to purchase.</p>
      </Section>
      <Section title="Orders &amp; pricing">
        <p>
          All orders are subject to acceptance and availability; drops are limited and may sell out. Prices and
          availability can change before an order is placed. We may cancel and refund an order if it was listed
          in error.
        </p>
      </Section>
      <Section title="Payments">
        <p>Payments are processed by [Stripe]. By paying you authorize the charge for the order total, including any taxes and shipping shown at checkout.</p>
      </Section>
      <Section title="Lumens &amp; Luminance">
        <p>Lumens (store credit) and Luminance (loyalty) have no cash value, are non-transferable, and may expire or change per program rules. [State your program terms.]</p>
      </Section>
      <Section title="Intellectual property">
        <p>The {BRAND} name, the Broadcast, site content, and design are owned by {LEGAL_ENTITY} or its licensors. Brands sold on Lumera retain their own marks.</p>
      </Section>
      <Section title="Disclaimers &amp; liability">
        <p>
          The service is provided &quot;as is.&quot; To the maximum extent permitted by law, our liability is
          limited to the amount you paid for the order at issue. [Adjust for consumer-protection law in your
          jurisdiction.]
        </p>
      </Section>
      <Section title="Governing law">
        <p>These terms are governed by the laws of [jurisdiction], without regard to conflict-of-law rules. Disputes will be handled in [venue].</p>
      </Section>
      <Section title="Contact">
        <p>[legal@lumera.example] · {LEGAL_ENTITY} [registered address].</p>
      </Section>
    </LegalDoc>
  );
}
