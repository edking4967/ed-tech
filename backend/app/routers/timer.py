import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(prefix="/timer", tags=["timer"])

# classroom_id -> {duration, remaining, running, connections}
_timers: dict[int, dict] = {}


def _get_timer(classroom_id: int) -> dict:
    if classroom_id not in _timers:
        _timers[classroom_id] = {"duration": 0, "remaining": 0, "running": False, "connections": set()}
    return _timers[classroom_id]


async def _broadcast(classroom_id: int, data: dict):
    timer = _timers.get(classroom_id)
    if not timer:
        return
    dead = set()
    for ws in timer["connections"]:
        try:
            await ws.send_json(data)
        except Exception:
            dead.add(ws)
    timer["connections"] -= dead


@router.websocket("/ws/{classroom_id}")
async def timer_ws(websocket: WebSocket, classroom_id: int):
    await websocket.accept()
    timer = _get_timer(classroom_id)
    timer["connections"].add(websocket)

    # send current state immediately on connect
    await websocket.send_json({"remaining": timer["remaining"], "running": timer["running"]})

    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            action = msg.get("action")

            if action == "set":
                timer["duration"] = int(msg["seconds"])
                timer["remaining"] = int(msg["seconds"])
                timer["running"] = False
            elif action == "start":
                timer["running"] = True
            elif action == "pause":
                timer["running"] = False
            elif action == "reset":
                timer["remaining"] = timer["duration"]
                timer["running"] = False

            await _broadcast(classroom_id, {"remaining": timer["remaining"], "running": timer["running"]})
    except WebSocketDisconnect:
        timer["connections"].discard(websocket)


async def tick_timers():
    """Background task — decrements all running timers once per second."""
    while True:
        await asyncio.sleep(1)
        for classroom_id, timer in list(_timers.items()):
            if timer["running"] and timer["remaining"] > 0:
                timer["remaining"] -= 1
                await _broadcast(classroom_id, {"remaining": timer["remaining"], "running": timer["running"]})
                if timer["remaining"] == 0:
                    timer["running"] = False
