import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — Northly Sales OS",
  description:
    "How Northly Sales OS handles data, including data accessed from QuickBooks Online and Google Workspace.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="8 September 2026">
      <Section title="Who this covers">
        <p>
          Northly Sales OS is an internal business tool operated by WAVEROOMTV INC.,
          trading as Northly Group. It is used by Northly Group staff to build client
          proposals, generate campaign agreements, and raise invoices. It is not a
          consumer product and is not offered to the public.
        </p>
      </Section>

      <Section title="What the application stores">
        <p>Northly Sales OS holds business records needed to run the sales process:</p>
        <ul>
          <li>Client company names, billing contacts, billing addresses and email addresses</li>
          <li>Deals, proposals, packages and the rates quoted on them</li>
          <li>Invoice records, including amounts, tax, discounts and payment method</li>
          <li>Staff accounts for the people who sign in</li>
          <li>An audit log of actions taken, such as an invoice being created</li>
        </ul>
        <p>
          This data is held in a Postgres database hosted by Supabase in the Canadian
          region, and the application is hosted by Vercel.
        </p>
      </Section>

      <Section title="QuickBooks Online">
        <p>
          With your authorisation, the application connects to a QuickBooks Online
          company using Intuit&rsquo;s OAuth 2.0 flow. Access and refresh tokens are stored
          in the application database and are used only to act on that company.
        </p>
        <p>Using the accounting scope, the application:</p>
        <ul>
          <li>reads and creates customer records</li>
          <li>reads sales tax codes and company preferences</li>
          <li>creates invoices and reads them back, including their PDF</li>
          <li>reads the payment link for an invoice</li>
        </ul>
        <p>
          The application does not read payroll, banking or transaction history beyond
          the invoices it creates, and never shares QuickBooks data with any third party.
          You can disconnect at any time from within QuickBooks, under Apps, which
          revokes the tokens immediately.
        </p>
      </Section>

      <Section title="Google Workspace">
        <p>
          The application uses a Google service account to generate campaign agreements.
          It copies an agreement template stored in Northly Group&rsquo;s own Google Drive,
          fills it in, and exports a PDF. Where enabled, it also creates a draft email in
          the account executive&rsquo;s mailbox with the agreement and invoice attached.
        </p>
        <p>
          Drafts are created only. The application cannot send email, and no message
          reaches a client until a person reviews the draft and sends it themselves.
        </p>
      </Section>

      <Section title="How long data is kept">
        <p>
          Business records are retained for as long as Northly Group needs them for
          accounting, tax and contractual purposes, in line with Canadian record-keeping
          requirements. QuickBooks tokens are retained until the connection is revoked or
          replaced.
        </p>
      </Section>

      <Section title="Who can see the data">
        <p>
          Access requires a Northly Group staff account. Data is not sold, rented, or
          shared for advertising. It is disclosed to third parties only where a service
          provider processes it on Northly Group&rsquo;s behalf — currently Supabase,
          Vercel, Intuit and Google — or where the law requires disclosure.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          If you are a client of Northly Group and want to know what business records are
          held about your organisation, or want them corrected, contact us at the address
          below and we will respond.
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
