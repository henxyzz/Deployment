FROM node:20-bullseye

ENV PANEL_PORT=8080
ENV SCRIPTS_DIR=/scripts

# Install dependencies OS + build tools
RUN apt-get update && apt-get install -y python3 python3-pip bash unzip curl wget sudo build-essential && rm -rf /var/lib/apt/lists/*

RUN mkdir -p $SCRIPTS_DIR
WORKDIR /app

COPY package.json /app/package.json

# Bersihkan cache & install deps
RUN npm cache clean --force
RUN npm install --legacy-peer-deps

COPY panel-server.js /app/panel-server.js
COPY public /app/public

EXPOSE ${PANEL_PORT}

CMD ["node", "panel-server.js"]
