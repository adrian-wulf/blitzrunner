# 🏹 RobinHood CI // Suwerenne, Błyskawiczne i Tanie CI/CD

> **Filozofia RobinHood dev:**  
> *„Programiści i małe zespoły nie powinni płacić korporacyjnych haraczy za minuty w chmurze i narzędzia optymalizacyjne. GitHub celowo oferuje wolne maszyny z 2 vCPU i odpala testy na ślepo, aby jak najszybciej wyczerpać darmowe pule i naliczać opłaty. Z kolei komercyjne platformy (WarpBuild, RunsOn, Nx Cloud) żądają od 50 do 500 USD miesięcznie za same optymalizacje. RobinHood CI daje Ci pełną suwerenność za 0 zł w otwartym kodzie Open Source.”*

---

## 🎯 Co rozwiązuje RobinHood CI?

1. **Koniec z bezmyślnym odpalaniem testów (Tarcza):**
   Jeśli zmieniłeś jedną linijkę w dokumentacji lub kodzie frontendu, dlaczego Twoje CI kompiluje aplikację mobilną i backend przez 15 minut? Moduł **Smart Prune** analizuje `git diff` w 3 sekundy i wycina do 70% niepotrzebnych zadań.
2. **Koniec z powolnymi i drogimi maszynami (Miecz):**
   Ciężkie zadania kompilacji (Gradle, Docker build, testy E2E) odpalają się na jednorazowej, potężnej maszynie **Hetzner Cloud (np. 4–8 vCPU, 16 GB RAM)**. Maszyna wstaje w 15 sekund, mieli zadanie 4 razy szybciej i natychmiast się niszczy.
3. **Architektura Zero-Server (Brak serwera 24/7):**
   Nie musisz utrzymywać ani opłacać żadnego stałego serwera VPS. Płacisz wyłącznie za te 2-3 minuty, kiedy maszyna realnie wykonuje testy (koszt: **~0,003 € za build**).

---

## 📊 Porównanie Kosztów i Wydajności

| Parametr | Standardowy GitHub Actions | Komercyjne SaaSy (WarpBuild / RunsOn) | 🏹 RobinHood CI (Hetzner) |
| :--- | :---: | :---: | :---: |
| **Abonament miesięczny** | $0 (do limitu) | **$50 – $250 / mc** | **0 zł (Open Source MIT)** |
| **Koszt minuty (4–8 vCPU)** | ~$0.016 – $0.032 / min | Marża dostawcy + chmura | **~0.00025 € / min** (ceny Hetznera) |
| **Filtr zmian (Smart Prune)** | ❌ Brak (odpala wszystko) | ⚠️ Płatny dodatek | ✅ **Wbudowany (3 sekundy)** |
| **Wymagany stały serwer** | Nie | Zależy od dostawcy | **NIE (Architektura Zero-Server)** |
| **Prywatność i Kontrola** | Chmura Microsoftu | Serwery pośrednika | **100% Twoje konto i API** |

---

## 🚀 Szybki Start (Przykładowy Workflow)

Dodaj poniższy plik do swojego repozytorium: `.github/workflows/ci.yml`

```yaml
name: RobinHood CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  # =========================================================================
  # KROK 1: TARCZA (Smart Prune - darmowy runner GitHuba, ~3 sekundy)
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

      - name: Analiza zmian w monorepo
        uses: adrian-wulf/robinhood-ci/actions/smart-prune@v1
        id: prune
        with:
          filters: |
            mobile: ['apps/mobile/**', 'packages/mobile-core/**']
            web: ['apps/web/**', 'packages/ui-kit/**']
            api: ['services/api/**', 'packages/shared-models/**']

  # =========================================================================
  # KROK 2: MIECZ (Odpala się TYLKO gdy zmieniono kod, na taniej bestii 8 vCPU)
  # =========================================================================
  spawn-runner:
    name: 🚀 Uruchomienie jednorazowej maszyny Cloud
    needs: inspect
    # Odpal tylko jeśli wykryto realne zmiany w ciężkich modułach!
    if: needs.inspect.outputs.run_mobile == 'true' || needs.inspect.outputs.run_api == 'true'
    runs-on: ubuntu-latest
    outputs:
      runner_label: ${{ steps.spawn.outputs.label }}
      server_id: ${{ steps.spawn.outputs.server_id }}
    steps:
      - name: Powołanie maszyny na Hetznerze
        uses: adrian-wulf/robinhood-ci/actions/hetzner-runner@v1
        id: spawn
        with:
          mode: start
          hcloud_token: ${{ secrets.HCLOUD_TOKEN }}
          github_token: ${{ secrets.GH_RUNNER_PAT }}
          server_type: cpx31 # 4 vCPU, 8 GB RAM (~0.015 € / godzinę)
          location: fsn1

  heavy-build:
    name: ⚡ Kompilacja i Testy (Moc Hetznera)
    needs: [inspect, spawn-runner]
    if: always() && needs.spawn-runner.result == 'success'
    runs-on: ${{ needs.spawn-runner.outputs.runner_label }}
    steps:
      - uses: actions/checkout@v4

      - name: Kompilacja kodu na 4 rdzeniach
        run: |
          echo "Build działa na dedykowanej maszynie chmurowej!"
          nproc
          # npm test / ./gradlew test / docker build

  teardown-runner:
    name: 🛑 Zniszczenie maszyny i zatrzymanie naliczania opłat
    needs: [spawn-runner, heavy-build]
    if: always() && needs.spawn-runner.result == 'success'
    runs-on: ubuntu-latest
    steps:
      - name: Usunięcie serwera z Hetznera
        uses: adrian-wulf/robinhood-ci/actions/hetzner-runner@v1
        with:
          mode: stop
          hcloud_token: ${{ secrets.HCLOUD_TOKEN }}
          server_id: ${{ needs.spawn-runner.outputs.server_id }}
```

---

## 🛠️ Narzędzie Konsolowe (CLI)

Możesz sprawdzić potencjalne oszczędności lub przetestować filtr zmian lokalnie przed wysłaniem kodu:

```bash
# Sprawdź, które moduły zostaną pominięte względem gałęzi main
npx robinhood-ci diff

# Oblicz szacowane oszczędności w skali miesiąca
npx robinhood-ci estimate
```

---

## 🔐 Wymagane Uprawnienia (Secrets)

W ustawieniach repozytorium GitHub (**Settings -> Secrets and variables -> Actions**) dodaj:
1. `HCLOUD_TOKEN`: Twój darmowy token API z panelu Hetzner Cloud (z uprawnieniem Read & Write).
2. `GH_RUNNER_PAT`: Osobisty token dostępu GitHub (PAT) z uprawnieniem `repo` (lub `manage_runners`), aby jednorazowa maszyna mogła zarejestrować się jako runner.

---

## 🌐 Ekosystem RobinHood dev

RobinHood CI jest częścią rodziny bezkompromisowych, wolnych narzędzi dla twórców i deweloperów:
* 🛡️ **[Nachtwache](https://github.com/adrian-wulf/nachtwache):** Autonomiczny, ultralekki zamiennik Sentry (~15 MB RAM) z automatyczną diagnozą błędów przez AI.
* 🚀 **[Wulf Lead.er](https://lead.social-wulf.eu):** Autonomiczny radar leadowy B2B Open Source bez drogich subskrypcji.
* 🌐 **[Centralny Wulf Hub](https://social-wulf.eu):** Strona główna ekosystemu i wizytówka projektów.

---

## 📄 Licencja
Wydano na permisywnej licencji **MIT License**. Możesz używać, modyfikować i wdrażać komercyjnie całkowicie za darmo.
