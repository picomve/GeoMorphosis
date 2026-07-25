from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from services.satellite_api import download_satellite_series, get_latest_image

app = FastAPI(title="GeoMorphosis AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AnalyzeRequest(BaseModel):
    lat: float
    lon: float
    buffer_meters: int = 1000
    years: Optional[list[int]] = None


class SubscribeRequest(BaseModel):
    email: str
    region_id: str
    notification_type: str = "email"


@app.get("/")
def root():
    return {"status": "ok", "service": "ai-engine"}


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    try:
        results = download_satellite_series(
            lat=req.lat,
            lon=req.lon,
            buffer_meters=req.buffer_meters,
            years=req.years,
        )

        downloaded = [r for r in results if r["status"] == "ok"]
        demo_mode = any(r["status"] == "demo" for r in results)

        return {
            "status": "completed",
            "region_name": f"Bolge [{req.lat}, {req.lon}]",
            "fire_risk": "dusuk",
            "pollution_level": "yok",
            "ndvi_score": 0.75,
            "satellite_images": downloaded,
            "total_years_analyzed": len(results),
            "demo_mode": demo_mode,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/satellite/latest")
def latest_satellite(lat: float, lon: float, buffer_meters: int = 1000):
    try:
        result = get_latest_image(lat, lon, buffer_meters)
        if result is None:
            raise HTTPException(status_code=404, detail="Uygun goruntu bulunamadi")
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/subscribe")
def subscribe(req: SubscribeRequest):
    return {
        "success": True,
        "message": "Abonelik basarili",
        "subscription": {
            "email": req.email,
            "region_id": req.region_id,
            "notification_type": req.notification_type,
        },
    }
