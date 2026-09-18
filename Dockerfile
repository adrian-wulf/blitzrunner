FROM ubuntu:24.04

ARG TARGETARCH
ARG RUNNER_VERSION=2.337.0

ENV DEBIAN_FRONTEND=noninteractive
ENV RUNNER_MANUALLY_TRAP_SIG=1
ENV ACTIONS_RUNNER_PRINT_LOG_TO_STDOUT=1

# Install base packages, certificates, dev tools, and Docker CLI
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    wget \
    git \
    jq \
    tar \
    unzip \
    zip \
    sudo \
    build-essential \
    libssl-dev \
    libffi-dev \
    libicu-dev \
    gnupg \
    lsb-release \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Install Docker CLI and Docker Compose plugin
RUN install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc \
    && chmod a+r /etc/apt/keyrings/docker.asc \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu noble stable" > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

# Create runner user and configure passwordless sudo
RUN useradd -m -s /bin/bash -u 1001 runner \
    && echo "runner ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

WORKDIR /home/runner

# Download and extract the appropriate GitHub Actions runner binary based on architecture
RUN if [ -z "${TARGETARCH}" ]; then \
        TARGET_DETECTED="$(dpkg --print-architecture)"; \
    else \
        TARGET_DETECTED="${TARGETARCH}"; \
    fi \
    && case "${TARGET_DETECTED}" in \
        "amd64"|"x64") ARCH="x64" ;; \
        "arm64"|"aarch64") ARCH="arm64" ;; \
        *) echo "Unsupported architecture: ${TARGET_DETECTED}" && exit 1 ;; \
    esac \
    && echo "Building BlitzRunner for architecture: ${ARCH}" \
    && curl -fL "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-${ARCH}-${RUNNER_VERSION}.tar.gz" -o runner.tar.gz \
    && tar xzf runner.tar.gz \
    && rm -f runner.tar.gz \
    && ./bin/installdependencies.sh \
    && chown -R runner:runner /home/runner

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER runner

ENTRYPOINT ["/entrypoint.sh"]
