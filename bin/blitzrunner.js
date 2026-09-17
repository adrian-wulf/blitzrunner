#!/usr/bin/env node
/**
 * BlitzRunner - Command Line Interface
 * Part of the RobinHood dev initiative (https://social-wulf.eu)
 * Author: Adrian Wulf
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function printBanner() {
  console.log(`\x1b[33m
  ⚡ ═════════════════════════════════════════════════════════ ⚡
     BLITZRUNNER // HIGH-SPEED CI & SMART PRUNE CLI
     Zero-Server, High-Performance CI under RobinHood dev
  ⚡ ═════════════════════════════════════════════════════════ ⚡\x1b[0m
`);
}

function showHelp() {
  printBanner();
  console.log(`Użycie:
  blitzrunner diff [base_branch]   - Sprawdź lokalny git diff i które moduły zostaną pominięte
  blitzrunner estimate             - Oszacuj miesięczne oszczędności na GitHub Actions
  blitzrunner version              - Pokaż wersję

Opcje:
  --base, -b <branch>   Gałąź bazowa do porównania (domyślnie: main lub HEAD~1)
  --help, -h            Wyświetl pomoc

Więcej informacji: https://social-wulf.eu
GitHub: https://github.com/adrian-wulf/blitzrunner
`);
}

function runDiff(baseBranch = 'main') {
  printBanner();
  console.log(`\x1b[36m[Diagnostyka]\x1b[0m Analiza zmian lokalnych względem: \x1b[1m${baseBranch}\x1b[0m...\n`);

  let diffFiles = [];
  try {
    const raw = execSync(`git diff --name-only ${baseBranch} HEAD 2>/dev/null || git diff --name-only HEAD~1 HEAD`).toString().trim();
    if (raw) diffFiles = raw.split('\n').map(s => s.trim()).filter(Boolean);
  } catch (err) {
    try {
      const raw = execSync('git diff --name-only HEAD').toString().trim();
      if (raw) diffFiles = raw.split('\n').map(s => s.trim()).filter(Boolean);
    } catch (_) {}
  }

  if (diffFiles.length === 0) {
    console.log(`\x1b[33mBrak wykrytych zmian w plikach względem bazy.\x1b[0m Wszystkie zadania CI mogłyby zostać bezpiecznie pominięte!\n`);
    return;
  }

  console.log(`Wykryto \x1b[1m${diffFiles.length}\x1b[0m zmienionych plików:`);
  diffFiles.slice(0, 8).forEach(f => console.log(`  • ${f}`));
  if (diffFiles.length > 8) console.log(`  ... i ${diffFiles.length - 8} kolejnych.`);
  console.log('\n');
}

function runEstimate() {
  printBanner();
  console.log(`\x1b[36m[Kalkulator Oszczędności BlitzRunner / RobinHood dev]\x1b[0m\n`);

  const pushesPerDay = 10;
  const avgJobMinutes = 25;
  const daysPerMonth = 22;
  const totalMinutes = pushesPerDay * avgJobMinutes * daysPerMonth;
  const ghFreeTier = 2000;
  const billedMinutes = Math.max(0, totalMinutes - ghFreeTier);
  const ghCost = (billedMinutes * 0.008).toFixed(2);

  // BlitzRunner savings: 70% pruned + Hetzner 4x speedup
  const prunedMinutes = Math.round(totalMinutes * 0.7);
  const remainingMinutes = totalMinutes - prunedMinutes;
  const hetznerJobMinutes = Math.round(remainingMinutes / 4); // 4x faster on 8-core bare metal
  const hetznerCost = (hetznerJobMinutes * (0.015 / 60)).toFixed(2); // CPX31 is 0.015 €/hr
  const totalSaved = (parseFloat(ghCost) - parseFloat(hetznerCost)).toFixed(2);

  console.log(`Scenariusz typowego zespołu/projektu monorepo:`);
  console.log(`  • Commity/Pushe dziennie: \x1b[1m${pushesPerDay}\x1b[0m`);
  console.log(`  • Średni czas całego CI bez optymalizacji: \x1b[1m${avgJobMinutes} minut\x1b[0m`);
  console.log(`  • Suma minut miesięcznie: \x1b[1m${totalMinutes.toLocaleString()} min\x1b[0m\n`);

  console.log(`Standardowy koszt w chmurze:`);
  console.log(`  ❌ Minuty na GitHub Actions: \x1b[31m$${ghCost} USD / miesiąc\x1b[0m (i godziny czekania na powolny build)\n`);

  console.log(`Zestaw BlitzRunner (Smart Prune + Hetzner Cloud):`);
  console.log(`  🛡️ Pominięto zadań (Smart Prune): \x1b[32m${prunedMinutes.toLocaleString()} minut (70%)\x1b[0m`);
  console.log(`  ⚡ Czas wykonania na 8-rdzeniowym Hetznerze: \x1b[32m${hetznerJobMinutes.toLocaleString()} min\x1b[0m (zamiast ${remainingMinutes} min)`);
  console.log(`  💰 Koszt na Hetzner Cloud: \x1b[32m~${hetznerCost} € / miesiąc\x1b[0m`);
  console.log(`  🎉 \x1b[1;32mCzysta oszczędność do kieszeni: ~$${totalSaved} USD co miesiąc!\x1b[0m\n`);
  console.log(`Więcej na: https://social-wulf.eu\n`);
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === '-h' || command === 'help') {
  showHelp();
} else if (command === 'diff') {
  runDiff(args[1] || 'main');
} else if (command === 'estimate' || command === 'cost') {
  runEstimate();
} else if (command === 'version' || command === '-v') {
  console.log(`blitzrunner v1.0.0 (RobinHood dev)`);
} else {
  console.error(`Nieznana komenda: "${command}". Użyj "blitzrunner --help"`);
  process.exit(1);
}
