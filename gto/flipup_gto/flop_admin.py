"""Upload and download of solved flops, for the laptops that build the flop library.

Off unless the FLIPUP_UPLOAD_TOKEN environment variable is set (`fly secrets set`); every request must then
send `Authorization: Bearer <token>`. Without the variable these routes answer 404 like any unknown path.

GET  /admin/flops                  -> {"spots": {spot: [flop, ...]}, "preflop": [file, ...]}
GET  /admin/flops/{spot}/{flop}    -> the stored .npz
PUT  /admin/flops/{spot}/{flop}    body: the .npz -> {"status": "saved"} (201) or {"status": "exists"} (200)
GET  /admin/preflop/{file}         -> a cached preflop solution, so a laptop starts from the coach's copy

A stored flop is never replaced: a second upload of the same (spot, flop) is answered "exists" and dropped.
"""
from __future__ import annotations

import hmac
import io
import itertools
import json
import os
import re

import numpy as np
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse

from .flop_library import SPOTS, canonical

CACHE = os.path.join(os.path.dirname(__file__), "data", "cache")
FLOPS = os.path.join(CACHE, "flops")
MAX_BYTES = 4 << 20  # a stored flop is about 110 KB
PREFLOP_FILE = re.compile(r"preflop_[2-9]p_[0-9.]+bb_[0-9a-f]{16}\.npz")

router = APIRouter(prefix="/admin")
_names: set[str] | None = None


def flop_names() -> set[str]:
    """The 1,755 stored flop names."""
    global _names
    if _names is None:
        _names = {canonical(f)[0] for f in itertools.combinations(range(52), 3)}
    return _names


def _check(request: Request):
    token = os.environ.get("FLIPUP_UPLOAD_TOKEN", "")
    if not token:
        raise HTTPException(404, "Not Found")
    sent = request.headers.get("authorization", "")
    if not hmac.compare_digest(sent.encode(), f"Bearer {token}".encode()):
        raise HTTPException(401, "bad token")


def _path(spot: str, flop: str) -> str:
    if spot not in SPOTS:
        raise HTTPException(404, f"unknown matchup {spot!r}")
    if flop not in flop_names():
        raise HTTPException(404, f"{flop!r} is not a stored flop name")
    return os.path.join(FLOPS, spot, f"{flop}.npz")


def _validate(body: bytes):
    """A file flop_library.solve_flop wrote: the arrays and meta the coach reads."""
    try:
        d = np.load(io.BytesIO(body), allow_pickle=False)
        meta = json.loads(str(d["meta"]))
        for key in ("combos0", "combos1", "realization", "s:", "e:", "r:"):
            d[key]
        for key in ("pot", "stack", "nodes", "exploitability_pct"):
            meta[key]
    except Exception as e:  # noqa: BLE001 - anything unreadable is the uploader's problem
        raise HTTPException(400, f"not a solved flop file: {type(e).__name__}: {e}")


@router.get("/flops")
def list_flops(request: Request):
    _check(request)
    spots = {}
    for spot in SPOTS:
        folder = os.path.join(FLOPS, spot)
        spots[spot] = sorted(f[:-4] for f in os.listdir(folder) if f.endswith(".npz")) if os.path.isdir(folder) else []
    preflop = sorted(f for f in os.listdir(CACHE) if PREFLOP_FILE.fullmatch(f)) if os.path.isdir(CACHE) else []
    return {"spots": spots, "preflop": preflop}


@router.get("/flops/{spot}/{flop}")
def get_flop(spot: str, flop: str, request: Request):
    _check(request)
    path = _path(spot, flop)
    if not os.path.exists(path):
        raise HTTPException(404, "not solved yet")
    return FileResponse(path, media_type="application/octet-stream")


@router.put("/flops/{spot}/{flop}")
async def put_flop(spot: str, flop: str, request: Request):
    _check(request)
    path = _path(spot, flop)
    body = await request.body()
    if len(body) > MAX_BYTES:
        raise HTTPException(413, "too large for a solved flop")
    _validate(body)
    if os.path.exists(path):
        return {"status": "exists"}
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = f"{path}.{os.getpid()}.{id(body)}.part"
    with open(tmp, "wb") as f:
        f.write(body)
    try:
        os.link(tmp, path)  # fails if the file appeared meanwhile, so a stored flop is never replaced
    except FileExistsError:
        return {"status": "exists"}
    finally:
        os.unlink(tmp)
    return JSONResponse({"status": "saved"}, status_code=201)


@router.get("/preflop/{name}")
def get_preflop(name: str, request: Request):
    _check(request)
    if not PREFLOP_FILE.fullmatch(name):
        raise HTTPException(404, "not a preflop cache file")
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        raise HTTPException(404, "not on the coach")
    return FileResponse(path, media_type="application/octet-stream")
