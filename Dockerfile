#stage 1
FROM node:20-alpine as node
WORKDIR /app
COPY . .
RUN npm install --legacy-peer-deps
RUN export NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build-prod
COPY ./web.config /app/dist/survey-app
COPY ./web.config /app/dist/survey-app

#stage 2
FROM nginx:1.23.0-alpine
EXPOSE 80
COPY ./nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=node /app/dist/survey-app/browser /usr/share/nginx/html