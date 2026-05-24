FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_EARTHMC_API_KEY
ARG VITE_EARTHMC_PLAYER=kakoritz
ARG VITE_EARTHMC_NATION=Narmada
ENV VITE_EARTHMC_API_KEY=$VITE_EARTHMC_API_KEY
ENV VITE_EARTHMC_PLAYER=$VITE_EARTHMC_PLAYER
ENV VITE_EARTHMC_NATION=$VITE_EARTHMC_NATION
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
