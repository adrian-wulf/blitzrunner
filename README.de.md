# ⚡ BlitzRunner

<p align="center">
  🌐 <strong>Sprachen / Languages:</strong>
  <a href="README.md">🇬🇧 English</a> •
  <a href="README.pl.md">🇵🇱 Polski</a> •
  <a href="README.de.md"><strong>🇩🇪 Deutsch</strong></a> •
  <a href="README.es.md">🇪🇸 Español</a> •
  <a href="README.fr.md">🇫🇷 Français</a>
</p>

<p align="center">
  <strong>Serverlose, ultraschnelle CI-Optimierungs-Suite & Orchestrator für Einweg-Cloud-Runner nach der RobinHood dev Philosophie.</strong><br>
  <em>Reduziert bis zu 70% redundanter CI-Builds in ~3 Sekunden durch Git-Diff-Analyse und beschleunigt schwere Kompilierungen um das 4-Fache auf temporären 8-vCPU Hetzner-Servern für wenige Cent.</em>
</p>

<p align="center">
  <a href="https://social-wulf.eu"><img src="https://img.shields.io/badge/Ökosystem-social--wulf.eu-0ea5e9?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Wulf Hub"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/Lizenz-MIT-amber.svg?style=for-the-badge" alt="MIT Lizenz"></a>
  <img src="https://img.shields.io/badge/Ersparnis-Bis_zu_90%25-10b981?style=for-the-badge&logo=cashapp" alt="Bis zu 90% Ersparnis">
  <img src="https://img.shields.io/badge/Architektur-Zero--Server-3b82f6?style=for-the-badge&logo=serverless" alt="Zero-Server">
  <img src="https://img.shields.io/badge/Compute-Hetzner_Bare--Metal-d946ef?style=for-the-badge&logo=hetzner" alt="Hetzner Cloud">
  <a href="https://buymeacoffee.com/adrianwulf"><img src="https://img.shields.io/badge/☕_Kaffee_Spenden-adrianwulf-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Kaffee spenden"></a>
  <a href="https://github.com/sponsors/adrian-wulf"><img src="https://img.shields.io/badge/GitHub_Sponsors-Entwickler_unterstützen-EA4AAA?style=for-the-badge&logo=github-sponsors" alt="GitHub Sponsors"></a>
</p>

---

