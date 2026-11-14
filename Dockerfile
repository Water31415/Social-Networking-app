# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS frontend-build
WORKDIR /app/Frontend
COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci --include=dev
COPY Frontend/ ./
ARG REACT_APP_BACKEND_URL=/
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
RUN npm run build

FROM node:24-bookworm-slim AS backend-dependencies
WORKDIR /app/Backend
COPY Backend/package.json Backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-bookworm-slim AS production
ENV NODE_ENV=production PORT=5000
WORKDIR /app
COPY Backend/ ./Backend/
COPY --from=backend-dependencies /app/Backend/node_modules ./Backend/node_modules
COPY --from=frontend-build /app/Frontend/build ./Frontend/build
RUN mkdir -p Backend/uploads/images && chown node:node Backend/uploads/images
USER node
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/readyz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "Backend/server.cjs"]
