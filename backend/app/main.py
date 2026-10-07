"""
ModelGuard FastAPI Application Entrypoint.
Provides black-box inference, extraction testing, verification, and audit services.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.api.endpoints import predict, models, experiments, verification, triggers

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Enterprise IP Watermarking & Black-Box Extraction Detection Service for Deep Learning Models"
)

# CORS configuration for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(predict.router, prefix="", tags=["Black-Box Serving"])
app.include_router(predict.router, prefix="/api/v1", tags=["Serving"])
app.include_router(models.router, prefix="/api/v1", tags=["Models"])
app.include_router(experiments.router, prefix="/api/v1", tags=["Experiments"])
app.include_router(verification.router, prefix="/api/v1", tags=["Verification"])
app.include_router(triggers.router, prefix="/api/v1", tags=["Trigger Vault"])


@app.get("/")
def root():
    return {
        "message": "ModelGuard Verification & Serving Engine",
        "docs_url": "/docs",
        "health": "/health",
        "status": "ONLINE"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=False)
