# Libraries Installed

This document lists installed libraries/packages and their install commands.

---

## Day 7 Session Update (2026-04-10)

No new packages installed.

Session-used libraries (already installed in `.venv` and/or server workspace):
- python-dotenv
- prophet
- joblib
- pymongo
- fastapi
- uvicorn
- axios
- node-cron

---

## Day 6 Session Update (2026-04-09)

No new packages installed.

---

## Day 5 Session Update (2026-04-09)

No new packages installed.

---

## 1) Client (Frontend)

Setup command:
- npm create vite@latest client

Installed packages:
- npm install axios
- npm install react-router-dom
- npm install recharts
- npm install echarts
- npm install clsx
- npm install -D tailwindcss
- npm install -D postcss
- npm install -D autoprefixer
- npm install -D @types/node

What these are used for:
- axios: API calls from frontend to backend.
- react-router-dom: page routing/navigation.
- recharts: dashboard charts.
- echarts: advanced charts (heatmaps/forecast visuals).
- clsx: conditional class name composition.
- tailwindcss/postcss/autoprefixer: styling pipeline.
- @types/node: TypeScript node type definitions for tooling.

---

## 2) Server (Backend)

Installed packages:
- npm install express
- npm install mongoose
- npm install redis
- npm install node-cron
- npm install axios
- npm install jsonwebtoken
- npm install dotenv
- npm install -D @types/redis

What these are used for:
- express: REST API framework.
- mongoose: MongoDB schemas and queries.
- redis: Redis client support.
- node-cron: scheduled jobs.
- axios: backend-to-backend HTTP calls.
- jsonwebtoken: JWT signing/verification.
- dotenv: .env configuration loading.
- @types/redis: TS types for redis package.

---

## 3) ML Service (Python)

Installed packages:
- pip install fastapi
- pip install uvicorn
- pip install scikit-learn
- pip install pandas
- pip install numpy
- pip install joblib

What these are used for:
- fastapi: ML HTTP API server.
- uvicorn: ASGI server runtime.
- scikit-learn: ML models/training.
- pandas: tabular data processing.
- numpy: numeric computation.
- joblib: model serialization.

---

## 4) Optional Local Redis (Windows)

Install/start commands:
- winget install Memurai.MemuraiDeveloper
- Start-Service Memurai
- Get-Service Memurai
- Test-NetConnection localhost -Port 6379

Purpose:
- Memurai provides a Redis-compatible local service for Windows.
