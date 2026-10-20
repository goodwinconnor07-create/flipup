"""HTTP API for the FlipUp app.

Run:  uvicorn flipup_gto.api:app --host 0.0.0.0 --port 8000

Endpoints
---------
POST /review/hand       {"hand": <HandHistory JSON>, "hero": "p1"?}           -> review report (sync)
POST /review/session    {"hands": [...], "hero": "p1"?}                       -> {"job": id}
POST /review/flipup     {"logs": [HandLog...], "players": [...], "small_blind", "big_blind", "hero"?}
                                                                               -> {"job": id}
GET  /jobs/{id}         -> {"status": "running"|"done"|"error", "progress", "result"}
GET  /preflop/chart?players=6&stack=100&path=fold,fold,raise
                        -> strategy per hand class for the player to act, plus EVs
POST /solve/postflop    {"board", "pot", "stack", "oop_range", "ip_range", "path"?, "iterations"?}
POST /equity            {"hand": "AhKd", "range": "QQ+,AK", "board": "Ks9d5c"}
GET  /math?pot=10&bet=5 -> pot odds, required equity, MDF, alpha, bluff share
GET  /glossary          -> definitions of every concept the explanations use (for tooltips)
POST /analyze           {"hand": <HandHistory JSON>, "hero": "p1"?}  -> {"job": id}
                        custom hands: every decision gets the acting player's 13x13 strategy grid, and
                        a hand that stops early gets a "pending" entry for the next decision
GET  /library           -> drill scenarios (id, group, title, description, available)
GET  /library/{id}/drill?seed=1 -> a practice spot: context, your hand, options, and GTO's answer
"""
from __future__ import annotations

import hmac
import logging
import math as _math
import os
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import _engine
from .cards import parse_cards, parse_combo
from .concepts import alpha, mdf, pot_odds_ratio, required_equity, river_bluff_share
from .handhistory import HandHistory
from .preflop import CLASSES
from .ranges import Range
from . import library
from .custom import Explorer, NeedsSolve
from .review import Reviewer, aggregate_session, nearest_bucket
from .solver import BetSizing, PostflopSolver

log = logging.getLogger("flipup_gto")

# Limits: every endpoint is public (the app reaches this service through its Worker, but the service
# itself is reachable too), and solves are CPU and memory hungry, so inputs are capped.
MAX_BODY_BYTES = 1_000_000
MAX_HANDS = 300            # per review job
MAX_PENDING_JOBS = 8       # running + queued; more get a 429
MAX_KEPT_JOBS = 200        # finished jobs are forgotten oldest first
MAX_RANGE_CHARS = 20_000
MAX_ITERATIONS = 1000
MAX_SOLVE_MB = 3000.0
TOKEN = os.environ.get("FLIPUP_GTO_TOKEN", "")  # when set, callers must send it as x-flipup-token

app = FastAPI(title="FlipUp GTO", version="0.2")
# The app may be served from another origin (its Cloudflare Worker); allow it to call us.
# FLIPUP_CORS is a comma-separated list of origins; empty means no cross-origin browser access.
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in os.environ.get("FLIPUP_CORS", "*").split(",")
                                                  if o.strip()],
                   allow_methods=["GET", "POST"], allow_headers=["*"])


class _Guard:
    """Rejects oversized bodies and (when FLIPUP_GTO_TOKEN is set) callers without the token."""

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] == "OPTIONS":
            return await self.inner(scope, receive, send)
        headers = dict(scope["headers"])
        if TOKEN and not hmac.compare_digest(headers.get(b"x-flipup-token", b"").decode("latin-1"), TOKEN):
            return await JSONResponse({"detail": "unauthorized"}, status_code=401)(scope, receive, send)
        try:
            declared = int(headers.get(b"content-length", b"0") or 0)
        except ValueError:
            declared = MAX_BODY_BYTES + 1
        if declared > MAX_BODY_BYTES:
            return await JSONResponse({"detail": "request too large"}, status_code=413)(scope, receive, send)
        seen = 0

        async def limited():  # chunked bodies have no Content-Length: count them as they arrive
            nonlocal seen
            msg = await receive()
            if msg["type"] == "http.request":
                seen += len(msg.get("body", b""))
                if seen > MAX_BODY_BYTES:
                    raise _TooLarge()
            return msg

        try:
            await self.inner(scope, limited, send)
        except _TooLarge:
            await JSONResponse({"detail": "request too large"}, status_code=413)(scope, receive, send)


