"""Synthetic portfolio server. No production imports, model calls or file reads."""
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from hashlib import sha256
from typing import Literal
import asyncio, json, time, uuid
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field
PROJECT = 'DEMO-001'
REFERENCE = '示例工作记录应包含任务名称、负责人、完成状态和依据编号。'
ANSWER = '### 让结果与依据对应\n\n每条检查记录可以关联资料编号、版本与页码，复核时沿原文核对。\n\n> ' + REFERENCE + '\n\n示例来源：**DEMO-REF-001 · 示例页 1**。\n\n本页使用预置文本演示交互，未检索真实规范、未调用模型，也不输出工程质量结论。'
TOOLS = ('read', 'retrieve', 'summarize')

class RunInput(BaseModel):
    model_config = ConfigDict(extra='forbid', strict=True)
    request_id: str = Field(pattern='^req-demo-[a-zA-Z0-9-]{8,80}$')
    project_id: Literal['DEMO-001']
    question: str = Field(min_length=1, max_length=200)

@dataclass
class Run:
    id: str
    digest: str
    request_id: str
    created: float = field(default_factory=time.monotonic)
    state: str = 'queued'
    events: list = field(default_factory=list)
    task: asyncio.Task | None = None

class Store:

    def __init__(self, delay=0.35):
        self.runs = {}
        self.requests = {}
        self.slots = asyncio.Semaphore(2)
        self.delay = delay

    def cleanup(self):
        for key, run in list(self.runs.items()):
            if run.state == 'completed' and time.monotonic() - run.created > 1800:
                self.runs.pop(key)
                self.requests.pop(run.request_id, None)

    def admit(self, body):
        self.cleanup()
        digest = sha256(json.dumps(dict(project=body.project_id, question=body.question), sort_keys=True).encode()).hexdigest()
        old = self.requests.get(body.request_id)
        if old:
            run = self.runs[old]
            if run.digest != digest:
                raise HTTPException(409, 'request_id_conflict')
            return (run, True)
        if len(self.runs) >= 64:
            raise HTTPException(429, 'demo_run_capacity_reached')
        run = Run('demo-' + uuid.uuid4().hex[:24], digest, body.request_id)
        self.runs[run.id] = run
        self.requests[body.request_id] = run.id
        run.task = asyncio.create_task(self.execute(run))
        return (run, False)

    def emit(self, run, kind, **fields):
        run.events.append(dict(sequence=len(run.events) + 1, run_id=run.id, project_id=PROJECT, kind=kind, **fields))

    async def execute(self, run):
        async with self.slots:
            run.state = 'running'
            self.emit(run, 'started')
            for tool in TOOLS:
                self.emit(run, 'tool_started', tool=tool)
                start = time.monotonic()
                await asyncio.sleep(self.delay)
                self.emit(run, 'tool_completed', tool=tool, duration_ms=round((time.monotonic() - start) * 1000))
            for i in range(0, len(ANSWER), 18):
                await asyncio.sleep(self.delay / 7)
                self.emit(run, 'delta', text=ANSWER[i:i + 18])
            self.emit(run, 'completed')
            run.state = 'completed'

    async def close(self):
        tasks = [run.task for run in self.runs.values() if run.task and (not run.task.done())]
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)

def create_app(*, delay=0.35):
    store = Store(delay)

    @asynccontextmanager
    async def lifespan(app):
        yield
        await store.close()
    app = FastAPI(title='BidEvidence Synthetic Demo', version='1.0.0', lifespan=lifespan)
    app.state.demo = store
    app.add_middleware(CORSMiddleware, allow_origins=['http://127.0.0.1:5174', 'http://localhost:5174'], allow_methods=['GET', 'POST'], allow_headers=['Content-Type', 'Last-Event-ID'])

    @app.get('/api/demo/health')
    async def health():
        return dict(mode='synthetic_demo', model_calls=0, production_connected=False)

    @app.post('/api/demo/runs', status_code=202)
    async def start(body: RunInput):
        if not body.question.strip():
            raise HTTPException(422, 'question_required')
        run, reused = store.admit(body)
        return dict(run_id=run.id, project_id=PROJECT, state=run.state, reused=reused, mode='synthetic_demo', model_calls=0)

    @app.get('/api/demo/runs/{run_id}')
    async def snapshot(run_id: str):
        run = store.runs.get(run_id)
        if not run:
            raise HTTPException(404, 'demo_run_not_found')
        return dict(run_id=run.id, project_id=PROJECT, state=run.state, events=run.events, model_calls=0)

    @app.get('/api/demo/runs/{run_id}/events')
    async def events(run_id: str, request: Request, after: int=0):
        run = store.runs.get(run_id)
        if not run:
            raise HTTPException(404, 'demo_run_not_found')
        raw = request.headers.get('last-event-id', str(after))
        if not raw.isdigit() or not 0 <= int(raw) <= len(run.events):
            raise HTTPException(422, 'invalid_event_cursor')
        cursor = int(raw)

        async def stream():
            nonlocal cursor
            while True:
                if await request.is_disconnected():
                    return
                for event in run.events[cursor:]:
                    cursor = event['sequence']
                    yield ('id: ' + str(cursor) + '\nevent: demo\ndata: ' + json.dumps(event, ensure_ascii=False) + '\n\n')
                if run.state == 'completed':
                    return
                yield ': keepalive\n\n'
                await asyncio.sleep(0.05)
        return StreamingResponse(stream(), media_type='text/event-stream', headers={'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no'})
    return app
app = create_app()
