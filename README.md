# FraudGuard — Détection de fraude temps réel par Machine Learning

> Scorez chaque transaction en moins de 50 ms. Bloquez la fraude avant qu'elle coûte.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat&logo=next.js)](https://nextjs.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python)](https://python.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://postgresql.org)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0-FF6600?style=flat)](https://xgboost.readthedocs.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://docker.com)

---

## Table des matières
1. [Vue d'ensemble](#vue-densemble)
2. [Stack technique](#stack-technique)
3. [Architecture mono-repo](#architecture-mono-repo)
4. [Diagrammes UML (Mermaid)](#diagrammes-uml)
5. [PRD — Product Requirements Document](#prd)
6. [User Stories](#user-stories)
7. [Règles métier (Business Logic)](#règles-métier)
8. [Spécification API (FastAPI)](#spécification-api)
9. [Simulation UI — Demo sans API externe](#simulation-ui)
10. [Dataset](#dataset)
11. [Déploiement Docker Compose](#déploiement)
12. [CI/CD GitHub Actions](#cicd)
13. [Roadmap](#roadmap)

---

## Vue d'ensemble

FraudGuard est un système de détection de fraude par carte bancaire combinant un modèle XGBoost entraîné sur des données réelles avec un moteur de règles métier superposé (velocity, géolocalisation, comportement historique). Chaque transaction reçoit un score de risque 0–100 en moins de 50 ms, accompagné d'une explication SHAP pour la transparence décisionnelle.

**Domaine :** Fintech / Scoring de risque en temps réel  
**Dataset :** [Credit Card Fraud Detection — ULB ML Group (Kaggle)](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud) — 284 807 transactions, 492 fraudes, 30 features  
**Port VM :** 3032 | **Sous-domaine :** fraudguard.wikolabs.com

---

## Stack technique

| Couche | Technologie | Rôle |
|--------|------------|------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts | Dashboard analyste, feed transactions, SHAP charts |
| Backend API | FastAPI (Python 3.11), Uvicorn, Pydantic v2 | Endpoint de scoring, gestion des cas |
| ML Scoring | XGBoost 2.0, scikit-learn, Isolation Forest | Classification fraude, anomaly detection |
| Explainabilité | SHAP (TreeExplainer) | Explication feature importance par prédiction |
| Feature Engineering | pandas, numpy, joblib | Velocity, delta geo, ratio montant |
| Base de données | PostgreSQL 16 + Redis 7 (cache LRU) | Persistance + scoring cache |
| Infra | Docker Compose, Nginx | Orchestration mono-VM |
| CI/CD | GitHub Actions → SSH deploy | Pipeline automatique push main |

### backend/requirements.txt
```
fastapi==0.111.0
uvicorn[standard]==0.29.0
xgboost==2.0.3
scikit-learn==1.4.2
shap==0.45.0
pandas==2.2.2
numpy==1.26.4
redis==5.0.4
asyncpg==0.29.0
sqlalchemy[asyncio]==2.0.30
pydantic==2.7.1
joblib==1.4.0
alembic==1.13.1
```

---

## Architecture mono-repo

```
fraudguard/
├── frontend/                    # Next.js 14 App Router
│   ├── src/app/
│   │   ├── page.tsx             # Dashboard principal
│   │   ├── transactions/        # Feed + détail transaction
│   │   ├── cases/               # Gestion des cas analyste
│   │   └── metrics/             # KPI performance modèle
│   ├── src/components/
│   │   ├── ScoreGauge.tsx       # Jauge 0-100 colorée
│   │   ├── ShapChart.tsx        # Bar chart SHAP
│   │   ├── TransactionFeed.tsx
│   │   └── KPICard.tsx
│   └── src/lib/api.ts
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── scoring.py       # POST /api/v1/score
│   │   │   ├── transactions.py
│   │   │   └── cases.py
│   │   ├── services/
│   │   │   ├── scorer.py        # XGBoost pipeline + règles
│   │   │   ├── explainer.py     # SHAP TreeExplainer
│   │   │   └── features.py      # Feature engineering
│   │   ├── models/
│   │   │   ├── transaction.py   # SQLAlchemy ORM
│   │   │   └── fraud_case.py
│   │   └── ml/
│   │       ├── train.py         # Script entraînement
│   │       └── artifacts/       # model.pkl (gitignored)
│   ├── requirements.txt
│   └── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── .github/workflows/deploy.yml
```

---

## Diagrammes UML

### Architecture système

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#dc2626', 'primaryTextColor': '#fff', 'primaryBorderColor': '#991b1b', 'lineColor': '#374151', 'secondaryColor': '#fef2f2'}}}%%
flowchart TB
    subgraph CLIENT["🌐 Clients"]
        MERCHANT["Marchand\n(webhook POST)"]
        ANALYST["Analyste\n(dashboard)"]
    end

    subgraph VM["🖥️ VM — Docker Compose (port 3032)"]
        NGINX["Nginx\nreverse proxy"]
        NEXT["Next.js 14\nDashboard"]
        API["FastAPI\nScoring API"]
        RULES["Moteur\nde règles"]
        MODEL["XGBoost\nmodel.pkl"]
        SHAP["SHAP\nTreeExplainer"]
        REDIS[("Redis\nCache LRU")]
        PG[("PostgreSQL\nTransactions + Cas")]
    end

    MERCHANT -->|"POST /score"| NGINX
    ANALYST -->|"HTTPS"| NGINX
    NGINX --> NEXT
    NGINX --> API
    API --> REDIS
    REDIS -->|"Cache miss"| MODEL
    MODEL --> RULES
    RULES --> SHAP
    SHAP --> PG
    API --> PG
    NEXT --> API
```

### Séquence — Pipeline de scoring

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#dc2626', 'primaryTextColor': '#fff', 'lineColor': '#374151'}}}%%
sequenceDiagram
    participant M as Marchand
    participant API as FastAPI
    participant FE as Feature Engine
    participant XGB as XGBoost
    participant RU as Rule Engine
    participant SH as SHAP
    participant RD as Redis
    participant PG as PostgreSQL

    M->>API: POST /api/v1/score {transaction}
    API->>RD: GET cache(transaction_hash)
    RD-->>API: MISS

    API->>FE: build_features(transaction)
    Note over FE: velocity_1h, geo_delta_km,<br/>amount_ratio_30d, hour_of_day,<br/>merchant_risk, card_age_days

    FE->>XGB: predict_proba(features)
    XGB-->>FE: fraud_prob = 0.87

    FE->>RU: apply_rules(transaction, fraud_prob)
    Note over RU: velocity +20, geo_delta +30,<br/>night_rule +5 → final_score=92

    RU->>SH: explain(features)
    SH-->>RU: shap_values[]

    RU->>PG: INSERT transaction + score
    RU->>RD: SET cache(hash, score, ttl=300s)
    API-->>M: {score:92, decision:"BLOCKED", explanation:[...]}
```

### Modèle de données (ER)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#1e40af', 'primaryTextColor': '#fff', 'lineColor': '#374151'}}}%%
erDiagram
    TRANSACTION {
        uuid id PK
        string card_id FK
        float amount
        string merchant_id
        string merchant_category
        float latitude
        float longitude
        timestamp created_at
        int fraud_score
        string decision
        string status
    }
    FRAUD_CASE {
        uuid id PK
        uuid transaction_id FK
        uuid analyst_id FK
        string status
        string resolution
        text notes
        timestamp opened_at
        timestamp closed_at
    }
    CARD {
        string id PK
        string customer_id
        float avg_amount_30d
        int tx_count_30d
        int chargeback_count_90d
        timestamp first_seen
    }
    MODEL_VERSION {
        uuid id PK
        string version
        float precision_val
        float recall_val
        float auc_roc
        boolean is_active
        timestamp deployed_at
    }
    ANALYST {
        uuid id PK
        string name
        string email
        string role
    }

    TRANSACTION ||--o{ FRAUD_CASE : "génère"
    CARD ||--o{ TRANSACTION : "effectue"
    ANALYST ||--o{ FRAUD_CASE : "traite"
    MODEL_VERSION ||--o{ TRANSACTION : "score"
```

### Machine à états — Cycle de vie d'une transaction

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#dc2626', 'primaryTextColor': '#fff', 'lineColor': '#374151'}}}%%
stateDiagram-v2
    [*] --> PENDING : Transaction reçue
    PENDING --> APPROVED : score < 50
    PENDING --> REVIEW : 50 ≤ score < 80
    PENDING --> BLOCKED : score ≥ 80
    REVIEW --> APPROVED : analyste confirme légit
    REVIEW --> BLOCKED : analyste confirme fraude
    APPROVED --> [*]
    BLOCKED --> CHARGEBACK : client conteste
    CHARGEBACK --> MODEL_FEEDBACK : résolu → retrain
    MODEL_FEEDBACK --> [*]
```

---

## PRD

### Problème
Les banques perdent 32 milliards $/an en fraude carte (Nilson Report 2024). Les systèmes à règles statiques génèrent un taux de faux positifs élevé et manquent les patterns complexes (fraude synthétique, account takeover).

### Solution
Pipeline ML (XGBoost + Isolation Forest) + moteur de règles métier configurable. Scoring en temps réel (<50ms) avec explication SHAP. Interface analyste pour validation/invalidation des décisions.

### Utilisateurs cibles
| Persona | Besoin principal |
|---------|----------------|
| Analyste fraude | Revoir les cas borderline, valider/invalider les blocages |
| Responsable risque | Monitorer KPIs (précision, recall, taux fraude) |
| Développeur intégrateur | API REST/webhook pour intégrer le scoring dans le checkout |

### OKRs
- Fraud catch rate > 95%
- False positive rate < 0.5%
- Latence P99 scoring < 50 ms
- NPS analyste > 8/10

### Non-objectifs
- Conformité PCI DSS (scope demo uniquement)
- Intégration directe processeur paiement
- Fraudes non-carte (virement, identité)

---

## User Stories

```
US-01 [Analyste] En tant qu'analyste fraude,
      je veux voir toutes les transactions flaggées avec leur score SHAP,
      afin de prendre une décision éclairée en moins de 2 minutes.

US-02 [Système] En tant que service de scoring,
      je veux évaluer chaque transaction en moins de 50 ms
      afin de ne pas ralentir le checkout client.

US-03 [Marchand] En tant que marchand,
      je veux recevoir un webhook avec le score et la décision
      afin de bloquer ou approuver la transaction côté checkout.

US-04 [Analyste] En tant qu'analyste,
      je veux voir une explication SHAP pour chaque décision
      afin de pouvoir justifier un refus auprès du client.

US-05 [Responsable] En tant que responsable risque,
      je veux des métriques horaires (précision, recall, volume)
      afin de détecter une dégradation du modèle.

US-06 [Développeur] En tant que développeur,
      je veux une documentation OpenAPI interactive
      afin d'intégrer FraudGuard sans coordination humaine.
```

---

## Règles métier

Ces règles sont **100% simulables dans l'UI sans API externe**.

### Formule de scoring composite
```
score_final = clamp(score_ml × 100 + Σ(règles_overlay), 0, 100)
```

| # | Règle | Impact | Simulable UI |
|---|-------|--------|-------------|
| R1 | XGBoost prob ≥ 0.8 | Base score | ✅ Slider probabilité |
| R2 | Vélocité : > 5 tx en 10 min même carte | +20 | ✅ Mock velocity counter |
| R3 | Distance géo > 500 km en < 1h | +30 | ✅ Input distance |
| R4 | Montant > 3× moyenne 30 jours | +15 | ✅ Input ratio |
| R5 | Catégorie risquée (gambling, crypto) | +10 | ✅ Dropdown catégorie |
| R6 | Premier achat chez ce marchand | +5 | ✅ Checkbox |
| R7 | Tranche 02:00–05:00 heure locale | +5 | ✅ Input heure |
| R8 | > 2 chargebacks dans 90 jours | BLOCKED auto | ✅ Checkbox |
| R9 | Transaction internationale + devise inhabituelle | +15 | ✅ Toggle |
| R10 | Score ≥ 80 → BLOCKED + alerte analyste | Action finale | ✅ |
| R11 | Score 50–79 → REVIEW + notification client | Action intermédiaire | ✅ |
| R12 | Score < 50 → APPROVED | Chemin nominal | ✅ |

### Règle de priorité cas analyste
```python
priority = fraud_score * math.log(1 + amount_eur)
# Les cas à fort montant ET fort score remontent en tête de queue
```

---

## Spécification API

**Base URL :** `http://fraudguard.wikolabs.com/api/v1`  
**Docs :** `/docs` (Swagger UI), `/redoc`

### POST /score
```json
// Request
{
  "card_id": "card_abc123",
  "amount": 450.00,
  "currency": "EUR",
  "merchant_id": "merch_xyz",
  "merchant_category": "gambling",
  "latitude": 48.8566,
  "longitude": 2.3522,
  "timestamp": "2025-05-27T02:34:00Z"
}

// Response (< 50ms)
{
  "transaction_id": "tx_uuid",
  "score": 87,
  "decision": "BLOCKED",
  "confidence": 0.91,
  "explanation": [
    {"feature": "velocity_1h", "value": 7, "shap": 0.31, "label": "7 transactions en 1h"},
    {"feature": "merchant_category", "value": "gambling", "shap": 0.18, "label": "Catégorie risquée"},
    {"feature": "hour_of_day", "value": 2, "shap": 0.12, "label": "Transaction nocturne 02h34"}
  ],
  "processing_ms": 23
}
```

### GET /transactions
```
GET /transactions?status=REVIEW&score_min=60&limit=50&date_from=2025-05-01
```

### GET /transactions/{id}/explain
Retourne l'explication SHAP complète avec waterfall plot data.

### PATCH /cases/{id}
```json
{"status": "CLOSED", "resolution": "FALSE_POSITIVE", "notes": "Client confirmé au téléphone"}
```

### GET /metrics
```json
{
  "window": "last_24h",
  "total_transactions": 12847,
  "fraud_caught": 47,
  "false_positives": 3,
  "precision": 0.940,
  "recall": 0.956,
  "avg_latency_ms": 22
}
```

---

## Simulation UI

Interface demo **100% fonctionnelle sans API externe**. Un générateur embarqué simule un flux de transactions en temps réel.

### Composants
| Composant | Description |
|-----------|-------------|
| **Transaction Stream** | Génère une transaction aléatoire toutes les 2s (setTimeout/WebSocket mock) |
| **Score Gauge** | Jauge circulaire 0–100 : vert < 50, orange 50–79, rouge ≥ 80 |
| **SHAP Waterfall** | Bar chart horizontal montrant la contribution de chaque feature |
| **Rule Trace Panel** | Liste des règles déclenchées avec impact (+X points) |
| **Case Queue** | File d'attente triée par `score × log(montant)` |
| **"Test une transaction" Form** | Sliders : montant, vélocité, distance géo, heure, catégorie |
| **KPI Dashboard** | Métriques mockées avec légère variation aléatoire |

### Données mock embarquées
```typescript
// frontend/src/lib/mock-data.ts
export const MOCK_TRANSACTIONS = [
  { amount: 1200, category: "gambling", velocity: 8, geo_delta: 750, score: 92, decision: "BLOCKED" },
  { amount: 45, category: "grocery", velocity: 1, geo_delta: 2, score: 12, decision: "APPROVED" },
  { amount: 890, category: "crypto", velocity: 3, geo_delta: 1200, score: 74, decision: "REVIEW" },
]

export function generateMockTransaction() {
  // Génère aléatoirement une transaction avec calcul de score local
}
```

---

## Dataset

**Kaggle :** [creditcardfraud — ULB Machine Learning Group](https://www.kaggle.com/datasets/mlg-ulb/creditcardfraud)

```bash
kaggle datasets download -d mlg-ulb/creditcardfraud -p backend/app/ml/data/
```

**Propriétés :** 284 807 transactions (sept. 2013), 492 fraudes (0.172%), features V1–V28 (PCA anonymisé) + Time + Amount.

**Stratégie entraînement :**
- SMOTE pour rééquilibrer les classes
- `scale_pos_weight = 578` dans XGBoost
- Validation : Stratified K-Fold (k=5)
- Métrique cible : AUC-PR > 0.90

---

## Déploiement

### docker-compose.yml
```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: fraudguard
      POSTGRES_USER: fg_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "fg_user"]

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql+asyncpg://fg_user:${POSTGRES_PASSWORD}@postgres/fraudguard
      REDIS_URL: redis://redis:6379
      MODEL_PATH: /app/ml/artifacts/model.pkl
    depends_on:
      postgres:
        condition: service_healthy
    expose: ["8000"]

  frontend:
    build: ./frontend
    environment:
      NEXT_PUBLIC_API_URL: /api
    expose: ["3000"]
    depends_on: [backend]

  nginx:
    image: nginx:alpine
    ports: ["3032:80"]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on: [frontend, backend]

volumes:
  pg_data:
```

---

## CI/CD

### .github/workflows/deploy.yml
```yaml
name: Deploy FraudGuard

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VM via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VM_HOST }}
          username: ${{ secrets.VM_USER }}
          key: ${{ secrets.VM_SSH_KEY }}
          script: |
            cd /opt/fraudguard
            git pull origin main
            docker compose up -d --build
            docker compose exec backend alembic upgrade head
```

---

## Roadmap

### Phase 1 — MVP (Semaines 1–4)
- [ ] Dataset Kaggle → pipeline entraînement XGBoost + SMOTE
- [ ] FastAPI scoring endpoint + cache Redis
- [ ] Moteur de règles configurable (YAML)
- [ ] Dashboard Next.js avec ScoreGauge + SHAP chart
- [ ] Docker Compose + GitHub Actions deploy

### Phase 2 — Production (Semaines 5–8)
- [ ] WebSocket feed transactions temps réel
- [ ] Interface gestion des cas analyste
- [ ] Webhook sortant vers marchands
- [ ] Alembic migrations + seed data

### Phase 3 — Avancé (Semaines 9–12)
- [ ] Isolation Forest pour anomaly detection non supervisé
- [ ] Feedback loop : décisions analyste → re-entraînement auto
- [ ] A/B test : XGBoost v1 vs v2 en shadow mode
- [ ] MLflow experiment tracking

---

*Un produit [Wikolabs](https://wikolabs.com) — Intelligence artificielle appliquée aux métiers*
