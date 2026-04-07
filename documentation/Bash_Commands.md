npx ts-node scripts/testAggregator.ts

# Project Bash Commands (Updated & Structured)

This file lists all required bash/PowerShell commands for running, developing, and testing the project, grouped by architecture. Missing or unimplemented commands are noted at the end.

---

## 1. Environment Setup

### Install Node.js dependencies (run in each folder):
cd client
npm install
cd ../server
npm install

### Install Python dependencies:
cd ml_service
pip install -r requirements.txt

---

## 2. Data Preparation & Import

### Import CSV data into MongoDB:
cd server
npx ts-node scripts/importCSV.ts

### (Optional) Inject test data:
npx ts-node scripts/inject.ts

---

## 3. Machine Learning Service (Python)

### Train Isolation Forest model:
cd ml_service
python training/train_isolation_forest.py

### Validate data:
python validation/validate_data.py

### Start ML API service:
python -m uvicorn main:app --port 8000 --reload

---

## 4. Backend Service (Node.js)

### Start backend server (dev mode):
cd server
npm run dev

### Build backend for production:
npm run build

### Start backend (production):
npm start

---

## 5. Frontend Service (React)

### Start frontend (dev mode):
cd client
npm run dev

### Build frontend for production:
npm run build

### Preview production build:
npm run preview

---

## 6. Testing & Utilities

### Run aggregator test script:
cd server
npx ts-node scripts/testAggregator.ts

### Open MongoDB shell with env URI:
cd server
mongosh "$env:MONGODB_URI"

### Free a port (PowerShell):
$port=8000; Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue

---

## 7. Run Order (Recommended)

1. Start ML service:
  cd ml_service
  python -m uvicorn main:app --port 8000 --reload
2. Start backend:
  cd server
  npm run dev
3. Start frontend:
  cd client
  npm run dev

---

## 8. Department ObjectIds (for Postman/API testing)

finance: 69b18569d20664db9a51ce00
hr: 69b18569d20664db9a51ce01
legal: 69b18569d20664db9a51ce02
operations: 69b18569d20664db9a51ce03

---

## 9. Missing/Unimplemented Commands

- No explicit commands for training Prophet or Random Forest models (see ml_service/training/ for scripts).
- No dedicated test scripts for frontend (React) or backend (Jest/Mocha/etc.) found in package.json.
- No Docker or containerization commands present.
- No Redis/Memurai install/start commands here (see Libraries_installed.md for Redis setup).

---

## 10. Git Commands

### Check ignore rule source:
```bash
git check-ignore -v TestNotes.md
```
Explanation:
- Shows which ignore rule and file are responsible for ignoring `TestNotes.md`.
- Used to verify the `.gitignore` update is applied correctly.

### Check modified/untracked/ignored files:
```bash
git status --short --ignored
```
Explanation:
- Displays modified, untracked, and ignored files in compact format.
- Used to confirm `TestNotes.md` appears under ignored files (`!!`).

---