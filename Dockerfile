# Use the official MS Playwright image which includes all browser dependencies
FROM mcr.microsoft.com/playwright:v1.49.1-noble

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including playwright and speedtest-cli)
RUN apt-get update && apt-get install -y speedtest-cli && rm -rf /var/lib/apt/lists/*
RUN npm install

# Copy the rest of the application
COPY . .

# The image already has browsers, but let's ensure Chromium is specifically ready for our version
RUN npx playwright install chromium

# The Agent runs on port 3001
EXPOSE 3001

# Start the agent using tsx
CMD ["npx", "tsx", "src/index.ts"]
