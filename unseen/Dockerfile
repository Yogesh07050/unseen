# Stage 1: build the PWA
FROM node:20-alpine AS web
WORKDIR /src
COPY app/package.json app/package-lock.json* ./app/
RUN cd app && npm ci
COPY app ./app
RUN cd app && npm run build

# Stage 2: FastAPI serves the API and the built app
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 STATIC_DIR=/srv/static ENV=production
WORKDIR /srv
COPY server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server/app ./app
# Migrations + seed, so the compose `migrate` service can run /srv/database/migrate.py
COPY database ./database
COPY --from=web /src/app/dist ./static
RUN useradd --system --uid 10001 unseen
USER unseen
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--proxy-headers"]
