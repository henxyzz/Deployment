FROM node:20-bullseye

ENV PANEL_PORT=8080
ENV SCRIPTS_DIR=/scripts

# Install Python, Bash, unzip
RUN apt-get update && apt-get install -y python3 python3-pip bash unzip curl wget sudo && rm -rf /var/lib/apt/lists/*

# Create scripts folder
RUN mkdir -p $SCRIPTS_DIR
WORKDIR /app

# Copy project
COPY package.json /app/package.json
RUN npm install
COPY panel-server.js /app/panel-server.js
COPY entrypoint.sh /app/entrypoint.sh
COPY public /app/public
RUN chmod +x /app/entrypoint.sh

EXPOSE ${PANEL_PORT}
CMD ["/app/entrypoint.sh"]
