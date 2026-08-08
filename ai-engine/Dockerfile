FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --default-timeout=1000 -r requirements.txt

# rasterio'nun tasidigi GDAL, calisma zamaninda libexpat.so.1 ariyor;
# python:3.11-slim bu kutuphaneyi icermiyor ve NDVI okumasi
# "libexpat.so.1: cannot open shared object file" ile basarisiz oluyordu.
# Bilerek pip'ten SONRA duruyor: boylece agir pip katmani (torch/ultralytics)
# onbellekte kaliyor ve yeniden indirilmiyor. rasterio hazir wheel'den
# kuruldugu icin bu kutuphaneye kurulum aninda ihtiyac yok.
RUN apt-get update && apt-get install -y --no-install-recommends libexpat1 \
    && rm -rf /var/lib/apt/lists/*

# Kaynak kodu imaja al. docker-compose gelistirme sirasinda bu dizini
# volume ile eziyor; bu satir imajin tek basina calisabilmesi icin gerekli.
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
