# 🏹 RobinHood CI // Sovereign, Lightning-Fast & Cost-Zero CI/CD

> **The RobinHood dev Philosophy:**  
> *“Developers and small teams should never pay corporate ransoms for cloud compute minutes and basic optimization tooling. Big Tech deliberately provisions throttled 2-vCPU runners and triggers workflows blindly to rapidly burn your free quotas and bill your card. Commercial platforms (WarpBuild, RunsOn, Nx Cloud) then charge $50 to $500 monthly just to fix what Big Tech broke. RobinHood CI hands sovereign, zero-cost CI optimization back to the developer community under open-source MIT.”*

---

## 🎯 Key Features

1. **🛡️ Smart Prune (`actions/smart-prune`):**
   Why rebuild your entire mobile app or backend when you only changed a line of docs or UI CSS? Analyzes `git diff` in ~3 seconds on GitHub's free tier and cancels up to 70% of redundant jobs before they start.
2. **⚔️ Ephemeral Cloud Runner (`actions/hetzner-runner`):**
   Heavy tasks (Gradle builds, Docker layer caching, E2E tests) launch on disposable high-performance **Hetzner Cloud VMs (4–8 vCPUs, 16 GB RAM)** for pennies. Builds run 4x faster and the machine self-destructs immediately when finished.
3. **⚡ Zero-Server Architecture:**
   No permanent VPS to pay for or maintain 24/7. You only pay for the 2–3 minutes the disposable VM actually processes your build (approx. **~0.003 € per build**).

---

## 📊 Comparison Matrix

| Feature | Standard GitHub Actions | Commercial SaaSes (RunsOn / WarpBuild) | 🏹 RobinHood CI (Hetzner) |
| :--- | :---: | :---: | :---: |
| **Monthly Subscription** | Free up to limits | **$50 – $250 / mo** | **$0 (100% Open Source MIT)** |
| **Minute Cost (4–8 vCPU)** | ~$0.016 – $0.032 / min | Vendor markup + cloud | **~0.00025 € / min** (Direct bare-metal cloud) |
| **Diff Pruning (Smart Filter)** | ❌ None (runs all) | ⚠️ Paid add-on | ✅ **Built-in (~3s detection)** |
| **Dedicated Server Required** | No | Varies | **NO (Zero-Server Architecture)** |
| **Privacy & Infrastructure Control** | Microsoft Cloud | Third-party proxy | **100% Direct API on your account** |

---

## 🚀 Quick Start (`.github/workflows/ci.yml`)

```yaml
name: RobinHood CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # =========================================================================
  # STEP 1: SHIELD (Smart Prune - runs on free GitHub runner in ~3s)
  # =========================================================================
  inspect:
    name: 🛡️ RobinHood Smart Prune
    runs-on: ubuntu-latest
    outputs:
      run_mobile: ${{ steps.prune.outputs.mobile }}
      run_web: ${{ steps.prune.outputs.web }}
      run_api: ${{ steps.prune.outputs.api }}
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 20

      - name: Analyze Monorepo Changes
        uses: adrian-wulf/robinhood-ci/actions/smart-prune@v1
        id: prune
        with:
          filters: |
            mobile: ['apps/mobile/**', 'packages/mobile-core/**']
            web: ['apps/web/**', 'packages/ui-kit/**']
            api: ['services/api/**', 'packages/shared-models/**']

  # =========================================================================
  # STEP 2: SWORD (Launches ONLY when heavy code changed, on 8-core beast)
  # =========================================================================
  spawn-runner:
    name: 🚀 Launch Disposable Cloud Runner
    needs: inspect
    if: needs.inspect.outputs.run_mobile == 'true' || needs.inspect.outputs.run_api == 'true'
    runs-on: ubuntu-latest
    outputs:
      runner_label: ${{ steps.spawn.outputs.label }}
      server_id: ${{ steps.spawn.outputs.server_id }}
    steps:
      - name: Provision Ephemeral Hetzner VM
        uses: adrian-wulf/robinhood-ci/actions/hetzner-runner@v1
        id: spawn
        with:
          mode: start
          hcloud_token: ${{ secrets.HCLOUD_TOKEN }}
          github_token: ${{ secrets.GH_RUNNER_PAT }}
          server_type: cpx31 # 4 vCPU, 8 GB RAM (~0.015 € / hr)
          location: fsn1

  heavy-build:
    name: ⚡ High-Speed Compilation & Test
    needs: [inspect, spawn-runner]
    if: always() && needs.spawn-runner.result == 'success'
    runs-on: ${{ needs.spawn-runner.outputs.runner_label }}
    steps:
      - uses: actions/checkout@v4

      - name: Run Build & Tests
        run: |
          echo "Executing on dedicated cloud compute!"
          nproc
          # Run: npm test / ./gradlew test / docker build

  teardown-runner:
    name: 🛑 Destroy VM & Stop Billing
    needs: [spawn-runner, heavy-build]
    if: always() && needs.spawn-runner.result == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: Teardown Server
        uses: adrian-wulf/robinhood-ci/actions/hetzner-runner@v1
        with:
          mode: stop
          hcloud_token: ${{ secrets.HCLOUD_TOKEN }}
          server_id: ${{ needs.spawn-runner.outputs.server_id }}
```

---

## 🛠️ CLI Diagnostics

Inspect local diffs and calculate monthly savings before pushing:

```bash
# Test which modules will be pruned locally
npx robinhood-ci diff

# Calculate monthly ROI vs standard GitHub runners
npx robinhood-ci estimate
```

---

## 🔐 Required Secrets

Configure these in your GitHub repository (**Settings -> Secrets and variables -> Actions**):
1. `HCLOUD_TOKEN`: Your Hetzner Cloud API token (Read & Write permissions).
2. `GH_RUNNER_PAT`: A GitHub Personal Access Token (PAT) with `repo` scope to authorize the ephemeral runner.

---

## 🌐 The RobinHood dev Ecosystem

RobinHood CI belongs to a suite of sovereign, free developer tools:
* 🛡️ **[Nachtwache](https://github.com/adrian-wulf/nachtwache):** Ultra-lightweight Sentry alternative (~15 MB RAM) with autonomous AI error fixes.
* 🚀 **[Wulf Lead.er](https://lead.social-wulf.eu):** Autonomous B2B lead intelligence radar without monthly subscription fees.
* 🌐 **[Central Wulf Hub](https://social-wulf.eu):** Main ecosystem hub and project showcase.

---

## 📄 License
Released under the permissive **MIT License**. Free for personal and commercial use.
