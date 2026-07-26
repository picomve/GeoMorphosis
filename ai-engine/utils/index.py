import sqlite3
import os

# Docker içindeki veya yereldeki DB yolu (klasör yapisina göre)
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DB_PATH = os.path.join(BASE_DIR, "data", "geopulse.db")
def get_db_connection():
    """SQLite veritabanına bağlantı açar ve WAL modunu garantiler."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Sonuçları sözlük (dict) gibi okuyabilmek için
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    return conn

def init_db():
    """Veritabanı tablolarını oluşturur (Eğer yoksa)."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # regions_analysis tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS regions_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_address VARCHAR(45),
        image_no VARCHAR(100),
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        region_name VARCHAR(255),
        coordinates TEXT,
        ai_results TEXT
    );
    """)
    
    # periodic_subscriptions tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS periodic_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        region_id INTEGER,
        notification_target VARCHAR(255),
        interval_minutes INTEGER DEFAULT 120,
        last_checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (region_id) REFERENCES regions_analysis(id) ON DELETE CASCADE
    );
    """)
    
    conn.commit()
    conn.close()
    print("✅ Veritabanı ve tablolar başarıyla initialize edildi (WAL Modu Aktif).")

if __name__ == "__main__":
    # Bu dosya doğrudan çalıştırıldığında test için tabloları kurar
    init_db()