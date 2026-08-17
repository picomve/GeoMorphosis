import json
import os
import sys
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import redis
import uvicorn
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

# Redis bağlantısı (Docker üzerinden, Node.js Worker ile haberleşmek için)
r = redis.Redis(host='redis', port=6379, db=0, decode_responses=True)

# Güncellenmiş Request Modeli (Haritada kısıtlanan alan bbox ve geoJson parametreleri eklendi)
class AnalyzeRequest(BaseModel):
    start_points: Optional[List[Dict[str, Any]]] = []
    end_points: Optional[List[Dict[str, Any]]] = []
    buffer_meters: int = 1000
    years: Optional[List[int]] = None
    bbox: Optional[Dict[str, float]] = None      # {'minLat': float, 'minLng': float, 'maxLat': float, 'maxLng': float}
    geoJson: Optional[Dict[str, Any]] = None     # Harita çiziminden gelen poligon verisi

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


# Hem /analyze hem /api/analyze isteklerini karşılayacak ortak analiz fonksiyonu
@app.post("/analyze")
@app.post("/api/analyze")
def analyze_region(request: AnalyzeRequest, req: Request):
    try:
        # 1. Kısıtlanan alan (bbox) kontrolü ve doğrulaması
        if request.bbox:
            min_lat = request.bbox.get("minLat")
            max_lat = request.bbox.get("maxLat")
            min_lng = request.bbox.get("minLng")
            max_lng = request.bbox.get("maxLng")
            
            if min_lat is not None and max_lat is not None and min_lng is not None and max_lng is not None:
                if min_lat >= max_lat or min_lng >= max_lng:
                    raise HTTPException(status_code=400, detail="Geçersiz kısıtlanmış alan koordinatları (bbox).")

        # 2. Nokta verisi kontrolü
        if not request.start_points and not request.bbox:
            raise HTTPException(status_code=400, detail="Analiz için start_points veya kısıtlanmış alan (bbox) gereklidir")

        # start_points varsa ilk noktayı doğrula
        if request.start_points:
            first_point = request.start_points[0]
            lat = first_point.get("lat") or first_point.get("latitude")
            lon = first_point.get("lon") or first_point.get("lng") or first_point.get("longitude")

            if lat is None or lon is None:
                raise HTTPException(status_code=400, detail="start_points içindeki ilk nokta lat ve lon içermelidir")

        task_id = uuid.uuid4().hex
        task_payload = {
            "start_points": request.start_points or [],
            "end_points": request.end_points or [],
            "buffer_meters": request.buffer_meters,
            "years": request.years or [],
            "bbox": request.bbox,
            "geoJson": request.geoJson,
        }

        r.hset(f"task:{task_id}", mapping={
            "status": "pending",
            "payload": json.dumps(task_payload),
            "created_at": datetime.utcnow().isoformat() + "Z",
        })
        r.rpush("taskQueue", task_id)

        return {"task_id": task_id, "message": "Görev kuyruğa eklendi"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- DURUM SORGULAMA ENDPOINT'İ ---
@app.get("/api/status/{task_id}")
def get_status(task_id: str):
    task = r.hgetall(f"task:{task_id}")

    if not task:
        raise HTTPException(status_code=404, detail="Görev bulunamadı")

    # Eğer görev tamamlanmışsa Node.js Worker'dan gelen stringified JSON result'u objeye çevir
    if task.get("status") == "completed" and "result" in task:
        try:
            task["result"] = json.loads(task["result"])
        except Exception:
            pass

    return task


# Mevcut satellite endpoint'ini bozmadan koruyoruz
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