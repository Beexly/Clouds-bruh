import type { Metadata } from 'next';
import { LegalDoc, Section } from '../../../components/LegalDoc';

export const metadata: Metadata = { title: 'Returns & Shipping' };

export default function ReturnsPage() {
  return (
    <LegalDoc title="Returns & Shipping" updated="[date]">
      <p>How orders ship and how returns work. [Tailor every figure below to your real fulfilment terms.]</p>
      <Section title="Shipping">
        <p>
          Orders are processed within [1–2] business days and ship via [carrier(s)]. Estimated delivery:
          [domestic X–Y days], [international X–Y days]. Shipping cost and method are shown at checkout. Drops
          may ship on a stated schedule.
        </p>
      </Section>
      <Section title="Returns window">
        <p>Unused items in original condition may be returned within [30] days of delivery. [List exclusions — final-sale drops, opened goods, personalized items.]</p>
      </Section>
      <Section title="How to return">
        <p>Start a return from your order confirmation or email [returns@lumera.example] with your order number. We will provide instructions and, where applicable, a return label.</p>
      </Section>
      <Section title="Refunds">
        <p>
          Approved refunds are issued to your original payment method, or — if you prefer — as Lumens (store
          credit), typically within [5–10] business days of receiving the return. Original shipping is
          [non-]refundable.
        </p>
      </Section>
      <Section title="Damaged or wrong items">
        <p>If something arrives damaged or incorrect, contact us within [7] days with a photo and we will make it right at no cost to you.</p>
      </Section>
      <Section title="Contact">
        <p>[returns@lumera.example] · [Company legal name, registered address].</p>
      </Section>
    </LegalDoc>
  );
}
