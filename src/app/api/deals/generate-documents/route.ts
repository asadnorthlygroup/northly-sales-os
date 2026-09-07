import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  generateDealDocuments,
  type DealDocumentsInput,
} from "@/lib/document-orchestrator";
import { livePorts } from "@/lib/deal-document-ports";
import {
  centsToDollars,
  dollarsToCents,
  PROVINCES,
  ReconciliationError,
  UnsupportedProvinceError,
} from "@/lib/invoice-pricing";

/** The IO / agreement template and the folder generated agreements land in. */
const TEMPLATE_DOCUMENT_ID =
  process.env.AGREEMENT_TEMPLATE_DOC_ID ?? "1XmbFXYNsbGDYNKyNT3AVeNJkJ9sXhhAISWuSVLgs5YQ";
const TARGET_FOLDER_ID =
  process.env.AGREEMENT_TARGET_FOLDER_ID ?? "19MdRpMCppEeA-MC5k2d9z21EFDoNfqzY";

const lineSchema = z.object({
  item: z.string().min(1),
  description: z.string().default(""),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  zeroRated: z.boolean().optional(),
});

const bodySchema = z.object({
  dealId: z.string().min(1),
  clientCompany: z.string().min(1),
  clientContactName: z.string().min(1),
  clientEmail: z.string().email(),
  clientStreet: z.string().default(""),
  clientCity: z.string().default(""),
  clientProvince: z.enum(PROVINCES),
  clientPostal: z.string().default(""),
  campaignTitle: z.string().min(1),
  billingTerm: z.string().default("Due Upon Receipt"),
  initialSubscriptionTerm: z.string().default("One Time"),
  serviceStartDate: z.string().min(1),
  invoiceDate: z.string().min(1),
  dueDate: z.string().min(1),
  paymentMethod: z.enum(["credit_card", "e_transfer", "cheque", "eft"]),
  discount: z.number().min(0).default(0),
  specialConditions: z.string().optional(),
  lines: z.array(lineSchema).min(1),
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cs: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const aeEmail = session.user.email;
  if (!aeEmail) {
    return NextResponse.json(
      { error: "Your account has no email address, so the draft cannot be created." },
      { status: 400 }
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await request.json());
  } catch (err) {
    const issues =
      err instanceof z.ZodError
        ? err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : "Malformed request";
    return NextResponse.json({ error: issues, code: "invalid_request" }, { status: 400 });
  }

  const input: DealDocumentsInput = {
    dealId: parsed.dealId,
    aeEmail,
    clientCompany: parsed.clientCompany,
    clientContactName: parsed.clientContactName,
    clientEmail: parsed.clientEmail,
    clientStreet: parsed.clientStreet,
    clientCity: parsed.clientCity,
    clientProvince: parsed.clientProvince,
    clientPostal: parsed.clientPostal,
    campaignTitle: parsed.campaignTitle,
    billingTerm: parsed.billingTerm,
    initialSubscriptionTerm: parsed.initialSubscriptionTerm,
    serviceStartDate: parsed.serviceStartDate,
    invoiceDate: parsed.invoiceDate,
    dueDate: parsed.dueDate,
    paymentMethod: parsed.paymentMethod,
    discountCents: dollarsToCents(parsed.discount),
    specialConditions: parsed.specialConditions,
    lines: parsed.lines.map((line) => ({
      item: line.item,
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: dollarsToCents(line.unitPrice),
      zeroRated: line.zeroRated,
    })),
  };

  try {
    const result = await generateDealDocuments(input, {
      ...livePorts({
        templateDocumentId: TEMPLATE_DOCUMENT_ID,
        targetFolderId: TARGET_FOLDER_ID,
      }),
    });

    return NextResponse.json({
      invoiceNumber: result.invoiceNumber,
      qboUrl: result.qboUrl,
      paymentLink: result.paymentLink,
      agreementLink: result.agreementLink,
      draftLink: result.draftLink,
      draftError: result.draftError ?? null,
      emailSubject: result.emailSubject,
      emailBody: result.emailBody,
      agreementDownloadUrl:
        "/api/deals/documents/download?kind=agreement&id=" +
        encodeURIComponent(result.agreementDocumentId) +
        "&name=" +
        encodeURIComponent("Agreement - " + parsed.clientCompany),
      invoiceDownloadUrl:
        "/api/deals/documents/download?kind=invoice&id=" +
        encodeURIComponent(result.qboInvoiceId) +
        "&name=" +
        encodeURIComponent("Invoice " + result.invoiceNumber),
      reusedInvoice: result.reusedInvoice,
      subtotal: centsToDollars(result.totals.subtotalCents),
      discount: centsToDollars(result.totals.discountCents),
      tax: centsToDollars(result.totals.taxCents),
      processingFee: centsToDollars(result.totals.feeCents),
      total: centsToDollars(result.totals.totalCents),
      taxLabel: result.totals.taxLabel,
    });
  } catch (err) {
    if (err instanceof ReconciliationError) {
      return NextResponse.json(
        {
          error: err.message,
          code: "reconciliation_failed",
          expected: centsToDollars(err.expectedCents),
          actual: centsToDollars(err.actualCents),
        },
        { status: 409 }
      );
    }

    if (err instanceof UnsupportedProvinceError) {
      return NextResponse.json({ error: err.message, code: "unsupported_province" }, { status: 400 });
    }

    const message = err instanceof Error ? err.message : "Unknown error generating documents";
    const code = (err as Error & { code?: string })?.code;
    console.error("[deals/generate-documents]", err);
    return NextResponse.json(
      { error: message, code },
      { status: code === "qb_auth_failed" ? 403 : 500 }
    );
  }
}