## 📑 Inhaltsverzeichnis
1. [⚡ Warum BlitzRunner?](#-warum-blitzrunner)
2. [🌐 Adrian Wulf Ökosystem](#-adrian-wulf-ökosystem)
3. [📊 Vergleich: GitHub Actions vs Kommerzielle SaaS vs BlitzRunner](#-vergleich-github-actions-vs-kommerzielle-saas-vs-blitzrunner)
4. [🏗️ Systemarchitektur](#️-systemarchitektur)
5. [🚀 Schnellstart](#-schnellstart)
6. [🛡️ Schutzschild: Smart Prune Action](#️-schutzschild-smart-prune-action)
7. [⚔️ Schwert: Ephemerer Hetzner Runner](#️-schwert-ephemerer-hetzner-runner)
8. [🛠️ CLI Diagnosetool & ROI-Rechner](#️-cli-diagnosetool--roi-rechner)
9. [☕ Projekt unterstützen & RobinHood dev Philosophie](#-projekt-unterstützen--robinhood-dev-philosophie)
10. [⚖️ Impressum & Rechtliche Hinweise (§ 5 DDG / MIT)](#️-impressum--rechtliche-hinweise--5-ddg--mit)

---

## ⚡ Warum BlitzRunner?

Jedes moderne Entwicklungsteam leidet unter der gleichen versteckten Cloud-Steuer: **aufgeblähte CI/CD-Wartezeiten und unverschämte Minutenpreise für virtuelle Maschinen.**

* **🛡️ Smart Prune (Das Schutzschild):** Prüft den `git diff` in ~3 Sekunden. Wurde eine Komponente nicht berührt, bricht BlitzRunner die zugehörigen Jobs sofort ab. Bis zu **70% weniger Rechenzeit**.
* **⚔️ Ephemerer Hetzner Runner (Das Schwert):** Bei schweren Builds startet BlitzRunner über die Hetzner Cloud API in 15 Sekunden eine leistungsstarke Instanz (**4–8 vCPUs**). Builds laufen **4x schneller** und der Server zerstört sich danach sofort selbst.
* **⚡ Zero-Server-Architektur:** **Kein 24/7-Server erforderlich.** Sie zahlen nur für die 2–3 Minuten echter CPU-Last (ca. **~0,003 € pro Build**).

---

## 🌐 Adrian Wulf Ökosystem

BlitzRunner ist Teil einer unabhängigen Suite moderner Entwickler- und Business-Werkzeuge unter der **RobinHood dev** Philosophie:

| Dienst / Projekt | URL | Zweck |
| :--- | :---: | :--- |
| ⚡ **BlitzRunner** | [github.com/adrian-wulf/blitzrunner](https://github.com/adrian-wulf/blitzrunner) | **Zero-Server CI Optimizer:** Senkt CI-Kosten um 90% und beschleunigt Builds 4x. |
| 🛡️ **Nachtwache** | [sentry.social-wulf.eu](https://sentry.social-wulf.eu) | **Autonomer Fehlerwächter & Sentry-Ersatz:** Single Rust Binary, ~15 MB RAM, SQLite WAL und integrierter AI Auto-Fix ([GitHub](https://github.com/adrian-wulf/nachtwache)). |
| 🚀 **Wulf Lead.er** | [lead.social-wulf.eu](https://lead.social-wulf.eu) | **B2B Lead Intelligence & Web Auditor:** Lokale Akquise mit OpenStreetMap und Gemini OSINT ([GitHub](https://github.com/adrian-wulf/wulf-lead-er)). |
| 🌐 **Zentraler Wulf Hub** | [social-wulf.eu](https://social-wulf.eu) | **Haupt-Ökosystem:** Entwickler-Portfolio und Unabhängigkeits-Portal von Adrian Wulf. |
| 💼 **Wulf Code** | [wulf-code.it](https://wulf-code.it) | **Software House & Beratung:** Hochleistungssysteme, Cloud-Architektur und Sicherheitsaudits. |

---

## 🚀 Schnellstart

Fügen Sie `.github/workflows/ci.yml` zu Ihrem Repository hinzu:

```yaml
name: BlitzRunner CI

on: [push, pull_request]

jobs:
  inspect:
    name: 🛡️ Smart Prune
    runs-on: ubuntu-latest
    outputs:
      run_backend: ${{ steps.prune.outputs.backend }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 20
      - uses: adrian-wulf/blitzrunner/actions/smart-prune@v1
        id: prune
        with:
          filters: |
            backend: ['services/**', 'packages/**']

  spawn-runner:
    name: 🚀 Hetzner Runner starten
    needs: inspect
    if: needs.inspect.outputs.run_backend == 'true'
    runs-on: ubuntu-latest
    outputs:
      runner_label: ${{ steps.spawn.outputs.label }}
      server_id: ${{ steps.spawn.outputs.server_id }}
    steps:
      - uses: adrian-wulf/blitzrunner/actions/hetzner-runner@v1
        id: spawn
        with:
          mode: start
          hcloud_token: ${{ secrets.HCLOUD_TOKEN }}
          github_token: ${{ secrets.GH_RUNNER_PAT }}
          server_type: cpx31 # 4 vCPU, 8 GB RAM (~0.015 € / Stunde)

  heavy-build:
    needs: [inspect, spawn-runner]
    if: always() && needs.spawn-runner.result == 'success'
    runs-on: ${{ needs.spawn-runner.outputs.runner_label }}
    steps:
      - uses: actions/checkout@v4
      - run: npm test

  teardown-runner:
    needs: [spawn-runner, heavy-build]
    if: always() && needs.spawn-runner.result == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: adrian-wulf/blitzrunner/actions/hetzner-runner@v1
        with:
          mode: stop
          hcloud_token: ${{ secrets.HCLOUD_TOKEN }}
          server_id: ${{ needs.spawn-runner.outputs.server_id }}
```

---

## ☕ Projekt unterstützen & RobinHood dev

* ☕ **Buy Me a Coffee:** [buymeacoffee.com/adrianwulf](https://buymeacoffee.com/adrianwulf)
* 💖 **GitHub Sponsors:** [github.com/sponsors/adrian-wulf](https://github.com/sponsors/adrian-wulf)

### Was bedeutet die RobinHood dev Philosophie?
> **„Entwickler und kleine Teams sollten keine überteuerten Konzernabgaben für grundlegende CI/CD-Optimierungen zahlen müssen.”**

---

## ⚖️ Impressum & Rechtliche Hinweise (§ 5 DDG / MIT)

* **Autor:** Adrian Wulf
* **Kontakt:** `contact@social-wulf.eu` | [social-wulf.eu](https://social-wulf.eu)
* **Lizenz:** [MIT Lizenz](LICENSE) — 100% frei und Open Source.
