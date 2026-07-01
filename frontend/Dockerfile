# frontend/Dockerfile
# Accepts VITE_API_URL as a build argument so Railway can inject the backend URL
# at build time. Set VITE_API_URL in Railway's frontend service environment variables.
FROM node:20-alpine AS builder

WORKDIR /app

# Declare build arg (Railway passes env vars as build args automatically)
ARG VITE_API_URL
ARG VITE_APP_NAME="iLEAD Placement Portal"
ARG VITE_DEBUG="false"
ARG VITE_LOG_LEVEL="error"

# Bake into the bundle via environment at build time
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_DEBUG=$VITE_DEBUG
ENV VITE_LOG_LEVEL=$VITE_LOG_LEVEL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
