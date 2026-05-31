"""FraudGuard demo backend — production-ready POC.

In production: this service would feed a feature store, score with an XGBoost
model, hit device fingerprint vendors and dispatch 3DS step-up via the PSP.
For the demo: it only invokes the LLM and returns the decision.
"""
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .llm import chat, is_configured

app = FastAPI(
    title="FraudGuard Demo Backend",
    description="POC backend — Groq/Gemini LLM. No third-party connections.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Prompts
# ─────────────────────────────────────────────────────────────────────────────
SYSTEM_PROMPT_FR = """Tu es FraudGuard, un agent IA de detection de fraude transactionnelle pour banques et fintechs. Tu recois une transaction (montant, moyen de paiement, pays, heure, contexte client) et tu produis une decision en moins de 80ms, dans le style d'un message de moteur de regles risk-team.

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

Tu DOIS rendre une decision realiste meme avec peu de donnees (pas de "transaction insuffisante"). Tu joues le role d'un risk officer qui a vu 500M de transactions. Ton sobre, factuel, evite l'enthousiasme commercial. Maximum 350 mots."""

SYSTEM_PROMPT_EN = """You are FraudGuard, an AI transaction fraud detection agent for banks and fintechs. You receive a transaction (amount, payment method, country, time, customer context) and produce a decision in under 80ms, in risk-team rule-engine message style.

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

You MUST produce a realistic decision even with limited data (no "insufficient transaction"). You play the role of a risk officer who has seen 500M transactions. Sober, factual tone, avoid commercial enthusiasm. Maximum 350 words."""


# ─────────────────────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────────────────────
class GenerateRequest(BaseModel):
    amount: str = Field(..., min_length=1, max_length=40)
    method: str = Field(..., min_length=1, max_length=40)
    country: Optional[str] = Field(default="", max_length=40)
    context: Optional[str] = Field(default="", max_length=400)
    lang: Literal["fr", "en"] = "fr"


class GenerateResponse(BaseModel):
    brief: str
    model: str
    generated_at: str
    static_mode: bool = False


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "fraudguard-backend",
        "llm_configured": is_configured(),
    }


@app.post("/process", response_model=GenerateResponse)
async def process(req: GenerateRequest) -> GenerateResponse:
    amount = req.amount.strip()
    method = req.method.strip()
    country = (req.country or "").strip()
    context = (req.context or "").strip()
    if not amount or not method:
        raise HTTPException(status_code=400, detail="missing_amount_or_method")

    now_iso = datetime.now(timezone.utc).isoformat()
    user_msg = (
        f"Transaction a scorer :\n- Montant : {amount}\n- Moyen : {method}\n- Pays : {country or 'non precise'}\n- Contexte : {context or 'aucun'}\nGenere la decision risk complete."
        if req.lang == "fr"
        else f"Transaction to score:\n- Amount: {amount}\n- Method: {method}\n- Country: {country or 'unspecified'}\n- Context: {context or 'none'}\nGenerate the full risk decision."
    )

    if not is_configured():
        return GenerateResponse(
            brief=_build_mock_brief(amount, method, country, req.lang),
            model="static-mock",
            generated_at=now_iso,
            static_mode=True,
        )

    try:
        text, model = await chat(
            [
                {"role": "system", "content": SYSTEM_PROMPT_FR if req.lang == "fr" else SYSTEM_PROMPT_EN},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=900,
        )
    except Exception:
        return GenerateResponse(
            brief=_build_mock_brief(amount, method, country, req.lang),
            model="static-mock",
            generated_at=now_iso,
            static_mode=True,
        )

    return GenerateResponse(brief=text, model=model, generated_at=now_iso)


# ─────────────────────────────────────────────────────────────────────────────
# Mock brief (used when no LLM key configured)
# ─────────────────────────────────────────────────────────────────────────────
def _build_mock_brief(amount: str, method: str, country: str, lang: str) -> str:
    c = country or "RO"
    if lang == "en":
        return (
            f"**⚖️ Decision**\n"
            f"- Verdict CHALLENGE 3DS — risk score 72/100.\n"
            f"- Simulated latency: 47ms.\n\n"
            f"**🚩 Detected risk signals**\n"
            f"- Amount {amount} via {method} on a customer whose 90-day p95 transaction is 4× lower.\n"
            f"- Geo-mismatch: shipping {c}, billing FR, IP geolocated in NL (3rd country in 24h).\n"
            f"- Velocity: 5 attempts in last 18 minutes on same PAN, 2 declined upstream.\n"
            f"- Device fingerprint matches a cluster flagged on 7 prior chargebacks in last 30 days.\n\n"
            f"**🎯 Confidence and explainability**\n"
            f"- Top features: device_cluster_match (0.34), geo_mismatch (0.28), velocity_24h (0.19).\n"
            f"- False-positive rate on this profile: ~6.2% (acceptable for step-up).\n\n"
            f"**🛠 Automatic actions**\n"
            f"- Trigger 3DS Secure step-up via PSP, decision returned to merchant <300ms.\n"
            f"- Notify customer on registered app: \"We added a verification step for your safety.\"\n"
            f"- Open Sift Connect case with full feature payload for review queue if challenge fails."
        )
    return (
        f"**⚖️ Decision**\n"
        f"- Verdict CHALLENGE 3DS — score risque 72/100.\n"
        f"- Latence simulee : 47ms.\n\n"
        f"**🚩 Signaux de risque detectes**\n"
        f"- Montant {amount} via {method} sur un client dont la p95 transaction 90 jours est 4x inferieure.\n"
        f"- Geo-mismatch : livraison {c}, billing FR, IP geolocalisee NL (3eme pays en 24h).\n"
        f"- Velocity : 5 tentatives sur 18 dernieres minutes sur meme PAN, 2 refusees en amont.\n"
        f"- Empreinte device matche un cluster flagge sur 7 chargebacks ces 30 derniers jours.\n\n"
        f"**🎯 Confiance et explainability**\n"
        f"- Top features : device_cluster_match (0.34), geo_mismatch (0.28), velocity_24h (0.19).\n"
        f"- Faux positif sur ce profil : ~6.2% (acceptable pour step-up).\n\n"
        f"**🛠 Actions automatiques**\n"
        f"- Declenchement 3DS Secure step-up via PSP, decision retournee marchand <300ms.\n"
        f"- Notification client sur app enregistree : \"Etape de verification ajoutee pour votre securite.\"\n"
        f"- Ouverture case Sift Connect avec payload features complet pour file de revue si challenge echoue."
    )
