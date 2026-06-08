import type { Metadata } from 'next';
import { LegalDoc, Section } from '../../../components/LegalDoc';

export const metadata: Metadata = { title: 'Returns & Shipping' };

export default function ReturnsPage() {
  return (
    <LegalDoc title="Returns & Shipping" updated="June 7, 2026">
      <p>
        This policy explains how Lumera handles shipping promises, supplier delays, returns, exchanges, damaged
        items, and refunds. The checkout page and product page show the most specific promise for each item.
      </p>
      <Section title="Shipping">
        <p>
          Orders are processed after payment authorization, fraud review, supplier stock verification, and
          fulfillment routing. Standard delivery estimates are shown before payment. When an item is fulfilled by
          a third-party supplier or print-on-demand partner, the supplier region and expected delivery window are
          shown in the Product Truth panel or checkout promise.
        </p>
      </Section>
      <Section title="Delay consent">
        <p>
          If Lumera learns that an order cannot ship within the stated promise, Lumera will provide a delay
          notice when required and offer the available choices: continue waiting, accept an alternate item, or
          cancel for a refund. Orders are not silently pushed beyond the stated promise.
        </p>
      </Section>
      <Section title="Returns window">
        <p>
          Unused, undamaged items in original condition may be returned within 30 days of delivery unless the
          product page marks the item as final sale, custom-made, personalized, hygiene-sensitive, perishable, or
          otherwise excluded before purchase.
        </p>
      </Section>
      <Section title="How to start a return">
        <p>
          Start a return from the order confirmation or the returns form on the site. Include the order number,
          email used at checkout, item, reason, and photos when the item is damaged, defective, or incorrect.
          Lumera will provide next steps and, when applicable, return-label instructions.
        </p>
      </Section>
      <Section title="Refunds">
        <p>
          Approved refunds are issued to the original payment method after the return is received and inspected,
          or earlier when Lumera confirms a supplier cancellation before shipment. Bank and payment processor
          timing can vary. Store credit may be offered when requested or when a promotion clearly states that
          credit is the remedy.
        </p>
      </Section>
      <Section title="Damaged, defective, or wrong items">
        <p>
          If an item arrives damaged, defective, materially different from the listing, or incorrect, contact
          Lumera support promptly with photos and order details. Lumera will arrange a replacement, repair path,
          return, store credit, or refund depending on the item and supplier proof.
        </p>
      </Section>
      <Section title="Return shipping">
        <p>
          Lumera covers return shipping for damaged, defective, or incorrect items when the claim is approved.
          For discretionary returns, return shipping costs may be deducted from the refund unless the product
          page, promotion, or checkout promise states otherwise.
        </p>
      </Section>
      <Section title="Contact">
        <p>For shipping or returns help, contact Lumera support through the email listed in your order confirmation.</p>
      </Section>
    </LegalDoc>
  );
}
