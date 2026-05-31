import { NextResponse } from "next/server";
import { chat, isConfigured } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYSTEM_PROMPT_FR = `Tu es FraudGuard, un agent IA de detection de fraude transactionnelle pour banques et fintechs. Tu recois une transaction (montant, moyen de paiement, pays, heure, contexte client) et tu produis une decision en moins de 80ms, dans le style d'un message de moteur de regles risk-team.

Format de sortie exact en MARKDOWN :
**⚖️ Decision**
- [Verdict : APPROUVER / CHALLENGE 3DS / BLOQUER + score risque 0-100]
- [Latence simulee : ex "47ms"]

**🚩 Signaux de risque detectes**
- [3-4 puces : signaux pondere : velocity, geo-mismatch, BIN risque, device fingerprint, comportement atypique vs baseline client]

**🎯 Confiance et explainability**
- [Top 3 features contributrices avec poids approximatif]
- [Faux positif estime sur ce type de profil]

**🛠 Actions automatiques**
- [2-3 puces : auto-step-up 3DS, notification au client, ouverture case Sift/manual review]

Tu DOIS rendre une decision realiste meme avec peu de donnees (pas de "transaction insuffisante"). Tu joues le role d'un risk officer qui a vu 500M de transactions. Ton sobre, factuel, evite l'enthousiasme commercial. Maximum 350 mots.`;

const SYSTEM_PROMPT_EN = `You are FraudGuard, an AI transaction fraud detection agent for banks and fintechs. You receive a transaction (amount, payment method, country, time, customer context) and produce a decision in under 80ms, in risk-team rule-engine message style.

Exact MARKDOWN output format:
**⚖️ Decision**
- [Verdict: APPROVE / CHALLENGE 3DS / BLOCK + risk score 0-100]
- [Simulated latency: e.g. "47ms"]

**🚩 Detected risk signals**
- [3-4 bullets: weighted signals: velocity, geo-mismatch, risky BIN, device fingerprint, atypical behavior vs customer baseline]

**🎯 Confidence and explainability**
- [Top 3 contributing features with approximate weights]
- [Estimated false-positive rate on this profile type]

**🛠 Automatic actions**
- [2-3 bullets: auto step-up 3DS, customer notification, open Sift case / manual review]

You MUST produce a realistic decision even with limited data (no "insufficient transaction"). You play the role of a risk officer who has seen 500M transactions. Sober, factual tone, avoid commercial enthusiasm. Maximum 350 words.`;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const amount: string = typeof body.amount === "string" ? body.amount.trim().slice(0, 40) : "";
    const method: string = typeof body.method === "string" ? body.method.trim().slice(0, 40) : "";
    const country: string = typeof body.country === "string" ? body.country.trim().slice(0, 40) : "";
    const context: string = typeof body.context === "string" ? body.context.trim().slice(0, 400) : "";
    const lang: "fr" | "en" = body.lang === "en" ? "en" : "fr";

    if (!amount || !method) {
      return NextResponse.json(
        { error: lang === "fr" ? "Entrez un montant et un moyen de paiement." : "Enter an amount and a payment method." },
        { status: 400 }
      );
    }

    if (!isConfigured()) {
      return NextResponse.json(
        {
          error: "llm_not_configured",
          message: lang === "fr"
            ? "Demo en mode statique — la cle LLM sera configuree au prochain deploiement."
            : "Static demo mode — LLM key will be configured at next deploy.",
          mockBrief: buildMockBrief(amount, method, country, lang),
        },
        { status: 200 }
      );
    }

    const userMsg = lang === "fr"
      ? `Transaction a scorer :\n- Montant : ${amount}\n- Moyen : ${method}\n- Pays : ${country || "non precise"}\n- Contexte : ${context || "aucun"}\nGenere la decision risk complete.`
      : `Transaction to score:\n- Amount: ${amount}\n- Method: ${method}\n- Country: ${country || "unspecified"}\n- Context: ${context || "none"}\nGenerate the full risk decision.`;

    const { text, model } = await chat(
      [
        { role: "system", content: lang === "fr" ? SYSTEM_PROMPT_FR : SYSTEM_PROMPT_EN },
        { role: "user", content: userMsg },
      ],
      900
    );

    return NextResponse.json({ brief: text, model, generatedAt: new Date().toISOString() });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildMockBrief(amount: string, method: string, country: string, lang: "fr" | "en"): string {
  const c = country || (lang === "fr" ? "RO" : "RO");
  if (lang === "en") {
    return `**⚖️ Decision**\n- Verdict CHALLENGE 3DS — risk score 72/100.\n- Simulated latency: 47ms.\n\n**🚩 Detected risk signals**\n- Amount ${amount} via ${method} on a customer whose 90-day p95 transaction is 4× lower.\n- Geo-mismatch: shipping ${c}, billing FR, IP geolocated in NL (3rd country in 24h).\n- Velocity: 5 attempts in last 18 minutes on same PAN, 2 declined upstream.\n- Device fingerprint matches a cluster flagged on 7 prior chargebacks in last 30 days.\n\n**🎯 Confidence and explainability**\n- Top features: device_cluster_match (0.34), geo_mismatch (0.28), velocity_24h (0.19).\n- False-positive rate on this profile: ~6.2% (acceptable for step-up).\n\n**🛠 Automatic actions**\n- Trigger 3DS Secure step-up via PSP, decision returned to merchant <300ms.\n- Notify customer on registered app: "We added a verification step for your safety."\n- Open Sift Connect case with full feature payload for review queue if challenge fails.`;
  }
  return `**⚖️ Decision**\n- Verdict CHALLENGE 3DS — score risque 72/100.\n- Latence simulee : 47ms.\n\n**🚩 Signaux de risque detectes**\n- Montant ${amount} via ${method} sur un client dont la p95 transaction 90 jours est 4x inferieure.\n- Geo-mismatch : livraison ${c}, billing FR, IP geolocalisee NL (3eme pays en 24h).\n- Velocity : 5 tentatives sur 18 dernieres minutes sur meme PAN, 2 refusees en amont.\n- Empreinte device matche un cluster flagge sur 7 chargebacks ces 30 derniers jours.\n\n**🎯 Confiance et explainability**\n- Top features : device_cluster_match (0.34), geo_mismatch (0.28), velocity_24h (0.19).\n- Faux positif sur ce profil : ~6.2% (acceptable pour step-up).\n\n**🛠 Actions automatiques**\n- Declenchement 3DS Secure step-up via PSP, decision retournee marchand <300ms.\n- Notification client sur app enregistree : "Etape de verification ajoutee pour votre securite."\n- Ouverture case Sift Connect avec payload features complet pour file de revue si challenge echoue.`;
}
