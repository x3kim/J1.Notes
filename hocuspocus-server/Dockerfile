FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev 2>/dev/null || npm ci
COPY . .
EXPOSE 1234
CMD ["npm", "start"]
