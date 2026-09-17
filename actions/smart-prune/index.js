#!/usr/bin/env node
/**
 * RobinHood Smart Prune (GitHub Action)
 * Philosophy: RobinHood dev (https://social-wulf.eu)
 * 
 * Intelligent monorepo differential change detection.
 * Slashes unnecessary CI runs by pruning unchanged components.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getInput(name, defaultValue = '') {
  const envKey = `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
  const val = process.env[envKey];
  return (val !== undefined && val.trim() !== '') ? val.trim() : defaultValue;
}

function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (outputFile && fs.existsSync(outputFile)) {
    fs.appendFileSync(outputFile, `${name}=${strVal}\n`, 'utf8');
  }
  console.log(`[Output] ${name}=${strVal}`);
}

function logInfo(msg) {
  console.log(`\x1b[32m[RobinHood Smart Prune]\x1b[0m ${msg}`);
}

function logWarn(msg) {
  console.log(`\x1b[33m[RobinHood Smart Prune WARNING]\x1b[0m ${msg}`);
}

// Minimalistic glob to regex converter supporting **, *, ?, extensions
function globToRegex(glob) {
  let cleaned = glob.trim().replace(/^['"]|['"]$/g, '');
  if (cleaned.startsWith('./')) cleaned = cleaned.slice(2);
  
  // Escape regex special chars except * and ?
  let reStr = '';
  let i = 0;
  while (i < cleaned.length) {
    const c = cleaned[i];
    if (c === '*' && cleaned[i + 1] === '*') {
      if (cleaned[i + 2] === '/') {
        reStr += '(?:.+/)?';
        i += 3;
      } else {
        reStr += '.*';
        i += 2;
      }
    } else if (c === '*') {
      reStr += '[^/]*';
      i++;
    } else if (c === '?') {
      reStr += '[^/]';
      i++;
    } else if (['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'].includes(c)) {
      reStr += '\\' + c;
      i++;
    } else {
      reStr += c;
      i++;
    }
  }
  return new RegExp(`^${reStr}$`);
}

function parseFilters(inputStr) {
  const filters = {};
  let currentKey = null;

  const lines = inputStr.split('\n');
  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Pattern 1: key: ['pattern1', 'pattern2'] or key: ["pattern1"]
    const inlineMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*\[(.*)\]$/);
    if (inlineMatch) {
      const key = inlineMatch[1];
      const patterns = inlineMatch[2]
        .split(',')
        .map(p => p.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      filters[key] = patterns;
      currentKey = null;
      continue;
    }

    // Pattern 2: key: pattern (single inline pattern)
    const singleInline = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/);
    if (singleInline && !singleInline[2].startsWith('-')) {
      const key = singleInline[1];
      const pattern = singleInline[2].trim().replace(/^['"]|['"]$/g, '');
      filters[key] = [pattern];
      currentKey = null;
      continue;
    }

    // Pattern 3: key: (start of list)
    const keyMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      filters[currentKey] = filters[currentKey] || [];
      continue;
    }

    // Pattern 4: - pattern (list item under currentKey)
    if (line.startsWith('-') && currentKey) {
      const pattern = line.slice(1).trim().replace(/^['"]|['"]$/g, '');
      if (pattern) {
        filters[currentKey].push(pattern);
      }
      continue;
    }
  }

  return filters;
}

function getBaseRef(configuredBaseRef) {
  if (configuredBaseRef) return configuredBaseRef;

  // GitHub Actions Event data
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    try {
      const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
      if (eventData.pull_request && eventData.pull_request.base && eventData.pull_request.base.sha) {
        return eventData.pull_request.base.sha;
      }
      if (eventData.before && eventData.before !== '0000000000000000000000000000000000000000') {
        return eventData.before;
      }
    } catch (e) {
      logWarn(`Could not parse GITHUB_EVENT_PATH: ${e.message}`);
    }
  }

  // Fallbacks using git
  try {
    const parentCommit = execSync('git rev-parse HEAD~1 2>/dev/null').toString().trim();
    if (parentCommit) return parentCommit;
  } catch (_) {}

  return 'HEAD^';
}

function getChangedFiles(baseRef) {
  try {
    // Check if baseRef exists in local git
    execSync(`git cat-file -e ${baseRef} 2>/dev/null`);
  } catch (_) {
    // If not, try to fetch it
    try {
      logInfo(`Base ref ${baseRef} not found locally, attempting fetch...`);
      execSync(`git fetch --depth=10 origin ${baseRef} 2>/dev/null`);
    } catch (e) {
      logWarn(`Fetch failed, diffing against previous commit HEAD~1`);
      baseRef = 'HEAD~1';
    }
  }

  try {
    const output = execSync(`git diff --name-only ${baseRef} HEAD`).toString().trim();
    if (!output) return [];
    return output.split('\n').map(f => f.trim()).filter(Boolean);
  } catch (err) {
    logWarn(`git diff failed against ${baseRef}. Returning all files changed as safe fallback.`);
    return null; // Signals fallback
  }
}

function matchesAny(file, regexes) {
  return regexes.some(re => re.test(file));
}

function main() {
  logInfo('Initializing RobinHood Smart Prune...');
  
  const filtersInput = getInput('filters');
  const configuredBaseRef = getInput('base_ref');
  const shouldSummary = getInput('summary', 'true') === 'true';

  if (!filtersInput) {
    console.error('Error: "filters" input is required.');
    process.exit(1);
  }

  const filters = parseFilters(filtersInput);
  const filterKeys = Object.keys(filters);
  logInfo(`Configured modules to track: ${filterKeys.join(', ')}`);

  const baseRef = getBaseRef(configuredBaseRef);
  logInfo(`Comparing against base ref: ${baseRef}`);

  const changedFiles = getChangedFiles(baseRef);

  const filterOutputs = {};
  const changedModules = [];
  const moduleFileMatches = {};

  if (changedFiles === null) {
    // Fallback: trigger all
    logWarn('Change detection could not reliably run. Enabling all modules as safe fallback.');
    for (const key of filterKeys) {
      filterOutputs[key] = true;
      changedModules.push(key);
      setOutput(key, 'true');
    }
    setOutput('any_changed', 'true');
    setOutput('changed_modules', filterKeys);
    setOutput('all_outputs', filterOutputs);
    return;
  }

  logInfo(`Found ${changedFiles.length} changed files in diff:`);
  if (changedFiles.length <= 15) {
    changedFiles.forEach(f => console.log(`  • ${f}`));
  } else {
    changedFiles.slice(0, 10).forEach(f => console.log(`  • ${f}`));
    console.log(`  ... and ${changedFiles.length - 10} more files`);
  }

  // Compile regexes
  for (const [key, patterns] of Object.entries(filters)) {
    const regexes = patterns.map(globToRegex);
    const matches = changedFiles.filter(f => matchesAny(f, regexes));
    
    if (matches.length > 0) {
      filterOutputs[key] = true;
      changedModules.push(key);
      moduleFileMatches[key] = matches;
      setOutput(key, 'true');
    } else {
      filterOutputs[key] = false;
      setOutput(key, 'false');
    }
  }

  const anyChanged = changedModules.length > 0;
  setOutput('any_changed', anyChanged ? 'true' : 'false');
  setOutput('changed_modules', changedModules);
  setOutput('all_outputs', filterOutputs);

  logInfo(`Scan finished. Changed modules: [${changedModules.join(', ')}] | Pruned: [${filterKeys.filter(k => !changedModules.includes(k)).join(', ')}]`);

  // Write GitHub Step Summary
  if (shouldSummary && process.env.GITHUB_STEP_SUMMARY) {
    const prunedModules = filterKeys.filter(k => !changedModules.includes(k));
    const estimatedSavedMinutes = prunedModules.length * 5; // Conservative average of 5m per heavy job
    const estimatedSavingsUsd = (estimatedSavedMinutes * 0.008).toFixed(2);

    let markdown = `## 🏹 RobinHood dev // Smart Prune Report\n\n`;
    markdown += `> *Eliminating unnecessary cloud CI compute and corporate markups.* ([RobinHood dev](https://social-wulf.eu))\n\n`;
    markdown += `| Component / Module | Status | Action | Triggering Files |\n`;
    markdown += `| :--- | :---: | :---: | :--- |\n`;

    for (const key of filterKeys) {
      if (changedModules.includes(key)) {
        const count = moduleFileMatches[key].length;
        const sample = moduleFileMatches[key].slice(0, 2).join(', ') + (count > 2 ? ` (+${count - 2} more)` : '');
        markdown += `| **${key}** | ⚡ **Changed** | ✅ Run Job | \`${sample}\` |\n`;
      } else {
        markdown += `| **${key}** | 🛡️ **Unchanged** | ⏭️ **Pruned (Skipped)** | *None (0 changes)* |\n`;
      }
    }

    markdown += `\n### 📊 Impact & Savings on this run\n`;
    markdown += `* 🛡️ **Jobs Pruned:** **${prunedModules.length} of ${filterKeys.length}** components skipped.\n`;
    markdown += `* ⏱️ **Estimated CI Time Saved:** **~${estimatedSavedMinutes} minutes**.\n`;
    markdown += `* 💰 **Estimated Cloud Haracz Saved:** **~$${estimatedSavingsUsd} USD**.\n\n`;
    markdown += `*Powered by [RobinHood dev](https://social-wulf.eu) — Open Source developer sovereignty.*`;

    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n', 'utf8');
    } catch (e) {
      logWarn(`Failed to write step summary: ${e.message}`);
    }
  }
}

main();
