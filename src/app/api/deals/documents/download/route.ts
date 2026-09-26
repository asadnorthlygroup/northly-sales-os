import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { exportAgreementPdf } from "@/lib/agreement-doc";
import { fetchInvoicePdf } from "@/lib/qbo-invoice";

/**
 * Streams a generated agreement or invoice PDF to the signed-in AE.
 *
 * The documents live in a Drive folder and a QuickBooks company the AE may not
 * have direct access to, so the server fetches them and passes them through.
 * That keeps the download working whatever mail client the AE uses.
 */
export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");
  const id = searchParams.get("id");
  const name = searchParams.get("name") ?? "document";

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (kind !== "agreement" && kind !== "invoice") {
    return NextResponse.json({ error: "kind must be agreement or invoice" }, { status: 400 });
  }

  try {
    const pdf =
      kind === "agreement" ? await exportAgreementPdf(id) : await fetchInvoicePdf(id);

    // Strip anything that could break the header or escape the filename.
    const safeName = name.replace(/[^\w\-. ]+/g, " ").replace(/\s+/g, " ").trim() || "document";

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not fetch the document";
    console.error("[deals/documents/download]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
