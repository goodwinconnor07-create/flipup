import io
import json

import numpy as np
import pytest

pytest.importorskip("httpx")
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from flipup_gto import flop_admin  # noqa: E402

AUTH = {"Authorization": "Bearer secret"}


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("FLIPUP_UPLOAD_TOKEN", "secret")
    monkeypatch.setattr(flop_admin, "CACHE", str(tmp_path))
    monkeypatch.setattr(flop_admin, "FLOPS", str(tmp_path / "flops"))
    app = FastAPI()
    app.include_router(flop_admin.router)
    return TestClient(app)


def flop_file(tag: float = 1.0) -> bytes:
    buf = io.BytesIO()
    np.savez_compressed(buf, combos0=np.arange(3, dtype=np.int16), combos1=np.arange(4, dtype=np.int16),
                        realization=np.zeros((2, 3, 169), dtype=np.float32),
                        meta=json.dumps({"pot": 5.5, "stack": 97.5, "nodes": {}, "exploitability_pct": 0.4}),
                        **{"s:": np.full((1, 3), tag, dtype=np.float16), "e:": np.zeros((1, 3), dtype=np.float16),
                           "r:": np.ones(3, dtype=np.float16)})
    return buf.getvalue()


def test_off_without_a_token(client, monkeypatch):
    monkeypatch.delenv("FLIPUP_UPLOAD_TOKEN")
    assert client.get("/admin/flops", headers=AUTH).status_code == 404


def test_needs_the_token(client):
    assert client.get("/admin/flops").status_code == 401
    assert client.get("/admin/flops", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_upload_list_download(client):
    assert client.get("/admin/flops", headers=AUTH).json()["spots"]["sb_bb"] == []
    r = client.put("/admin/flops/sb_bb/Kh7d2c", content=flop_file(), headers=AUTH)
    assert r.status_code == 201 and r.json() == {"status": "saved"}
    assert client.get("/admin/flops", headers=AUTH).json()["spots"]["sb_bb"] == ["Kh7d2c"]
    assert client.get("/admin/flops/sb_bb/Kh7d2c", headers=AUTH).content == flop_file()


def test_never_replaces_a_stored_flop(client):
    client.put("/admin/flops/sb_bb/Kh7d2c", content=flop_file(1.0), headers=AUTH)
    r = client.put("/admin/flops/sb_bb/Kh7d2c", content=flop_file(0.5), headers=AUTH)
    assert r.status_code == 200 and r.json() == {"status": "exists"}
    assert client.get("/admin/flops/sb_bb/Kh7d2c", headers=AUTH).content == flop_file(1.0)


def test_rejects_bad_names_and_files(client):
    assert client.put("/admin/flops/nope/Ks7d2c", content=flop_file(), headers=AUTH).status_code == 404
    assert client.put("/admin/flops/sb_bb/Ks7d2c", content=flop_file(), headers=AUTH).status_code == 404  # not the stored spelling
    assert client.put("/admin/flops/sb_bb/..%2F..%2Fx", content=flop_file(), headers=AUTH).status_code == 404
    assert client.put("/admin/flops/sb_bb/Kh7d2c", content=b"not a file", headers=AUTH).status_code == 400
    assert client.get("/admin/flops", headers=AUTH).json()["spots"]["sb_bb"] == []


def test_preflop_download(client, tmp_path):
    name = "preflop_6p_100bb_0123456789abcdef.npz"
    (tmp_path / name).write_bytes(b"cum")
    assert client.get("/admin/flops", headers=AUTH).json()["preflop"] == [name]
    assert client.get(f"/admin/preflop/{name}", headers=AUTH).content == b"cum"
    assert client.get("/admin/preflop/eqr_kinds.json", headers=AUTH).status_code == 404


def test_flop_names():
    assert len(flop_admin.flop_names()) == 1755
