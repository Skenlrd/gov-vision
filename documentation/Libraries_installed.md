**CLIENT SIDE LIBRARIES**
cd client
npm create vite@latest client
## Libraries/Packages Installed
This document lists all libraries/packages installed for each architecture layer, with the install command and a one-line explanation.

## 1. Client (Frontend)

**Setup:**
- `npm create vite@latest client`  
	Creates a new React project using Vite (modern build tooling, fast dev server).

**Libraries:**
- `npm install axios`  
	HTTP client for making API requests from React frontend.
- `npm install react-router-dom`  
	Routing for navigation between pages in the React app.
- `npm install recharts`  
	Charting library for analytics visualizations (bar, line, pie charts).
- `npm install echarts`  
	Advanced charting/visualization library (heatmaps, radar, forecasting graphs).
- `npm install clsx`  
	Utility for conditionally combining CSS class names.
- `npm install -D tailwindcss`  
	Utility-first CSS framework for rapid UI styling.
- `npm install -D postcss`  
	CSS processor, enables Tailwind plugins.
- `npm install -D autoprefixer`  
	Adds browser compatibility prefixes to CSS.
- `npm install -D @types/node`  
	TypeScript type definitions for Node.js APIs (dev only).

---

## 2. Server (Backend)

**Libraries:**
- `npm install express`  
	Web framework for building REST APIs.
- `npm install mongoose`  
	MongoDB object modeling and schema validation.
- `npm install redis`  
	Redis client for Node.js (caching, pub/sub, etc.).
- `npm install node-cron`  
	Scheduled/background jobs (cron syntax).
- `npm install axios`  
	HTTP client for backend-to-backend API calls.
- `npm install jsonwebtoken`  
	JWT creation and verification for authentication.
- `npm install dotenv`  
	Loads environment variables from .env files.
- `npm install -D @types/redis`  
	TypeScript type definitions for Redis (dev only).

**Models:**
- `server/models/KpiSnapshot.ts`  
	KPI snapshot data model.
- `server/models/Anomaly.ts`  
	Anomaly data model.
- `server/models/Forecast.ts`  
	Forecast data model.
- `server/models/Report.ts`  
	Report data model.
- `server/models/ReportSchedule.ts`  
	Report scheduling data model.

**Other Useful Commands:**
- `npx ts-node server.ts`  
	Run backend API server with TypeScript.
- `npx ts-node scripts/importCSV.ts`  
	Import and normalize CSV data into MongoDB.

**Redis Local Installation:**
- Open PowerShell as Administrator.
- `winget install Memurai.MemuraiDeveloper`  
	Installs Memurai (Redis-compatible server for Windows).
- `Start-Service Memurai`  
	Starts the Redis service.
- `Get-Service Memurai` and `Test-NetConnection localhost -Port 6379`  
	Verifies Redis is running.
- .env: `REDIS_URL=redis://localhost:6379`  
	Sets Redis connection string for local dev.

**JWT Token Generation Example:**
- `node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({ userId:'123', role:'admin', department:'finance' }, 'test_secret', { expiresIn:'1h' }))"`  
	Generates a JWT for testing.

---

## 3. ML Service (Python)

**Libraries:**
- `pip install fastapi`  
	Web framework for building Python APIs.
- `pip install uvicorn`  
	ASGI server for running FastAPI apps.
- `pip install scikit-learn`  
	Machine learning algorithms and utilities.
- `pip install pandas`  
	Data analysis and manipulation library.
- `pip install numpy`  
	Numerical computing library (arrays, math functions).
- `pip install joblib`  
	Model serialization and persistence.

---

## 4. Skipped/Deferred Features

- User-based authentication (full JWT/role-based auth) is currently skipped in dev.
- Redis is optional and not fully leveraged in dev mode.
- Department ID as ObjectId is not used; canonical string IDs are used instead.

---
Tailwind to v3.4.17 t

**SERVER SIDE LIBRARIES**
npm install express
npm install mongoose
npm install redis
npm install node-cron
npm install axios
npm install jsonwebtoken
npm install dotenv
npm install mongoose redis dotenv
npm install -D @types/redis

**SERVER SIDE MODELS**
server/models/KpiSnapshot.ts
server/models/Anomaly.ts
server/models/Forecast.ts
server/models/Report.ts
server/models/ReportSchedule.ts

**ML DEPENDENCIES**
pip install fastapi
pip install uvicorn
pip install scikit-learn
pip install pandas
pip install numpy
pip install joblib

token generation bash command
node -e "const jwt=require('jsonwebtoken'); console.log(jwt.sign({ userId:'123', role:'admin', department:'finance' }, 'test_secret', { expiresIn:'1h' }))"

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoiYWRtaW4iLCJkZXBhcnRtZW50IjoiZmluYW5jZSIsImlhdCI6MTc3MzM0ODA3NCwiZXhwIjoxNzczMzUxNjc0fQ.WssCkNg66Km8wacFvbwtyd7vRX3W2bhIRjHjT56PTBU

**INSTALLIGN REDIS LOCALLY**
Open PowerShell as Administrator.
Install Redis via winget:

winget install Memurai.MemuraiDeveloper
Start Redis service:

Start-Service Memurai
Verify it is running:

Get-Service MemuraiTest-NetConnection localhost -Port 6379
Keep your .env as:

REDIS_URL=redis://localhost:6379

npx command for backend:
Backend API server via npx: npx ts-node server.ts
CSV import via npx: npx ts-node scripts/importCSV.ts
