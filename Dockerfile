FROM node:20-bullseye

# Env variables
ENV PANEL_PORT=8080
ENV SCRIPTS_DIR=/scripts

# Install Python & tools
RUN apt-get update && apt-get install -y python3 python3-pip socat wget curl unzip sudo && \
    rm -rf /var/lib/apt/lists/*

# Create folders
RUN mkdir -p $SCRIPTS_DIR
WORKDIR /app

# Copy panel
# Copy package.json & install dependencies
COPY package.json /app/package.json
RUN npm install
COPY panel-server.js /app/panel-server.js
COPY entrypoint.sh /app/entrypoint.sh
COPY public /app/public
RUN chmod +x /app/entrypoint.sh

# Expose port for web panel
EXPOSE ${PANEL_PORT}

CMD ["/app/entrypoint.sh"]
