#!/usr/bin/env node
/**
 * BlitzRunner Ephemeral Cloud Runner (GitHub Action)
 * Philosophy: RobinHood dev (https://social-wulf.eu)
 * Author: Adrian Wulf (https://github.com/adrian-wulf/blitzrunner)
 * 
 * Auto-spawns disposable, high-performance VMs on Hetzner Cloud
 * to replace expensive and slow GitHub hosted runners.
 */

const fs = require('fs');

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
  console.log(`\x1b[34m[BlitzRunner]\x1b[0m ${msg}`);
}

function logSuccess(msg) {
  console.log(`\x1b[32m[BlitzRunner SUCCESS]\x1b[0m ${msg}`);
}

function logWarn(msg) {
  console.log(`\x1b[33m[BlitzRunner WARNING]\x1b[0m ${msg}`);
}

function logError(msg) {
  console.error(`\x1b[31m[BlitzRunner ERROR]\x1b[0m ${msg}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. Fetch GitHub Actions registration token
async function getGitHubRegistrationToken(repo, ghToken) {
  const url = `https://api.github.com/repos/${repo}/actions/runners/registration-token`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ghToken}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'RobinHood-CI-Runner',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to get runner registration token from GitHub: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.token;
}

// 2. Provision VM on Hetzner Cloud
async function createHetznerServer({ hcloudToken, name, serverType, location, image, userData, runId }) {
  const url = 'https://api.hetzner.cloud/v1/servers';
  const payload = {
    name,
    server_type: serverType,
    location,
    image,
    user_data: userData,
    labels: {
      'managed_by': 'robinhood-ci',
      'run_id': String(runId)
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${hcloudToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Hetzner Cloud API error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return data.server;
}

// 3. Poll GitHub API until runner is online
async function waitForRunnerOnline(repo, ghToken, runnerName, timeoutSeconds) {
  const startTime = Date.now();
  const maxTime = timeoutSeconds * 1000;
  const url = `https://api.github.com/repos/${repo}/actions/runners`;

  logInfo(`Waiting for runner "${runnerName}" to report online to GitHub Actions (timeout: ${timeoutSeconds}s)...`);

  while (Date.now() - startTime < maxTime) {
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${ghToken}`,
          'Accept': 'application/vnd.github+json',
          'User-Agent': 'RobinHood-CI-Runner',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const runner = data.runners && data.runners.find(r => r.name === runnerName);
        if (runner && runner.status === 'online') {
          logSuccess(`Runner "${runnerName}" is online and ready! (Took ${Math.round((Date.now() - startTime) / 1000)}s)`);
          return runner;
        }
      }
    } catch (e) {
      logWarn(`Error polling GitHub runners API: ${e.message}`);
    }

    await sleep(5000);
    process.stdout.write('.');
  }

  throw new Error(`Timeout waiting for runner "${runnerName}" to register within ${timeoutSeconds}s.`);
}

// 4. Teardown / Destroy VM on Hetzner Cloud
async function deleteHetznerServer(hcloudToken, serverId) {
  const url = `https://api.hetzner.cloud/v1/servers/${serverId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${hcloudToken}`
    }
  });

  if (res.status === 404) {
    logInfo(`Server ${serverId} was already deleted.`);
    return true;
  }

  if (!res.ok && res.status !== 204 && res.status !== 200) {
    const errText = await res.text();
    throw new Error(`Failed to delete Hetzner server ${serverId}: ${res.status} ${errText}`);
  }

  logSuccess(`Hetzner server ${serverId} destroyed successfully. Cloud compute billing stopped.`);
  return true;
}

// Build Cloud-Init Bash Script
function buildUserData({ repo, regToken, runnerName, label, customLabels, runnerVersion }) {
  const labelsList = ['self-hosted', 'linux', 'x64', 'blitz-ephemeral', label];
  if (customLabels) {
    customLabels.split(',').map(l => l.trim()).filter(Boolean).forEach(l => labelsList.push(l));
  }
  const labelsStr = labelsList.join(',');

  return `#!/bin/bash
set -euxo pipefail

# System update & requirements
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl tar jq git build-essential ca-certificates libicu-dev

# Setup runner directory
mkdir -p /opt/actions-runner && cd /opt/actions-runner
curl -o actions-runner-linux-x64.tar.gz -L "https://github.com/actions/runner/releases/download/v${runnerVersion}/actions-runner-linux-x64-${runnerVersion}.tar.gz"
tar xzf ./actions-runner-linux-x64.tar.gz

# Install runner dependencies
./bin/installdependencies.sh

# Create dedicated runner user
useradd -m -s /bin/bash runner || true
chown -R runner:runner /opt/actions-runner

# Configure runner as ephemeral
su - runner -c "cd /opt/actions-runner && ./config.sh --url https://github.com/${repo} --token ${regToken} --name '${runnerName}' --labels '${labelsStr}' --ephemeral --unattended --replace"

# Run the runner in foreground
su - runner -c "cd /opt/actions-runner && ./run.sh"
`;
}

async function handleStart() {
  const hcloudToken = getInput('hcloud_token');
  const ghToken = getInput('github_token') || process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID || Math.floor(Math.random() * 1000000);
  const serverType = getInput('server_type', 'cpx31');
  const location = getInput('location', 'fsn1');
  const image = getInput('image', 'ubuntu-24.04');
  const customLabels = getInput('labels', '');
  const runnerVersion = getInput('runner_version', '2.321.0');
  const timeoutSeconds = parseInt(getInput('wait_timeout_seconds', '180'), 10);

  if (!hcloudToken) {
    throw new Error('Input "hcloud_token" is required for mode: start');
  }
  if (!ghToken) {
    throw new Error('GitHub token is required to register runner. Pass "github_token" input or ensure GITHUB_TOKEN has permissions.');
  }
  if (!repo) {
    throw new Error('GITHUB_REPOSITORY environment variable is missing.');
  }

  const uniqueSuffix = Math.random().toString(36).substring(2, 7);
  const runnerName = `blitz-${runId}-${uniqueSuffix}`;
  const uniqueLabel = `blitz-${runId}-${uniqueSuffix}`;

  logInfo(`Generating registration token for repository "${repo}"...`);
  const regToken = await getGitHubRegistrationToken(repo, ghToken);

  logInfo(`Configuring cloud-init for runner "${runnerName}" with label "${uniqueLabel}"...`);
  const userData = buildUserData({
    repo,
    regToken,
    runnerName,
    label: uniqueLabel,
    customLabels,
    runnerVersion
  });

  logInfo(`Provisioning Hetzner Cloud VM (type: ${serverType}, location: ${location}, image: ${image})...`);
  const server = await createHetznerServer({
    hcloudToken,
    name: runnerName,
    serverType,
    location,
    image,
    userData,
    runId
  });

  const serverIp = server.public_net?.ipv4?.ip || 'N/A';
  logSuccess(`VM provisioned! Server ID: ${server.id} (IP: ${serverIp})`);

  setOutput('label', uniqueLabel);
  setOutput('server_id', server.id);
  setOutput('server_ip', serverIp);

  // Wait for runner to join GitHub
  await waitForRunnerOnline(repo, ghToken, runnerName, timeoutSeconds);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summaryMd = `### ⚡ BlitzRunner // Ephemeral Cloud Runner Spawned\n` +
      `* **Provider:** Hetzner Cloud (${location})\n` +
      `* **Instance:** \`${serverType}\` (Disposable)\n` +
      `* **Target Label:** \`${uniqueLabel}\`\n` +
      `* **Server ID:** \`${server.id}\` (IP: \`${serverIp}\`)\n` +
      `* **Status:** 🟢 Online & Processing Job\n\n` +
      `*Powered by [BlitzRunner](https://github.com/adrian-wulf/blitzrunner) & [RobinHood dev](https://social-wulf.eu)*\n`;
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMd, 'utf8');
    } catch (_) {}
  }
}

