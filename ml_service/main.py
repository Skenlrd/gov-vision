from fastapi import FastAPI

from app.routes.ml_routes import router as ml_router

app = FastAPI(title="Gov Vision ML Service", version="0.1.0")


@app.get("/health")
def health():
	return {"status": "ok", "service": "ml-service"}


app.include_router(ml_router, prefix="/ml", tags=["ml"])
