import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv('.env.local')

import models  # noqa: F401 - registers models with Base
from database import Base, engine
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv('FRONTEND_URL', 'http://localhost:5173')],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(themes.router)
app.include_router(schedule.router)
app.include_router(history.router)


@app.get('/health')
def health():
    return {'status': 'ok'}
