FROM node:20-bullseye

ENV PANEL_PORT=8080
ENV SCRIPTS_DIR=/scripts

RUN apt-get update && apt-get install -y python3 python3-pip bash unzip curl wget sudo && rm -rf /var/lib/apt/lists/*

RUN mkdir -p $SCRIPTS_DIR
WORKDIR /app

COPY package.json /app/package.json
RUN npm install
COPY panel-server.js /app/panel-server.js
COPY public /app/public

EXPOSE ${PANEL_PORT}

# Jalankan Node langsung di foreground
CMD ["node", "panel-server.js"]
