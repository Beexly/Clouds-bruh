import type { Metadata } from 'next';
import { LegalDoc, Section } from '../../../components/LegalDoc';
import { BRAND } from '../../../lib/brand';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <LegalDoc title="Terms of Service" updated="June 7, 2026">
      <p>
        These terms govern access to {BRAND}, use of the Broadcast, and purchases made through the site. By
        browsing, creating an account, or placing an order, you agree to these terms and to the policies linked
        at checkout.
      </p>
      <Section title="Accounts">
        <p>
          You are responsible for your account activity and for keeping sign-in credentials secure. You must be
          old enough to enter a binding purchase contract in your location and must provide accurate order,
          payment, and delivery information.
        </p>
      </Section>
      <Section title="Orders and pricing">
        <p>
          Orders are subject to acceptance, payment authorization, supplier availability, fraud screening, and
          fulfillment verification. Prices, discounts, stock, and delivery estimates may change before checkout
          is completed. If an item is unavailable, mispriced, restricted, or cannot be fulfilled safely, the
          order may be canceled and refunded.
        </p>
      </Section>
      <Section title="Supplier fulfillment">
        <p>
          Some items are fulfilled by vetted third-party suppliers or print-on-demand partners. The product page
          and checkout show the available fulfillment promise before payment. If a supplier cannot meet the
          stated promise, Lumera will provide a delay notice, replacement option, or refund path.
        </p>
      </Section>
      <Section title="Payments">
        <p>
          Payments are processed by Stripe or another checkout provider shown during purchase. Lumera does not
          store full card numbers. By submitting payment, you authorize the order total, including listed taxes,
          shipping, and fees.
        </p>
      </Section>
      <Section title="Lumens and Luminance">
        <p>
          Store credit, rewards, and loyalty features have no cash value, are not transferable, and may be
          adjusted for refunds, chargebacks, abuse, technical error, or program changes. Reward availability may
          vary by product, customer status, or promotion.
        </p>
      </Section>
      <Section title="Intellectual property">
        <p>
          The {BRAND} name, Broadcast experience, product presentation, site copy, imagery created for Lumera,
          and interface design are owned by Lumera or licensed for use by Lumera. Product brands, supplier
          marks, and third-party media remain the property of their respective owners.
        </p>
      </Section>
      <Section title="Acceptable use">
        <p>
          You may not misuse the site, interfere with checkout, scrape private systems, submit fraudulent
          orders, abuse promotions, or use Lumera to violate applicable law or third-party rights.
        </p>
      </Section>
      <Section title="Disclaimers and liability">
        <p>
          Lumera is provided on a commercially reasonable basis. To the fullest extent allowed by law, Lumera is
          not liable for indirect, incidental, special, or consequential damages. For a purchase dispute, the
          maximum direct liability is limited to the amount paid for the affected order, except where law
          requires a different result.
        </p>
      </Section>
      <Section title="Governing law">
        <p>
          These terms are governed by the laws of the United States and the state connected to Lumera&apos;s
          principal place of business, without applying conflict-of-law rules. Consumer rights that cannot be
          waived in your location remain in effect.
        </p>
      </Section>
      <Section title="Contact">
        <p>For terms, account, or order questions, contact Lumera support through the email listed in your order confirmation.</p>
      </Section>
    </LegalDoc>
  );
}
