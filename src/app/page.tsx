export default function Home() {
  const primary = "#ef4444";
  const primaryDark = "#dc2626";
  const bgLight = "#fef2f2";

  const metrics = [
    { value: "<100ms", label: "par transaction" },
    { value: "99.2%", label: "précision détection" },
    { value: "-85%", label: "fraude validée" },
    { value: "24h/24", label: "surveillance active" },
  ];

  const features = [
    {
      icon: "⚡",
      title: "Scoring temps réel",
      desc: "Chaque paiement, connexion ou action est scoré en moins de 100ms via notre modèle gradient boosting entraîné sur vos patterns.",
    },
    {
      icon: "🕵️",
      title: "Patterns comportementaux",
      desc: "Détection d'anomalies comportementales : device fingerprinting, velocity checks, graphe de relations — invisible pour les fraudeurs.",
    },
    {
      icon: "🚨",
      title: "Alertes & blocage auto",
      desc: "Règles métier + IA combinées : blocage instantané, mise en révision manuelle ou validation transparente selon le score de risque.",
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Connectez vos flux",
      desc: "API REST ou SDK — intégration en moins d'une journée sur votre plateforme de paiement ou d'authentification.",
    },
    {
      num: "02",
      title: "L'IA évalue chaque événement",
      desc: "Le modèle calcule un score de risque 0-100 en tenant compte du contexte historique, comportemental et transactionnel.",
    },
    {
      num: "03",
      title: "Action automatique ou manuelle",
      desc: "Selon vos seuils configurés : blocage immédiat, alerte équipe fraude, ou passage transparent. Audit log complet.",
    },
  ];

  return (
    <main style={{ fontFamily: "var(--font-body)" }}>
      {/* NAVBAR */}
      <nav style={{ background: "#fff", borderBottom: "1px solid #fee2e2", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: primary }}>
            FraudGuard
          </span>
          <a
            href="https://calendly.com/wikolabs"
            target="_blank"
            rel="noopener noreferrer"
            style={{ background: primary, color: "#fff", padding: "10px 22px", borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: "none" }}
          >
            Planifier un audit
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ background: `linear-gradient(135deg, ${bgLight} 0%, #fff 60%)`, padding: "80px 24px 60px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <span style={{ display: "inline-block", background: "#fee2e2", color: primary, borderRadius: 999, padding: "6px 18px", fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
            Scoring de risque IA temps réel
          </span>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.15, color: "#111", marginBottom: 32 }}>
            Chaque transaction scorée.<br />
            <span style={{ color: primary }}>Fraude bloquée en 100ms.</span>
          </h1>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
            <a
              href="https://calendly.com/wikolabs"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: primary, color: "#fff", padding: "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: "none" }}
            >
              Planifier un audit gratuit
            </a>
            <a
              href="https://wa.me/261386626100?text=Bonjour%2C%20je%20souhaite%20discuter%20de%20FraudGuard%20avec%20Wikolabs."
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: "#25d366", color: "#fff", padding: "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: "none" }}
            >
              WhatsApp
            </a>
          </div>

          {/* Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16 }}>
            {metrics.map((m) => (
              <div key={m.label} style={{ background: "#fff", border: `1px solid #fee2e2`, borderRadius: 12, padding: "20px 16px", boxShadow: "0 2px 8px rgba(239,68,68,0.06)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: primary }}>{m.value}</div>
                <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ background: "#fff", padding: "72px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 800, textAlign: "center", color: "#111", marginBottom: 48 }}>
            Ce que FraudGuard fait pour vous
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {features.map((f) => (
              <div key={f.title} style={{ background: bgLight, border: `1px solid #fee2e2`, borderRadius: 16, padding: "32px 28px" }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#111", marginBottom: 12 }}>{f.title}</h3>
                <p style={{ color: "#555", lineHeight: 1.7, fontSize: 15 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ background: bgLight, padding: "72px 24px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.5rem, 3vw, 2.2rem)", fontWeight: 800, textAlign: "center", color: "#111", marginBottom: 48 }}>
            Comment ça fonctionne
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {steps.map((s) => (
              <div key={s.num} style={{ background: "#fff", border: `1px solid #fee2e2`, borderRadius: 16, padding: "28px 32px", display: "flex", gap: 24, alignItems: "flex-start" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 900, color: "#fca5a5", minWidth: 56 }}>{s.num}</span>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "#111", marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ color: "#555", lineHeight: 1.7, fontSize: 15 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: primary, padding: "72px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(1.6rem, 3vw, 2.4rem)", fontWeight: 800, color: "#fff", marginBottom: 16 }}>
            Stoppez la fraude dès aujourd'hui
          </h2>
          <p style={{ color: "#fecaca", fontSize: 17, marginBottom: 40 }}>
            Premier audit gratuit. Mise en place en 24h.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="https://calendly.com/wikolabs"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: "#fff", color: primary, padding: "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: "none" }}
            >
              Planifier un audit gratuit
            </a>
            <a
              href="https://wa.me/261386626100?text=Bonjour%2C%20je%20souhaite%20discuter%20de%20FraudGuard%20avec%20Wikolabs."
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: "#25d366", color: "#fff", padding: "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: "none" }}
            >
              WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#111", padding: "40px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: primary }}>FraudGuard</span>
          <p style={{ color: "#999", marginTop: 12, fontSize: 14 }}>
            by{" "}
            <a href="https://wikolabs.com" target="_blank" rel="noopener noreferrer" style={{ color: "#ccc", textDecoration: "none" }}>
              Wikolabs
            </a>
            {" "}—{" "}
            <a href="mailto:team@wikolabs.com" style={{ color: "#ccc", textDecoration: "none" }}>
              team@wikolabs.com
            </a>
          </p>
          <p style={{ color: "#555", marginTop: 8, fontSize: 13 }}>© {new Date().getFullYear()} Wikolabs. Tous droits réservés.</p>
        </div>
      </footer>
    </main>
  );
}
