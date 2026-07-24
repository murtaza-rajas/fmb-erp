# Multi-stage build: compile the Vite app, then serve the static output
# through the same nginx that reverse-proxies /api and /socket.io to the
# backend — one public-facing container, not two.
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .

# Baked in at build time (Vite inlines import.meta.env at build, not
# runtime — there's no re-reading these after the image is built). Default
# to same-origin relative paths, which is correct whenever this image's
# nginx also proxies /api and /socket.io itself (the single-domain setup in
# docker-compose.yml). If frontend and backend are deployed as two separate
# domains instead, override both at build time:
#   docker build --build-arg VITE_API_BASE_URL=https://api.example.com/api/v1 \
#                --build-arg VITE_SOCKET_URL=https://api.example.com \
#                -f docker/frontend.Dockerfile -t fmb-frontend ..
ARG VITE_API_BASE_URL=/api/v1
ARG VITE_SOCKET_URL=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
