FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# Small VPS (~1GB RAM): cap Node heap + rely on swap during next build
ENV NODE_OPTIONS="--max-old-space-size=768"
RUN npm run build

# Prisma CLI bundle for migrate deploy in production
FROM builder AS prisma-deps
WORKDIR /app
RUN mkdir -p /prisma-bundle/node_modules && node -e "\
const fs=require('fs');const path=require('path');\
const seen=new Set();\
function add(pkg){\
  if(!pkg||seen.has(pkg))return;\
  const dir=path.join('node_modules',pkg);\
  if(!fs.existsSync(dir))return;\
  seen.add(pkg);\
  let j;try{j=JSON.parse(fs.readFileSync(path.join(dir,'package.json'),'utf8'));}catch{return;}\
  for(const d of Object.keys(j.dependencies||{}))add(d);\
}\
add('prisma');\
add('@prisma/client');\
for(const p of seen){\
  const src=path.join('node_modules',p);\
  const dest=path.join('/prisma-bundle/node_modules',p);\
  fs.mkdirSync(path.dirname(dest),{recursive:true});\
  fs.cpSync(src,dest,{recursive:true});\
}\
" && cp -r node_modules/.prisma /prisma-bundle/node_modules/

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat openssl wget su-exec \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=prisma-deps /prisma-bundle/node_modules/. ./node_modules/
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/fflate ./node_modules/fflate
COPY --from=builder /app/scripts ./scripts

RUN mkdir -p /app/data/funnels \
  && chown -R nextjs:nodejs /app/data \
  && chmod +x ./scripts/start.sh \
  && sed -i 's/\r$//' ./scripts/start.sh ./scripts/seed-admin.js 2>/dev/null || true

# start.sh runs as root to chown the volume, then drops to nextjs via su-exec
USER root
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV FUNNELS_DATA_DIR=/app/data/funnels

CMD ["sh", "./scripts/start.sh"]
