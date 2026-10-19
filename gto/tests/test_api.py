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
