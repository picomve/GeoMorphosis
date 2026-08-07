import json
import os
import sys
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# utils ve services klasörlerindeki bağımlılıklar
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from services.analysis_service import analyze_region as analyze_region_service
from services.satellite_api import get_latest_image
from utils.index import get_db_connection, init_db

app = FastAPI(
    title="GeoMorphosis AI Engine",
    description="Coğrafi Çevre İzleme ve Erken Uyarı Sistemi - Yapay Zeka Katmanı",
    version="1.0.0",
)

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

        analysis = analyze_region_service(
            lat=request.lat,
            lon=request.lon,
            buffer_meters=request.buffer_meters,
            years=request.years,
        )

        demo_mode = analysis["demo_mode"]
        ai_results_dict = analysis["ai_results"]
        downloaded = analysis["downloaded"]
        ai_results_json = json.dumps(ai_results_dict)
        image_no = str(len(downloaded))

        # 4. Veritabanına Kayıt
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO regions_analysis
            (ip_address, image_no, region_name, coordinates, ai_results)
            VALUES (?, ?, ?, ?, ?)
        """,
            (
                ip_address,
                image_no,
                region_name,
                coordinates,
                ai_results_json,
            ),
        )
        conn.commit()
        record_id = cursor.lastrowid
        conn.close()

        return {
            "status": "completed",
            "region_name": region_name,
            "record_id": record_id,
            "demo_mode": demo_mode,
            "ai_results": ai_results_dict,
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
            "message": (
                "lat ve lon parametreleri gerekli. Ornek:"
                " /satellite/latest?lat=39.18&lon=37.34"
            ),
        }
    try:
        result = get_latest_image(lat, lon, buffer_meters)
        if result is None:
            return {
                "demo": True,
                "message": "Uygun goruntu bulunamadi",
                "lat": lat,
                "lon": lon,
            }
        return result
    except Exception as e:
        return {"demo": True, "message": str(e), "lat": lat, "lon": lon}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)