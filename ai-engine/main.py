import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys
import os

# utils klasöründeki veritabanı fonksiyonlarımıza erişmek için yol ayarı
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils.index import init_db, get_db_connection

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

# Uygulama ayağa kalktığında veritabanı tablolarının hazır olduğundan emin ol
@app.on_event("startup")
def startup_event():
    init_db()

# Sunucunun çalışıp çalışmadığını test etmek için sağlık kontrolü (Health Check)
@app.get("/")
def read_root():
    return {"status": "active", "service": "GeoMorphosis AI Engine Ready"}

# /analyze endpoint'ine gelecek verilerin formatını belirleyen Pydantic modeli
class AnalyzeRequest(BaseModel):
    ip_address: str = "127.0.0.1"
    region_name: str
    coordinates: str
    image_no: int = 1
    # Not: İlerleyen aşamada görselin base64 verisi veya dosya yolu buraya eklenecek

# Ana Analiz Endpoint'i
@app.post("/analyze")
def analyze_region(request: AnalyzeRequest):
    try:
        # 1. ADIM: Buraya YOLO / Görüntü İşleme inference mantığımız gelecek
        # Şimdilik veritabanı bağlantımızı test etmek için örnek (mock) bir JSON oluşturuyoruz
        mock_ai_results = '{"buildings": 15, "deforestation": false, "risk_level": "normal"}'

        # 2. ADIM: Sonuçları veritabanına kaydet
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO regions_analysis 
            (ip_address, image_no, region_name, coordinates, ai_results)
            VALUES (?, ?, ?, ?, ?)
        ''', (request.ip_address, request.image_no, request.region_name, request.coordinates, mock_ai_results))
        
        conn.commit()
        record_id = cursor.lastrowid
        conn.close()

        return {
            "success": True,
            "message": "Analiz tamamlandı ve veritabanına başarıyla kaydedildi.",
            "data": {
                "id": record_id,
                "region": request.region_name,
                "ai_results": mock_ai_results
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    # Sunucuyu 8000 portunda başlat
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)