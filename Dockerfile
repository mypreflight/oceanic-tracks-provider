FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS alpine-node-base
RUN apk --no-cache add curl
RUN npm install -g npm@12 && npm cache clean --force

FROM alpine-node-base AS development
WORKDIR /app
COPY --chown=node:node . .
ENTRYPOINT ["/app/docker/dev/entrypoint"]

FROM alpine-node-base AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run bundle

FROM scratch AS export
COPY --from=build /app/dist/lambda.js ./
