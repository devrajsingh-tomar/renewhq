FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Generate prisma files
RUN npx prisma generate

# Build application
RUN npm run build

EXPOSE 3000

ENV PORT 3000
ENV NODE_ENV production

CMD ["npm", "run", "start"]
