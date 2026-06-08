import type { Metadata } from 'next';
import { LegalDoc, Section } from '../../../components/LegalDoc';
import { BRAND } from '../../../lib/brand';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <LegalDoc title="Privacy Policy" updated="June 7, 2026">
      <p>
        This policy explains how {BRAND} collects, uses, shares, and protects information when you browse the
        site, use the Broadcast, create an account, contact support, or place an order.
      </p>
      <Section title="Information we collect">
        <p>
          Lumera may collect account details, contact details, shipping and billing information, order history,
          support messages, cart activity, saved items, product views, searches, referral details, approximate
          location, device data, and checkout events. Payment providers process card details directly; Lumera
          receives payment status and limited transaction references.
        </p>
      </Section>
      <Section title="How we use information">
        <p>
          Information is used to operate checkout, fulfill orders, provide support, prevent fraud, manage
          returns, personalize recommendations, operate loyalty features, improve merchandising, secure the
          service, comply with law, and send transactional messages. Marketing messages are sent only where
          permitted and can be opted out of.
        </p>
      </Section>
      <Section title="Sharing">
        <p>
          Lumera shares information with service providers that support checkout, fraud review, hosting,
          analytics, fulfillment, shipping, email, customer support, tax calculation, and legal compliance. These
          providers may use information only to provide services to Lumera or as otherwise required by law.
          Lumera does not sell personal information.
        </p>
      </Section>
      <Section title="Cookies and personalization">
        <p>
          Lumera uses essential cookies and similar technologies to keep carts working, remember preferences,
          measure site performance, reduce fraud, and personalize the Broadcast. Browser controls may limit some
          tracking, but disabling essential cookies can affect checkout.
        </p>
        <p>
          <strong className="text-altar-goldlight">Cookie consent.</strong> The first time you visit, a consent
          banner asks whether you accept analytics and measurement cookies. Essential cookies (cart and session)
          are always active because the store cannot function without them. Optional analytics cookies load only
          after you choose &ldquo;Accept&rdquo;; if you decline, no analytics scripts run. Your choice is stored
          on your device and can be reset by clearing your browser&apos;s site data, after which the banner will
          appear again.
        </p>
      </Section>
      <Section title="Retention and security">
        <p>
          Information is kept for as long as needed to provide the service, meet tax and accounting obligations,
          resolve disputes, enforce policies, and protect the platform. Lumera uses administrative, technical,
          and organizational safeguards designed to reduce unauthorized access and misuse.
        </p>
      </Section>
      <Section title="Your choices">
        <p>
          You may request access, correction, deletion, or export of personal information, and you may opt out
          of non-transactional marketing. Some requests may be limited by legal, security, tax, fraud-prevention,
          or fulfillment obligations.
        </p>
      </Section>
      <Section title="Children">
        <p>
          Lumera is not directed to children and does not knowingly collect personal information from children.
          Children&apos;s products and other restricted categories are blocked from automated launch unless
          reviewed under a separate compliance process.
        </p>
      </Section>
      <Section title="Contact">
        <p>For privacy requests, contact Lumera support through the email listed in your order confirmation.</p>
      </Section>
    </LegalDoc>
  );
}
