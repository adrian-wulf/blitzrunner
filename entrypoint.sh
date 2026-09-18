#!/usr/bin/env bash
set -e

# Sync Docker socket group if mounted
if [ -e /var/run/docker.sock ]; then
    DOCKER_GID=$(stat -c '%g' /var/run/docker.sock)
    if ! getent group "$DOCKER_GID" >/dev/null 2>&1; then
        sudo groupadd -g "$DOCKER_GID" docker-host >/dev/null 2>&1 || true
    fi
    DOCKER_GROUP=$(getent group "$DOCKER_GID" | cut -d: -f1)
    if [ -n "$DOCKER_GROUP" ]; then
        sudo usermod -aG "$DOCKER_GROUP" runner >/dev/null 2>&1 || true
    fi
fi

# Validation
REPO_URL="${REPO_URL:-}"
if [ -z "$REPO_URL" ]; then
    echo "ERROR: REPO_URL environment variable is required (e.g. https://github.com/nietechniczny/Definium-GRC)."
    exit 1
fi

TOKEN="${RUNNER_TOKEN:-}"

# Auto-acquire registration token via Personal Access Token if RUNNER_TOKEN is not provided
if [ -z "$TOKEN" ] && [ -n "${ACCESS_TOKEN:-}" ]; then
    echo "Acquiring registration token via GitHub API..."
    API_URL="https://api.github.com"
    AUTH_HEADER="Authorization: token ${ACCESS_TOKEN}"

    URI_PATH=$(echo "$REPO_URL" | sed -E 's#^https?://[^/]+/(.*)$#\1#' | sed -E 's#\.git$##')
    SLASH_COUNT=$(echo "$URI_PATH" | tr -cd '/' | wc -c)

    if [ "$SLASH_COUNT" -eq 1 ]; then
        TOKEN_RESP=$(curl -s -X POST -H "$AUTH_HEADER" -H "Accept: application/vnd.github.v3+json" "${API_URL}/repos/${URI_PATH}/actions/runners/registration-token")
    else
        TOKEN_RESP=$(curl -s -X POST -H "$AUTH_HEADER" -H "Accept: application/vnd.github.v3+json" "${API_URL}/orgs/${URI_PATH}/actions/runners/registration-token")
    fi

    TOKEN=$(echo "$TOKEN_RESP" | jq -r .token)
    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        echo "Failed to acquire token from GitHub API: $TOKEN_RESP"
        exit 1
    fi
fi

if [ -z "$TOKEN" ]; then
    echo "ERROR: Either RUNNER_TOKEN or ACCESS_TOKEN must be provided."
    exit 1
fi

RUNNER_NAME="${RUNNER_NAME:-blitzrunner-$(hostname)}"
RUNNER_WORKDIR="${RUNNER_WORKDIR:-_work}"
ARCH=$(uname -m)
DEFAULT_LABELS="blitzrunner,self-hosted,linux,${ARCH}"
RUNNER_LABELS="${RUNNER_LABELS:-$DEFAULT_LABELS}"

CONFIG_ARGS=(
    --unattended
    --url "$REPO_URL"
    --token "$TOKEN"
    --name "$RUNNER_NAME"
    --labels "$RUNNER_LABELS"
    --work "$RUNNER_WORKDIR"
    --replace
)

if [ "${DISABLE_AUTO_UPDATE:-true}" = "true" ]; then
    CONFIG_ARGS+=(--disableupdate)
fi

if [ "${EPHEMERAL:-false}" = "true" ]; then
    CONFIG_ARGS+=(--ephemeral)
fi

if [ -n "${RUNNER_GROUP:-}" ]; then
    CONFIG_ARGS+=(--runnergroup "$RUNNER_GROUP")
fi

echo "=================================================="
echo "  ⚡ BlitzRunner: Initializing self-hosted runner"
echo "  URL:     $REPO_URL"
echo "  Name:    $RUNNER_NAME"
echo "  Labels:  $RUNNER_LABELS"
echo "=================================================="

./config.sh "${CONFIG_ARGS[@]}"

cleanup() {
    echo "Caught shutdown signal. Deregistering BlitzRunner..."
    REMOVE_TOKEN="$TOKEN"
    if [ -n "${ACCESS_TOKEN:-}" ]; then
        URI_PATH=$(echo "$REPO_URL" | sed -E 's#^https?://[^/]+/(.*)$#\1#' | sed -E 's#\.git$##')
        SLASH_COUNT=$(echo "$URI_PATH" | tr -cd '/' | wc -c)
        if [ "$SLASH_COUNT" -eq 1 ]; then
            RESP=$(curl -s -X POST -H "Authorization: token ${ACCESS_TOKEN}" -H "Accept: application/vnd.github.v3+json" "https://api.github.com/repos/${URI_PATH}/actions/runners/remove-token")
        else
            RESP=$(curl -s -X POST -H "Authorization: token ${ACCESS_TOKEN}" -H "Accept: application/vnd.github.v3+json" "https://api.github.com/orgs/${URI_PATH}/actions/runners/remove-token")
        fi
        RT=$(echo "$RESP" | jq -r .token)
        if [ "$RT" != "null" ] && [ -n "$RT" ]; then
            REMOVE_TOKEN="$RT"
        fi
    fi

    ./config.sh remove --token "$REMOVE_TOKEN" || true
    exit 0
}

trap 'cleanup' SIGINT SIGQUIT SIGTERM

echo "⚡ BlitzRunner is online and waiting for jobs..."
./run.sh &
RUN_PID=$!

wait $RUN_PID