class _TooLarge(Exception):
    pass


app.add_middleware(_Guard)
reviewer = Reviewer()
explorer = Explorer(reviewer)


def _warm():
    """Load the most used preflop solution in the background so the first request is quick."""
    try:
        reviewer.preflop.get(6, 100)
    except Exception:  # noqa: BLE001 - a cold cache just means the first request waits
        pass


threading.Thread(target=_warm, daemon=True).start()
_jobs: dict = {}
_lock = threading.Lock()
_pool = ThreadPoolExecutor(max_workers=1)  # solves are multithreaded already
_heavy = threading.BoundedSemaphore(2)      # synchronous endpoints that run a solve


class HandReq(BaseModel):
    hand: dict
    hero: str | None = None


class SessionReq(BaseModel):
    hands: list
    hero: str | None = None


class FlipUpReq(BaseModel):
    logs: list
    players: list
    small_blind: float
    big_blind: float
    hero: str | None = None


class PostflopReq(BaseModel):
    board: str
    pot: float
    stack: float
    oop_range: str
    ip_range: str
    path: list = []
    iterations: int = 300
    target_pct: float = 0.5


class EquityReq(BaseModel):
    hand: str
    range: str
    board: str = ""


def _start_job(fn, total: int) -> str:
    jid = uuid.uuid4().hex
    with _lock:
        if sum(1 for j in _jobs.values() if j["status"] == "running") >= MAX_PENDING_JOBS:
            raise HTTPException(429, "the coach is busy; try again in a minute")
        _jobs[jid] = {"status": "running", "progress": 0, "total": total, "result": None}
        for old in [k for k, j in _jobs.items() if j["status"] != "running"][:max(0, len(_jobs) - MAX_KEPT_JOBS)]:
            del _jobs[old]  # dicts keep insertion order, so these are the oldest

    def run():
        try:
            result = plain(fn(lambda k: _jobs[jid].update(progress=k)))
            _jobs[jid].update(status="done", result=result)
        except Exception as e:  # report the failure to the client
            log.exception("job %s failed", jid)
            known = isinstance(e, (ValueError, KeyError, IndexError, NeedsSolve))
            _jobs[jid].update(status="error", error=f"{type(e).__name__}: {e}" if known else "internal error")

    _pool.submit(run)
    return jid


