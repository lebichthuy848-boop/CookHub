"""Apply the additive SQL Server personalization migration without rebuilding data."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from sqlalchemy import text
from app.database import engine

if __name__ == '__main__':
    script = Path(__file__).with_name('personalization.sql').read_text(encoding='utf-8-sig')
    with engine.begin() as connection:
        for batch in script.split('\nGO'):
            if batch.strip():
                connection.execute(text(batch))
    print('UserPreferences migration applied.')
