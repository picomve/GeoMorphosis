from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title='GeoMorphosis AI Engine', version='1.0.0')

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/')
def root():
    return {'status': 'ok', 'service': 'ai-engine'}


@app.post('/analyze')
def analyze(data: dict):
    return {
        'status': 'completed',
        'region_name': 'Analiz Edilen Bolge',
        'fire_risk': 'dusuk',
        'pollution_level': 'yok',
        'ndvi_score': 0.75,
    }
