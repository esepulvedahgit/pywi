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

# Copy the rest of the application source code
COPY . .

# Create a non-root user and transfer ownership of the app directory
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
RUN chown -R appuser:appgroup /app
USER appuser

# Expose the application port
EXPOSE 3000

# Start the application in development mode
CMD ["npm", "run", "dev"]
