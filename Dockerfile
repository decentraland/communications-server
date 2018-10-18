FROM node:8.12

WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci

# Bundle app source
COPY . .

EXPOSE 9090
CMD [ "npm", "start" ]
