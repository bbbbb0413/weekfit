FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Vite 는 빌드할 때 값을 코드에 넣으므로 실행 시점이 아니라 빌드 인자로 받는다
ARG VITE_API_BASE_URL=http://localhost:8080
ARG VITE_API_MODE=real
ARG VITE_SHARED_DEMO_USER=true
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_MODE=$VITE_API_MODE \
    VITE_SHARED_DEMO_USER=$VITE_SHARED_DEMO_USER
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
