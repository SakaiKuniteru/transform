FROM node:22-bookworm-slim

ENV NODE_ENV=production
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV HOME=/home/node
ENV XDG_CACHE_HOME=/home/node/.cache

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        tini \
        libreoffice \
        pandoc \
        tesseract-ocr \
        tesseract-ocr-eng \
        tesseract-ocr-vie \
        poppler-utils \
        qpdf \
        ghostscript \
        7zip \
        fonts-dejavu-core \
        fonts-liberation2 \
        fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY shared /app/shared
COPY backend/package.json backend/package-lock.json /app/backend/

WORKDIR /app/backend

RUN npm ci --omit=dev \
    && npm cache clean --force

COPY backend /app/backend

RUN mkdir -p \
        /app/backend/storage/working/tmp \
        /home/node/.cache \
    && chown -R node:node \
        /app \
        /home/node

RUN command -v node \
    && command -v soffice \
    && command -v pandoc \
    && command -v tesseract \
    && command -v pdftotext \
    && command -v pdftoppm \
    && command -v qpdf \
    && command -v gs \
    && command -v 7zz

USER node

EXPOSE 2310

STOPSIGNAL SIGTERM

ENTRYPOINT ["tini", "--"]

CMD ["node", "src/server.js"]