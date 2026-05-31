import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In docker-compose: BACKEND_URL=http://fraudguard-backend:8000
// In local dev (next dev outside compose): falls back to localhost
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(req: Request) {
  let body: { amount?: string; method?: string; country?: string; context?: string; lang?: "fr" | "en" } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const amount = typeof body.amount === "string" ? body.amount.trim().slice(0, 40) : "";
  const method = typeof body.method === "string" ? body.method.trim().slice(0, 40) : "";
  const country = typeof body.country === "string" ? body.country.trim().slice(0, 40) : "";
  const context = typeof body.context === "string" ? body.context.trim().slice(0, 400) : "";
  const lang: "fr" | "en" = body.lang === "en" ? "en" : "fr";

  if (!amount || !method) {
    return NextResponse.json(
      { error: lang === "fr" ? "Entrez un montant et un moyen de paiement." : "Enter an amount and a payment method." },
      { status: 400 }
    );
  }

  try {
    const r = await fetch(`${BACKEND_URL}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, method, country, context, lang }),
      cache: "no-store",
    });
    const j = await r.json();
    if (!r.ok) {
      return NextResponse.json({ error: j.detail || "backend_error" }, { status: r.status });
    }

    if (j.static_mode) {
      return NextResponse.json({
        error: "llm_not_configured",
        message: lang === "fr"
          ? "Demo en mode statique — la cle LLM sera configuree au prochain deploiement."
          : "Static demo mode — LLM key will be configured at next deploy.",
        mockBrief: j.brief,
      });
    }

    return NextResponse.json({
      brief: j.brief,
      model: j.model,
      generatedAt: j.generated_at,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown_error";
    return NextResponse.json({ error: `backend_unreachable: ${msg}` }, { status: 502 });
  }
}
