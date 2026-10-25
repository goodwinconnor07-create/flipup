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
/admin/flops, /admin/preflop  -> solved-flop uploads from the laptops (flop_admin.py; needs FLIPUP_UPLOAD_TOKEN)
"""
from __future__ import annotations

import threading
import traceback
import uuid
from concurrent.futures import ThreadPoolExecutor

import os

import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import _engine
from .cards import parse_cards, parse_combo
from .concepts import alpha, mdf, pot_odds_ratio, required_equity, river_bluff_share
from .handhistory import HandHistory
from .preflop import CLASSES
from .ranges import Range
from . import flop_admin, library, network_admin, scroll_api
from .custom import Explorer, NeedsSolve
from .review import Reviewer, aggregate_session
from .solver import BetSizing, PostflopSolver

app = FastAPI(title="FlipUp GTO", version="0.2")
# The app may be served from another origin (its Cloudflare Worker); allow it to call us.
app.add_middleware(CORSMiddleware, allow_origins=os.environ.get("FLIPUP_CORS", "*").split(","),
                   allow_methods=["GET", "POST"], allow_headers=["*"])
app.include_router(flop_admin.router)  # flop uploads from the laptops; off without FLIPUP_UPLOAD_TOKEN
app.include_router(network_admin.router)  # opaque campaign backups; same private admin token
app.include_router(scroll_api.router)  # approved Scroll data and a bounded laptop solve queue
from . import scroll_store
scroll_store.install_seed()
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
    jid = uuid.uuid4().hex[:12]
    with _lock:
        _jobs[jid] = {"status": "running", "progress": 0, "total": total, "result": None}

    def run():
        try:
            result = plain(fn(lambda k: _jobs[jid].update(progress=k)))
            _jobs[jid].update(status="done", result=result)
        except Exception as e:  # report the failure to the client
            _jobs[jid].update(status="error", error=f"{type(e).__name__}: {e}", trace=traceback.format_exc())

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
                reports.append({"hand_id": hh.id, "error": f"{type(e).__name__}: {e}"})
            progress(k + 1)
        return {"hands": reports, "session": aggregate_session(reports, hero)}
    return fn


@app.post("/review/hand")
def review_hand(req: HandReq):
    try:
        hh = HandHistory.from_dict(req.hand)
    except (KeyError, ValueError) as e:
        raise HTTPException(400, f"bad hand history: {e}")
    return plain(reviewer.review(hh, req.hero))


@app.post("/review/session")
def review_session(req: SessionReq):
    try:
        hhs = [HandHistory.from_dict(h) for h in req.hands]
    except (KeyError, ValueError) as e:
        raise HTTPException(400, f"bad hand history: {e}")
    return {"job": _start_job(_review_many(hhs, req.hero), len(hhs))}


@app.post("/review/flipup")
def review_flipup(req: FlipUpReq):
    try:
        hhs = [HandHistory.from_flipup_log(log, req.players, req.small_blind, req.big_blind) for log in req.logs]
    except (KeyError, ValueError) as e:
        raise HTTPException(400, f"bad hand log: {e}")
    return {"job": _start_job(_review_many(hhs, req.hero), len(hhs))}


@app.post("/analyze")
def analyze(req: HandReq):
    try:
        hh = HandHistory.from_dict(req.hand)
    except (KeyError, ValueError) as e:
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
    from .custom_cache import cached
    hit = cached(d)
    if hit is not None:
        return hit
    try:
        return plain(explorer.spot(d))
    except NeedsSolve as e:
        jid = _start_job(lambda progress: explorer.spot(d, solve=True), 1)
        return {"status": "solving", "job": jid, "message": e.message}
    except (ValueError, KeyError, IndexError) as e:
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
    if jid not in _jobs:
        raise HTTPException(404, "no such job")
    j = dict(_jobs[jid])
    j.pop("trace", None)
    return j


@app.get("/preflop/chart")
def preflop_chart(players: int = 6, stack: float = 100, path: str = ""):
    spot = reviewer.preflop.get(players, stack)
    steps = [s for s in path.split(",") if s]
    try:
        node = spot.node(steps)
    except ValueError as e:
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
    return {"position": node.position, "actions": node.labels, "pot_bb": node.info["pot"],
            "range_strategy": node.range_strategy(), "hands": grid}


@app.post("/solve/postflop")
def solve_postflop(req: PostflopReq):
    try:
        s = PostflopSolver(req.board, req.pot, req.stack, req.oop_range, req.ip_range, sizing=BetSizing.standard())
    except ValueError as e:
        raise HTTPException(400, str(e))
    st = s.solve(req.iterations, req.target_pct, 25)
    node = s.node(req.path)
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
        r = Range.parse(req.range)
    except ValueError as e:
        raise HTTPException(400, str(e))
    w, t, l = _engine.equity_vs_range(combo, r.w.tolist(), board, 50000)
    return {"win": w, "tie": t, "lose": l, "equity": w + t / 2}


_glossary = None


@app.get("/glossary")
def glossary():
    global _glossary
    if _glossary is None:
        import json
        import os
        _glossary = json.load(open(os.path.join(os.path.dirname(__file__), "data", "glossary.json")))
    return _glossary


@app.get("/math")
def math(pot: float, bet: float):
    return {"pot_odds": f"{pot_odds_ratio(pot, bet):.2f} to 1", "required_equity": required_equity(pot, bet),
            "mdf": mdf(pot, bet), "alpha": alpha(pot, bet), "river_bluff_share": river_bluff_share(pot, bet)}
