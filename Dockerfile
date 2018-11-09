# BUILD STAGE
FROM node:10 as builder

WORKDIR /usr/src/app

# Install app dependencies
COPY . .

RUN npm install && npm run test && npm prune --production


# DEPLOY STAGE
FROM node:10-alpine

WORKDIR /root

# Bundle app source
COPY --from=builder /usr/src/app .

EXPOSE 9090

CMD [ "npm", "start" ]
