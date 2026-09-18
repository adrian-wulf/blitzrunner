# ⚡ BlitzRunner

<p align="center">
  🌐 <strong>Langues / Languages :</strong>
  <a href="README.md">🇬🇧 English</a> •
  <a href="README.pl.md">🇵🇱 Polski</a> •
  <a href="README.de.md">🇩🇪 Deutsch</a> •
  <a href="README.es.md">🇪🇸 Español</a> •
  <a href="README.fr.md"><strong>🇫🇷 Français</strong></a>
</p>

<p align="center">
  <strong>Suite d'optimisation CI/CD sans serveur & orchestrateur de runners éphémères selon la philosophie RobinHood dev.</strong><br>
  <em>Élimine jusqu'à 70% des builds redondants en ~3 secondes par analyse git diff et accélère les compilations lourdes de 4x sur des instances Hetzner 8 vCPU pour quelques centimes.</em>
</p>

<p align="center">
  <a href="https://social-wulf.eu"><img src="https://img.shields.io/badge/Écosystème-social--wulf.eu-0ea5e9?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Wulf Hub"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Licence-MIT-amber.svg?style=for-the-badge" alt="Licence MIT"></a>
  <img src="https://img.shields.io/badge/Économies-Jusqu'à_90%25-10b981?style=for-the-badge&logo=cashapp" alt="90% d'économies">
  <img src="https://img.shields.io/badge/Architecture-Zero--Server-3b82f6?style=for-the-badge&logo=serverless" alt="Zero-Server">
  <img src="https://img.shields.io/badge/Compute-Hetzner_Bare--Metal-d946ef?style=for-the-badge&logo=hetzner" alt="Hetzner Cloud">
  <a href="https://buymeacoffee.com/adrianwulf"><img src="https://img.shields.io/badge/☕_Offrir_un_Café-adrianwulf-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Café"></a>
  <a href="https://github.com/sponsors/adrian-wulf"><img src="https://img.shields.io/badge/GitHub_Sponsors-Soutenir_l'auteur-EA4AAA?style=for-the-badge&logo=github-sponsors" alt="GitHub Sponsors"></a>
</p>

---

## ⚡ Pourquoi BlitzRunner ?

* **🛡️ Smart Prune (Le Bouclier) :** Analyse le `git diff` en ~3 secondes. Si un commit ne touche pas un module, BlitzRunner annule immédiatement les builds associés. Économise jusqu'à **70% de temps de calcul CI**.
* **⚔️ Ephemeral Cloud Runner (L'Épée) :** Déploie en 15 secondes une machine dédiée de **4 à 8 vCPU** sur Hetzner Cloud. Exécute les tests **4x plus vite** et s'auto-détruit aussitôt la tâche finie.
* **🐳 Docker & Coolify Runner :** Image multi-architecture (`linux/amd64`, `linux/arm64`) pour déployer un runner persistant et autonome sur votre propre VPS ou Coolify sans surcoût.
* **⚡ Architecture Zero-Server :** **Aucun serveur 24/7 requis.** Vous ne payez que pour les 2–3 minutes d'utilisation réelle (~0,003 € par build).

---

## 🌐 Écosystème Adrian Wulf

| Service / Projet | URL | Objectif |
| :--- | :---: | :--- |
| ⚡ **BlitzRunner** | [github.com/adrian-wulf/blitzrunner](https://github.com/adrian-wulf/blitzrunner) | **Optimiseur CI/CD Zero-Server :** Réduit les coûts de 90% et accélère les builds de 4x. |
| 🛡️ **Nachtwache** | [sentry.social-wulf.eu](https://sentry.social-wulf.eu) | **Gestionnaire d'erreurs & Alternative Sentry :** Binaire Rust unique, ~15 Mo RAM et AI Auto-Fix ([GitHub](https://github.com/adrian-wulf/nachtwache)). |
| 🚀 **Wulf Lead.er** | [lead.social-wulf.eu](https://lead.social-wulf.eu) | **Radar B2B & Auditeur Web :** Prospection via OpenStreetMap et Gemini OSINT ([GitHub](https://github.com/adrian-wulf/wulf-lead-er)). |

---

## ☕ Soutenir le Projet & Philosophie RobinHood dev

* ☕ **Buy Me a Coffee :** [buymeacoffee.com/adrianwulf](https://buymeacoffee.com/adrianwulf)
* 💖 **GitHub Sponsors :** [github.com/sponsors/adrian-wulf](https://github.com/sponsors/adrian-wulf)

---

## ⚖️ Mentions Légales (§ 5 DDG / MIT)

* **Auteur :** Adrian Wulf | [social-wulf.eu](https://social-wulf.eu)
* **Licence :** [Licence MIT](LICENSE) — 100% libre et Open Source.
