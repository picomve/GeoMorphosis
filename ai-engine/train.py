"""
GeoMorphosis - YOLOv8 Model Eğitimi (GPU Optimize)
"""

from ultralytics import YOLO
from pathlib import Path
import shutil

BASE_DIR = Path(__file__).resolve().parent

def start_training():
    yaml_path = BASE_DIR / "dataset" / "data.yaml"
    
    # Pretrained YOLOv8 Nano modeli
    model = YOLO("yolov8n.pt")

    print("[+] YOLOv8 Model Eğitimi GPU Üzerinde Başlatılıyor...")
    
    # Eğitimi başlat
    results = model.train(
        data=str(yaml_path),
        epochs=30,             # Eğitim tur sayısı
        imgsz=640,             # Görsel çözünürlüğü
        batch=16,              # 8 GB GPU VRAM için ideal batch boyutu
        device=0,              # NVIDIA Ekran Kartını (GPU) kullanır
        workers=4,             # Veri işleme izlek sayısı
        name="geomorphosis_run"
    )

    # Eğitilen en iyi model ağırlığını projenin models/ klasörüne kopyala
    best_weights = BASE_DIR / "runs" / "detect" / "geomorphosis_run" / "weights" / "best.pt"
    target_weights = BASE_DIR / "models" / "fire_yolov8.pt"

    if best_weights.exists():
        shutil.copy(best_weights, target_weights)
        print(f"\n[✔] Eğitim başarıyla tamamlandı! Yeni model ağırlığı güncellendi: {target_weights}")

if __name__ == "__main__":
    start_training()