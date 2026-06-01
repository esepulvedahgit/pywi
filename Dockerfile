FROM node:20-bookworm

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies, Python 3, pip, and venv
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy package configuration files and install Node dependencies
COPY package*.json ./
RUN npm install

# Copy Python requirements file and pre-configure the virtual environment
COPY requirements.txt ./
RUN python3 -m venv .venv && \
    .venv/bin/pip install --no-cache-dir --upgrade pip && \
    .venv/bin/pip install --no-cache-dir -r requirements.txt

# Install RKNN runtime for arm64 (Rockchip RK3588S — driver v0.9.8 compatible)
# Skipped on amd64. RKNN_VER must match the host RKNPU driver version family.
# Check driver version: sudo cat /sys/kernel/debug/rknpu/version
# Update RKNN_VER if the driver is upgraded on the host.
ARG TARGETARCH=amd64
RUN if [ "$TARGETARCH" = "arm64" ]; then \
      RKNN_VER=2.3.0 && \
      RKNN_BASE="https://github.com/airockchip/rknn-toolkit2/raw/v${RKNN_VER}" && \
      apt-get update && apt-get install -y --no-install-recommends wget && \
      rm -rf /var/lib/apt/lists/* && \
      wget -q "${RKNN_BASE}/rknpu2/runtime/Linux/librknn_api/aarch64/librknnrt.so" \
           -O /usr/lib/librknnrt.so && \
      chmod 755 /usr/lib/librknnrt.so && \
      ldconfig && \
      wget -q "${RKNN_BASE}/rknn_toolkit_lite2/packages/arm64/rknn_toolkit_lite2-${RKNN_VER}-cp311-cp311-linux_aarch64.whl" \
           -O /tmp/rknnlite.whl && \
      .venv/bin/pip install --no-cache-dir /tmp/rknnlite.whl && \
      rm /tmp/rknnlite.whl; \
    fi

# Copy the rest of the application source code
COPY . .

# Create a non-root user and transfer ownership of the app directory
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

# Expose the application port
EXPOSE 3000

# Build frontend + bundle server, then start production server
CMD ["sh", "-c", "npm run build && npm start"]
