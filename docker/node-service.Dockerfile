FROM node:24-alpine AS build
WORKDIR /app
ARG APP_NAME

ENV npm_config_update_notifier=false
COPY package.json package-lock.json ./
COPY apps/${APP_NAME}/package.json apps/${APP_NAME}/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/${APP_NAME} apps/${APP_NAME}
RUN npm run build -w @marketplace/contracts && npm run build -w @marketplace/${APP_NAME}
RUN npm prune --omit=dev && npm cache clean --force

FROM node:24-alpine AS runtime
WORKDIR /app
ARG APP_NAME
ENV NODE_ENV=production
ENV APP_NAME=${APP_NAME}
USER node
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/contracts/dist ./packages/contracts/dist
COPY --from=build /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build /app/apps/${APP_NAME}/dist ./apps/${APP_NAME}/dist
COPY --from=build /app/apps/${APP_NAME}/package.json ./apps/${APP_NAME}/package.json
CMD ["sh", "-c", "node apps/$APP_NAME/dist/main.js"]
