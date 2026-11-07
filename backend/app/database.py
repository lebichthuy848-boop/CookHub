from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from .config import settings

class Base(DeclarativeBase):
    pass

engine_options = {'pool_pre_ping': True}
if settings.database_url.startswith('mssql+pyodbc'):
    engine_options.update(
        pool_size=10, max_overflow=10, pool_timeout=10, pool_recycle=900,
        connect_args={'timeout': 10},
    )
engine = create_engine(settings.database_url, **engine_options)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

def get_db():
    with SessionLocal() as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise

