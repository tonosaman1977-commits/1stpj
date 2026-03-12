import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

load_dotenv('.env.local')

import models  # noqa: F401 - registers models with Base
from database import Base, engine, get_db
from limiter import limiter
from routers import auth, history, schedule, themes
from scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    if os.getenv('TESTING') != 'true':
        start_scheduler()
    yield
    if os.getenv('TESTING') != 'true':
        stop_scheduler()


app = FastAPI(title='Threads自動投稿API', lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        return response


app.add_middleware(SecurityHeadersMiddleware)

ALLOWED_ORIGINS = [o for o in [os.getenv('FRONTEND_URL'), 'http://localhost:5173'] if o]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allow_headers=['Authorization', 'Content-Type'],
)

app.include_router(auth.router)
app.include_router(themes.router)
app.include_router(schedule.router)
app.include_router(history.router)


@app.get('/health')
def health():
    db = next(get_db())
    try:
        db.execute(__import__('sqlalchemy').text('SELECT 1'))
        return {'status': 'ok'}
    except Exception:
        return JSONResponse(status_code=503, content={'status': 'error'})
    finally:
        db.close()


@app.get('/metrics')
def metrics():
    import models as _models
    db = next(get_db())
    try:
        user_count = db.query(_models.User).count()
        theme_count = db.query(_models.PostTheme).count()
        history_count = db.query(_models.PostHistory).count()
        return {
            'users_total': user_count,
            'themes_total': theme_count,
            'histories_total': history_count,
        }
    finally:
        db.close()


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import logging
    logger = logging.getLogger(__name__)
    logger.error('Unhandled exception: %s', exc, exc_info=True)
    return JSONResponse(status_code=500, content={'detail': 'Internal server error'})
