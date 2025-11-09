# Base image Node.js LTS
FROM node:20-bullseye

# Set working directory
WORKDIR /app

# Copy package.json & install dependencies
COPY package.json /app/package.json
RUN npm install --legacy-peer-deps

# Copy source code
COPY index.js /app/index.js

# Expose port
EXPOSE 8080

# Run Node in foreground
CMD ["node", "index.js"]
