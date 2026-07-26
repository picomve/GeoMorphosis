"""
GeoMorphosis - Egitim Veri Seti Toplayici
GEE ile Sentinel-2 goruntulerini indirir, yillara gore klasorler olusturur.

Kullanim:
    python data_collector.py --region bursa
    python data_collector.py --lat 40.1885 --lon 29.0610
    python data_collector.py --region bursa --years 2020 2024
"""

import ee
import os
import json
import math
import requests
from pathlib import Path
from datetime import datetime

OUTPUT_BASE = Path(__file__).resolve().parent.parent.parent / "data" / "raw"

REGIONS = {
    "bursa": {
        "name": "Bursa",
        "center": [40.1885, 29.0610],
        "description": "Uludag orman, sehir merkezi, tarim",
    },
    "istanbul": {
        "name": "Istanbul",
        "center": [41.0082, 28.9784],
        "description": "Kiyi, orman, kentsel alan",
    },
    "marmaris": {
        "name": "Marmaris",
        "center": [36.8530, 28.2715],
        "description": "Yogun orman, yangin risk bolgesi",
    },
    "ankara": {
        "name": "Ankara",
        "center": [39.9334, 32.8597],
        "description": "Yari kurak arazi, tarim",
    },
}

DEFAULT_YEARS = [2020, 2022, 2024, 2025]
CLOUD_THRESHOLD = 20
TILE_SIZE = "512x512"


def init_gee():
    project_id = os.environ.get("GOOGLE_EARTH_ENGINE_PROJECT", "geomorphosis")
    ee.Initialize(project=project_id)
    print("GEE baslatildi")


def mask_clouds(image):
    qa = image.select("QA60")
    cloud_mask = qa.bitwiseAnd(1 << 10).eq(0)
    cirrus_mask = qa.bitwiseAnd(1 << 11).eq(0)
    return image.updateMask(cloud_mask.And(cirrus_mask)).divide(10000)


def add_ndvi(image):
    ndvi = image.normalizedDifference(["B8", "B4"]).rename("NDVI")
    return image.addBands(ndvi)


def search_images(lat, lon, year, cloud_max=CLOUD_THRESHOLD):
    point = ee.Geometry.Point(lon, lat)
    roi = point.buffer(2000).bounds()

    start = f"{year}-01-01"
    end = f"{year}-12-31"

    collection = (
        ee.ImageCollection("COPERNICUS/S2_HARMONIZED")
        .filterBounds(roi)
        .filterDate(start, end)
        .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", cloud_max))
    )

    count = collection.size().getInfo()
    if count == 0:
        return None, roi

    print(f"  {year}: {count} goruntu (bulut <= %{cloud_max})")
    return collection, roi


def get_composite(collection, roi, bands=["B4", "B3", "B2"]):
    composite = collection.map(mask_clouds).median().clip(roi)
    return composite


def download_image(composite, roi, file_path, bands=["B4", "B3", "B2"]):
    vis_params = {
        "bands": bands,
        "min": 0,
        "max": 0.3,
        "region": roi,
        "dimensions": TILE_SIZE,
        "format": "png",
    }

    url = composite.getThumbURL(vis_params)
    response = requests.get(url, timeout=120)
    response.raise_for_status()

    with open(file_path, "wb") as f:
        f.write(response.content)

    return len(response.content)


def collect_region(region_name="bursa", custom_lat=None, custom_lon=None, years=None):
    init_gee()

    if years is None:
        years = DEFAULT_YEARS

    region = REGIONS.get(region_name, REGIONS["bursa"])
    if custom_lat and custom_lon:
        region = {"name": f"custom_{custom_lat}_{custom_lon}", "center": [custom_lat, custom_lon]}

    center_lat, center_lon = region["center"]
    region_dir = OUTPUT_BASE / region["name"].lower()
    region_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'='*50}")
    print(f"Bolge: {region['name']}")
    print(f"Merkez: {center_lat}, {center_lon}")
    print(f"Yillar: {years}")
    print(f"Cikis: {region_dir}")
    print(f"{'='*50}")

    metadata = {
        "region": region["name"],
        "center": [center_lat, center_lon],
        "years": years,
        "cloud_threshold": CLOUD_THRESHOLD,
        "tile_size": TILE_SIZE,
        "created": datetime.now().isoformat(),
        "images": [],
    }

    for year in years:
        year_dir = region_dir / str(year)
        year_dir.mkdir(exist_ok=True)

        print(f"\n--- {year} ---")

        collection, roi = search_images(center_lat, center_lon, year)
        if collection is None:
            print(f"  {year}: Goruntu bulunamadi, atlandi")
            continue

        composite = get_composite(collection, roi)

        rgb_path = year_dir / "rgb.png"
        size = download_image(composite, roi, str(rgb_path), ["B4", "B3", "B2"])
        print(f"  rgb.png indirildi ({size} byte)")

        ndvi_collection = collection.map(add_ndvi)
        ndvi_composite = ndvi_collection.median().clip(roi)
        ndvi_path = year_dir / "ndvi.png"
        ndvi_size = download_image(ndvi_composite, roi, str(ndvi_path), ["NDVI"])
        print(f"  ndvi.png indirildi ({ndvi_size} byte)")

        metadata["images"].append({
            "year": year,
            "rgb": str(rgb_path.relative_to(OUTPUT_BASE)),
            "ndvi": str(ndvi_path.relative_to(OUTPUT_BASE)),
            "size_bytes": size,
        })

    meta_path = region_dir / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    print(f"\nTamamlandi!")
    print(f"Veriler: {region_dir}")
    print(f"Metadata: {meta_path}")

    return region_dir


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="GEE ile egitim veri seti olusturma")
    parser.add_argument("--region", default="bursa", choices=list(REGIONS.keys()))
    parser.add_argument("--lat", type=float, help="Ozel enlem")
    parser.add_argument("--lon", type=float, help="Ozel boylam")
    parser.add_argument("--years", nargs="+", type=int, default=DEFAULT_YEARS)
    args = parser.parse_args()

    collect_region(args.region, args.lat, args.lon, args.years)