def plain(x):
    """Numpy scalars and arrays anywhere in a result, as plain JSON-ready Python values."""
    if isinstance(x, dict):
        return {str(k): plain(v) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [plain(v) for v in x]
    if isinstance(x, np.ndarray):
        return plain(x.tolist())
    if isinstance(x, np.generic):
        return x.item()
    return x


def _review_many(hhs: list, hero):
    def fn(progress):
        reports = []
        for k, hh in enumerate(hhs):
            try:
                reports.append(reviewer.review(hh, hero))
            except Exception as e:
                log.exception("review of %s failed", hh.id)
                reports.append({"hand_id": hh.id, "error": f"{type(e).__name__}: {e}"
                                if isinstance(e, (ValueError, KeyError, IndexError)) else "internal error"})
            progress(k + 1)
        return {"hands": reports, "session": aggregate_session(reports, hero)}
    return fn


@app.post("/review/hand")
def review_hand(req: HandReq):
    try:
        hh = HandHistory.from_dict(req.hand)
    except (KeyError, ValueError, TypeError, AttributeError) as e:
        raise HTTPException(400, f"bad hand history: {e}")
    if not _heavy.acquire(blocking=False):
        raise HTTPException(429, "the coach is busy; try again in a minute")
    try:
        return plain(reviewer.review(hh, req.hero))
    finally:
        _heavy.release()


@app.post("/review/session")
def review_session(req: SessionReq):
    if len(req.hands) > MAX_HANDS:
        raise HTTPException(413, f"at most {MAX_HANDS} hands per review")
    try:
        hhs = [HandHistory.from_dict(h) for h in req.hands]
    except (KeyError, ValueError, TypeError, AttributeError) as e:
        raise HTTPException(400, f"bad hand history: {e}")
    return {"job": _start_job(_review_many(hhs, req.hero), len(hhs))}


@app.post("/review/flipup")
def review_flipup(req: FlipUpReq):
    if len(req.logs) > MAX_HANDS:
        raise HTTPException(413, f"at most {MAX_HANDS} hands per review")
    try:
        hhs = [HandHistory.from_flipup_log(log, req.players, req.small_blind, req.big_blind) for log in req.logs]
    except (KeyError, ValueError, TypeError, AttributeError, IndexError) as e:
        raise HTTPException(400, f"bad hand log: {e}")
    return {"job": _start_job(_review_many(hhs, req.hero), len(hhs))}


@app.post("/analyze")
def analyze(req: HandReq):
    try:
        hh = HandHistory.from_dict(req.hand)
    except (KeyError, ValueError, TypeError, AttributeError) as e:
        raise HTTPException(400, f"bad hand: {e}")
    return {"job": _start_job(lambda progress: reviewer.review(hh, req.hero, analyze=True), 1)}


class CustomReq(BaseModel):
    players: int
    stacks_bb: list | None = None
    hero: int
    hero_cards: str | None = None
    preflop: list = []
    flop: list = []
    turn: list = []
    river: list = []
    board: list = []


@app.post("/custom/spot")
def custom_spot(req: CustomReq):
    """The custom hand so far: whose turn it is and GTO's options, or a job if a solve is needed."""
    d = req.model_dump()
    try:
        return plain(explorer.spot(d))
    except NeedsSolve as e:
        jid = _start_job(lambda progress: explorer.spot(d, solve=True), 1)
        return {"status": "solving", "job": jid, "message": e.message}
    except (ValueError, KeyError, IndexError, TypeError, OverflowError, ZeroDivisionError) as e:
        raise HTTPException(400, str(e))


@app.get("/library")
def library_list():
    return library.catalogue()


@app.get("/library/{scenario}/drill")
def library_drill(scenario: str, seed: int | None = None):
    if scenario not in library.SCENARIOS:
        raise HTTPException(404, "no such scenario")
    try:
        return plain(library.drill(reviewer, scenario, seed))
    except ValueError as e:
        raise HTTPException(404, str(e))


@app.get("/jobs/{jid}")
def job(jid: str):
    j = _jobs.get(jid)
    if j is None:
        raise HTTPException(404, "no such job")
    return dict(j)


@app.get("/preflop/chart")
def preflop_chart(players: int = 6, stack: float = 100, path: str = ""):
    if not 2 <= players <= 9 or not _math.isfinite(stack) or not 1 <= stack <= 1000:
        raise HTTPException(400, "players must be 2 to 9 and stack 1 to 1000 bb")
    stack = float(nearest_bucket(stack))  # only the standard depths are solved, and kept
    if not reviewer.preflop.ready(players, stack):
        # A cold solve takes minutes: never start one from a plain GET (/custom/spot runs it as a job).
        raise HTTPException(409, f"{players} players at {stack:g}bb isn't solved yet")
    spot = reviewer.preflop.get(players, stack)
    steps = [s for s in path.split(",") if s][:60]
    try:
        node = spot.node(steps)
    except (ValueError, IndexError) as e:
        raise HTTPException(400, str(e))
    if node.terminal:
        return {"terminal": True, "kind": node.info["terminal_kind"]}
    grid = {}
    for c, cls in enumerate(CLASSES):
        grid[cls] = {
            "reach": float(node.info["reach"][node.player][c]),
            "strategy": {lab: round(float(node.info["strategy"][i][c]), 4) for i, lab in enumerate(node.labels)},
            "ev_bb": {lab: round(float(node.info["action_ev"][i][c]), 3) for i, lab in enumerate(node.labels)},
        }
    return {"stack_bb": stack, "position": node.position, "actions": node.labels, "pot_bb": node.info["pot"],
            "range_strategy": node.range_strategy(), "hands": grid}


@app.post("/solve/postflop")
def solve_postflop(req: PostflopReq):
    if not (_math.isfinite(req.pot) and _math.isfinite(req.stack) and _math.isfinite(req.target_pct)):
        raise HTTPException(400, "pot, stack and target_pct must be numbers")
    if not 0 < req.pot <= 100_000 or not 0 <= req.stack <= 1_000_000:
        raise HTTPException(400, "pot must be 0 to 100000 and stack 0 to 1000000")
    if len(req.oop_range) > MAX_RANGE_CHARS or len(req.ip_range) > MAX_RANGE_CHARS or len(req.path) > 40:
        raise HTTPException(413, "range or path too long")
    iterations = max(1, min(req.iterations, MAX_ITERATIONS))
    if not _heavy.acquire(blocking=False):
        raise HTTPException(429, "the coach is busy; try again in a minute")
    try:
        try:
            s = PostflopSolver(req.board, req.pot, req.stack, req.oop_range, req.ip_range,
                               sizing=BetSizing.standard(), max_memory_mb=MAX_SOLVE_MB)
        except (ValueError, MemoryError) as e:  # bad input, or a tree over the memory limit
            raise HTTPException(400, str(e))
        st = s.solve(iterations, req.target_pct, 25)
        try:
            node = s.node(req.path)
        except (ValueError, IndexError, TypeError, AttributeError) as e:
            raise HTTPException(400, str(e))
    finally:
        _heavy.release()
    out = {"exploitability_pct": st.exploitability_pct, "iterations": st.iteration, "node_type": node.type,
           "pot": node.pot}
    if node.type == "action":
        out.update({"player": "oop" if node.player == 0 else "ip", "actions": node.labels,
                    "range_strategy": node.range_strategy(), "hands": node.class_strategy()})
    return out


@app.post("/equity")
def equity(req: EquityReq):
    try:
        combo = parse_combo(req.hand)
        board = parse_cards(req.board) if req.board else []
        if len(board) not in (0, 3, 4, 5):
            raise ValueError("board needs 0, 3, 4 or 5 cards")
        if set(board) & set(parse_cards(req.hand)):
            raise ValueError("hand overlaps the board")
        if len(req.range) > MAX_RANGE_CHARS:
            raise ValueError("range too long")
        r = Range.parse(req.range)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if not _heavy.acquire(blocking=False):
        raise HTTPException(429, "the coach is busy; try again in a minute")
    try:
        w, t, l = _engine.equity_vs_range(combo, r.w.tolist(), board, 50000)
    except ValueError as e:
        raise HTTPException(400, str(e))
    finally:
        _heavy.release()
    return {"win": w, "tie": t, "lose": l, "equity": w + t / 2}


_glossary = None


@app.get("/glossary")
def glossary():
    global _glossary
    if _glossary is None:
        import json
        import os
        with open(os.path.join(os.path.dirname(__file__), "data", "glossary.json")) as f:
            _glossary = json.load(f)
    return _glossary


@app.get("/math")
def math(pot: float, bet: float):
    if not (_math.isfinite(pot) and _math.isfinite(bet)) or pot < 0 or bet <= 0:
        raise HTTPException(400, "pot must be 0 or more and bet more than 0")
    return {"pot_odds": f"{pot_odds_ratio(pot, bet):.2f} to 1", "required_equity": required_equity(pot, bet),
            "mdf": mdf(pot, bet), "alpha": alpha(pot, bet), "river_bluff_share": river_bluff_share(pot, bet)}
