import json
import os

import pytest

pytest.importorskip("httpx")
from fastapi.testclient import TestClient  # noqa: E402

from flipup_gto.api import app  # noqa: E402

client = TestClient(app)
FIXTURES = os.path.join(os.path.dirname(__file__), "fixtures")


def test_math():
    r = client.get("/math", params={"pot": 10, "bet": 5}).json()
    assert r["mdf"] == pytest.approx(2 / 3)
    assert r["required_equity"] == pytest.approx(0.25)


def test_glossary():
    g = client.get("/glossary").json()
    assert "mdf" in g and "formula" in g["mdf"]


def test_equity():
    r = client.post("/equity", json={"hand": "AhKh", "range": "QQ+,AK", "board": "Qh7h2c"}).json()
    assert 0.5 < r["equity"] < 0.56


def test_bad_hand_history():
    assert client.post("/review/hand", json={"hand": {"players": []}}).status_code == 400


def test_review_hand_heads_up_shove():
    hand = json.load(open(os.path.join(FIXTURES, "hu_shove.json")))
    r = client.post("/review/hand", json={"hand": hand}).json()
    assert r["summary"]["decisions"] == 2
    assert {d["player"] for d in r["decisions"]} == {"a", "b"}


def test_job_results_are_plain_json():
    import numpy as np
    from flipup_gto.api import plain
    out = plain({"a": np.float32(0.5), "b": [np.int64(3), np.array([1.0, 2.0])], 4: (np.bool_(True),)})
    assert out == {"a": 0.5, "b": [3, [1.0, 2.0]], "4": [True]}
    json.dumps(out)


def test_library_lists_scenarios():
    r = client.get("/library").json()
    ids = {s["id"] for s in r}
    assert {"rfi", "vs_3bet", "cbet_ip", "vs_triple_barrel"} <= ids
    assert all(s["available"] for s in r if s["group"] == "Preflop")
