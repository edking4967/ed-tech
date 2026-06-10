import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import auth, classrooms, warmups, submissions, summaries, timer
from .routers.timer import tick_timers


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    task = asyncio.create_task(tick_timers())
    yield
    task.cancel()


app = FastAPI(title="Ed-Tech API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to frontend origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(classrooms.router)
app.include_router(warmups.router)
app.include_router(submissions.router)
app.include_router(summaries.router)
app.include_router(timer.router)