async function handleStop() {
  const hcloudToken = getInput('hcloud_token');
  const serverId = getInput('server_id');

  if (!hcloudToken) {
    throw new Error('Input "hcloud_token" is required for mode: stop');
  }
  if (!serverId) {
    logWarn('No server_id provided to destroy. Skipping.');
    return;
  }

  logInfo(`Teardown requested for Hetzner server ID: ${serverId}...`);
  await deleteHetznerServer(hcloudToken, serverId);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const summaryMd = `### 🛡️ BlitzRunner // Ephemeral Runner Destroyed\n` +
      `* **Server ID:** \`${serverId}\`\n` +
      `* **Status:** 🛑 Terminated (Billing stopped)\n` +
      `* **Cost Estimate:** ~0.002 € – 0.005 € for job duration.\n\n` +
      `*Powered by [BlitzRunner](https://github.com/adrian-wulf/blitzrunner) & [RobinHood dev](https://social-wulf.eu)*\n`;
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMd, 'utf8');
    } catch (_) {}
  }
}

async function main() {
  const mode = getInput('mode', 'start').toLowerCase();
  logInfo(`Starting BlitzRunner Action in mode: "${mode}"`);

  try {
    if (mode === 'start') {
      await handleStart();
    } else if (mode === 'stop') {
      await handleStop();
    } else {
      throw new Error(`Unknown mode: "${mode}". Supported modes are "start" and "stop".`);
    }
  } catch (err) {
    logError(err.message);
    process.exit(1);
  }
}

main();
