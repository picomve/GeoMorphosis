import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import sys
import os

# utils klasöründeki veritabanı fonksiyonlarımıza erişmek için yol ayarı
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.index import init_db, get_db_connection
from services.satellite_api import download_satellite_series, get_latest_image

# FastAPI uygulamasını başlat
app = FastAPI(
    title="GeoMorphosis AI Engine",
    description="Coğrafi Çevre İzleme ve Erken Uyarı Sistemi - Yapay Zeka Katmanı",
    version="1.0.0"
)

# Next.js frontend'inden gelecek isteklere izin vermek için CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Geliştirme aşamasında tüm kaynaklara izin veriyoruz
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

# Uygulama ayağa kalktığında veritabanı tablolarının hazır olduğundan emin ol
@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/")
def read_root():
    return {"status": "active", "service": "GeoMorphosis AI Engine Ready"}

@app.post("/analyze")
def analyze_region(request: AnalyzeRequest, req: Request):
    try:
        ip_address = req.client.host if req.client else "unknown"
        coordinates = f"{request.lat},{request.lon}"
        region_name = f"Bolge [{request.lat}, {request.lon}]"

        results = download_satellite_series(
            lat=request.lat,
            lon=request.lon,
            buffer_meters=request.buffer_meters,
            years=request.years,
        )

        downloaded = [r for r in results if r["status"] == "ok"]
        demo_mode = any(r["status"] == "demo" for r in results)

        ai_results = json.dumps({
            "fire_risk": "dusuk",
            "pollution_level": "yok",
            "ndvi_score": 0.75,
            "satellite_images": downloaded,
            "total_years_analyzed": len(results),
            "demo_mode": demo_mode,
        })

        image_no = str(len(downloaded))

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO regions_analysis
            (ip_address, image_no, region_name, coordinates, ai_results)
            VALUES (?, ?, ?, ?, ?)
        ''', (ip_address, image_no, region_name, coordinates, ai_results))
        conn.commit()
        record_id = cursor.lastrowid
        conn.close()

        return {
            "status": "completed",
            "region_name": region_name,
            "fire_risk": "dusuk",
            "pollution_level": "yok",
            "ndvi_score": 0.75,
            "satellite_images": downloaded,
            "total_years_analyzed": len(results),
            "demo_mode": demo_mode,
            "record_id": record_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/satellite/latest")
def latest_satellite(
    lat: Optional[float] = Query(default=None),
    lon: Optional[float] = Query(default=None),
    buffer_meters: int = 1000,
):
    if lat is None or lon is None:
        return {
            "demo": True,
            "message": "lat ve lon parametreleri gerekli. Ornek: /satellite/latest?lat=39.18&lon=37.34",
        }
    try:
        result = get_latest_image(lat, lon, buffer_meters)
        if result is None:
            return {"demo": True, "message": "Uygun goruntu bulunamadi", "lat": lat, "lon": lon}
        return result
    except Exception as e:
        return {"demo": True, "message": str(e), "lat": lat, "lon": lon}

if __name__ == "__main__":
    # Sunucuyu 8000 portunda başlat
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)