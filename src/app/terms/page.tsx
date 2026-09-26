import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — Northly Sales OS",
  description:
    "Terms governing use of Northly Sales OS, the internal sales and invoicing tool operated by Northly Group.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="8 September 2026">
      <Section title="About this service">
        <p>
          Northly Sales OS is an internal business application operated by WAVEROOMTV
          INC., trading as Northly Group. It is provided to Northly Group staff and
          approved partners to prepare proposals, generate campaign agreements, and raise
          invoices. It is not offered to the general public and is not available for
          sign-up.
        </p>
      </Section>

      <Section title="Who may use it">
        <p>
          Access is limited to individuals granted an account by Northly Group. You are
          responsible for keeping your credentials secure and for activity carried out
          under your account. Accounts may be suspended or removed at any time.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>use the application for anything other than Northly Group business</li>
          <li>attempt to access data belonging to another organisation</li>
          <li>interfere with the operation or security of the application</li>
          <li>export client or financial data other than as your role requires</li>
        </ul>
      </Section>

      <Section title="Connected accounts">
        <p>
          The application connects to QuickBooks Online and Google Workspace on Northly
          Group&rsquo;s behalf. By connecting an account you confirm you are authorised to do
          so. Connections may be revoked at any time from within QuickBooks or Google, and
          revoking one will stop the corresponding features working.
        </p>
      </Section>

      <Section title="Documents and invoices">
        <p>
          The application generates draft agreements and creates invoices in the connected
          QuickBooks company. Generated documents are drafts until a person reviews and
          sends them. Northly Group staff remain responsible for checking every figure,
          tax treatment and term before anything is sent to a client.
        </p>
        <p>
          Nothing produced by the application constitutes tax, accounting or legal advice.
          Sales tax rates applied by the application are configured by Northly Group and
          should be confirmed against current legislation.
        </p>
      </Section>

      <Section title="Availability">
        <p>
          The application is provided on an as-is basis. Northly Group does not guarantee
          uninterrupted availability and may change, suspend or withdraw any part of it
          without notice. It depends on third-party services, including Supabase, Vercel,
          Intuit and Google, whose availability is outside Northly Group&rsquo;s control.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          To the fullest extent permitted by law, Northly Group is not liable for indirect
          or consequential loss arising from use of the application. Nothing in these terms
          limits liability that cannot be limited under applicable law.
        </p>
      </Section>

      <Section title="Governing law">
        <p>
          These terms are governed by the laws of the Province of Ontario and the federal
          laws of Canada applicable there.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          WAVEROOMTV INC. (Northly Group)
          <br />
          305 Milner Avenue, Suite 700
          <br />
          Toronto, ON M1B 3V4, Canada
          <br />
          <a href="mailto:info@northlygroup.com">info@northlygroup.com</a>
        </p>
      </Section>
    </LegalPage>
  );
}
