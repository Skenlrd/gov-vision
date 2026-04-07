# Project Structure

This document defines the current file and folder structure of the `gov_vision` project.

## Root Layout

```text
gov_vision/
├─ client/
├─ documentation/
├─ ml_service/
└─ server/
```

## Detailed Structure

```text
gov_vision/
├─ client/
│  ├─ eslint.config.js
│  ├─ index.html
│  ├─ package.json
│  ├─ README.md
│  ├─ tsconfig.app.json
│  ├─ tsconfig.json
│  ├─ tsconfig.node.json
│  ├─ vite.config.ts
│  ├─ public/
│  └─ src/
│     ├─ App.css
│     ├─ App.tsx
│     ├─ index.css
│     ├─ main.tsx
│     └─ assets/
│
├─ documentation/
│  ├─ Libraries_installed.md
│  ├─ STRUCUTRE.md
│  └─ NON-DOC/
│     └─ nondoc.md
│
├─ ml_service/
│  ├─ main.py
│  ├─ requirements.txt
│  ├─ app/
│  │  ├─ routes/
│  │  │  └─ ml_routes.py
│  │  └─ services/
│  │     ├─ anomaly_service.py
│  │     ├─ forecast_service.py
│  │     └─ risk_service.py
│  ├─ models/
│  ├─ training/
│  │  ├─ train_isolation_forest.py
│  │  ├─ train_prophet.py
│  │  └─ train_random_forest.py
│  └─ __pycache__/
│
└─ server/
   ├─ package.json
   ├─ server.ts
   ├─ tsconfig.json
   ├─ config/
   │  ├─ db.ts
   │  └─ redis.ts
   ├─ jobs/
   │  ├─ anomalyJob.ts
   │  ├─ forecastJob.ts
   │  ├─ retrainJob.ts
   │  └─ riskJob.ts
   ├─ middleware/
   │  ├─ requireRole..ts
   │  ├─ serviceKey.ts
   │  └─ validateJWT.ts
   ├─ models/
   │  ├─ Anomaly.ts
   │  ├─ Forecast.ts
   │  ├─ KPI_Snapshot.ts
   │  ├─ m1Decisions.ts
   │  ├─ m2Violations.ts
   │  ├─ Report.ts
   │  └─ ReportSchedule.ts
   ├─ routes/
   │  ├─ aiRoutes.ts
   │  ├─ analyticsRoutes.ts
   │  ├─ eventRoutes.ts
   │  └─ reportRoutes.ts
   ├─ scripts/
   │  └─ seedData.ts
   ├─ services/
   │  ├─ cacheService.ts
   │  ├─ kpiAggregator.ts
   │  ├─ mlService.ts
   │  └─ reportGenerator.ts
   └─ types/
      └─ index.ts
```

## Folder Purpose Summary

- `client/`: Frontend application (Vite + React + TypeScript).
- `documentation/`: Project documentation and internal notes.
- `ml_service/`: Python ML microservice for health checks, ML routes, model services, and training scripts.
- `server/`: Node.js/TypeScript backend API with jobs, middleware, data models, and route handlers.

## Notes

- `__pycache__/` folders are Python runtime cache directories.
- `requireRole..ts` appears with a double dot in its name and is documented as-is.
