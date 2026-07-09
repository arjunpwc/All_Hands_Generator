# Build stage: frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build stage: backend dependencies
FROM python:3.11-slim AS backend-build
WORKDIR /app
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt -t /app/deps

# Runtime
FROM python:3.11-slim
WORKDIR /app

ENV PYTHONPATH=/app/deps:/app
ENV DATA_DIR=/app/data
ENV CORS_ORIGINS=*

COPY --from=backend-build /app/deps /app/deps
COPY backend/app ./app
COPY generator ./generator
COPY --from=frontend-build /app/frontend/dist ./static

RUN mkdir -p /app/data/sessions /app/data/uploads

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
