# Testing Setup Guide

## What Was Created

### 1. Shared Contracts (`contracts/index.ts`)
Centralized TypeScript types shared between frontend and backend:
- `IKpiSummary`, `IAnomaly`, `IForecastData`
- `Severity`, `RiskLevel` types
- `ReportFormat`, `ReportType` enums
- Risk level colors and utilities

### 2. Client Tests (`client/src/__tests__/`)
- `types.test.ts` - Tests for shared type contracts
- `components/KPICard.test.tsx` - Sample component test
- `utils/formatters.test.ts` - Utility function tests
- `setup.ts` - Test environment setup
- `vitest.config.ts` - Vitest configuration

### 3. Server Tests (`server/__tests__/`)
- `types.test.ts` - Server type validation
- `middleware/validateJWT.test.ts` - JWT middleware tests
- `services/mlService.test.ts` - ML service integration tests
- `jest.config.js` - Jest configuration

### 4. ML Service Tests (`ml_service/tests/`)
- `test_anomaly_service.py` - Anomaly detection tests
- `test_forecast_service.py` - Prophet forecasting tests
- `test_risk_service.py` - Risk scoring tests
- `conftest.py` - Pytest fixtures
- `pytest.ini` - Pytest configuration

## Installation Commands

### Client (Frontend)
```bash
cd client
npm install
```

New dev dependencies added:
- `vitest` - Test runner
- `@testing-library/react` - React testing utilities
- `@testing-library/jest-dom` - Jest matchers
- `jsdom` - Browser environment for tests

### Server (Backend)
```bash
cd server
npm install
```

New dev dependencies added:
- `jest` - Test runner
- `ts-jest` - TypeScript support for Jest
- `@types/jest` - Jest type definitions

### ML Service
```bash
cd ml_service
pip install -r requirements.txt
```

New dependencies added:
- `pytest` - Test framework
- `pytest-cov` - Coverage reporting

## Running Tests

### Client
```bash
cd client
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run with coverage report
```

### Server
```bash
cd server
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run with coverage report
```

### ML Service
```bash
cd ml_service
pytest               # Run all tests
pytest -v            # Verbose output
pytest --cov=app     # With coverage
```

## Test Structure

```
gov_vision/
├── client/
│   └── src/
│       └── __tests__/
│           ├── types.test.ts
│           ├── components/
│           └── utils/
│   └── vitest.config.ts
├── server/
│   └── __tests__/
│       ├── types.test.ts
│       ├── middleware/
│       └── services/
│   └── jest.config.js
├── ml_service/
│   └── tests/
│       ├── test_anomaly_service.py
│       ├── test_forecast_service.py
│       └── test_risk_service.py
│   └── pytest.ini
└── contracts/
    └── index.ts      # Shared types
```

## Key Points

1. **Zero tests before** → **Comprehensive test suite now**
2. **Shared types** in `contracts/` ensure frontend/backend type safety
3. **Test dependencies** added to all package.json/requirements.txt files
4. **Run `npm install` and `pip install`** to activate the test suites
