"""Talks to the coach's /admin routes (flipup_gto/flop_admin.py) for the laptop scripts. Standard library only.

The coach URL and token come from FLIPUP_COACH and FLIPUP_UPLOAD_TOKEN (laptop_service.sh writes them to
~/.config/flipup-flops.env). The coach machine sleeps when idle, so the first request can take a while.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request


class Refused(Exception):
    """The coach answered 4xx: a bad token or a bad file. Retrying won't help."""


class Coach:
    def __init__(self, url: str | None = None, token: str | None = None, timeout: float = 120):
        self.url = (url or os.environ.get("FLIPUP_COACH", "")).rstrip("/")
        self.token = token or os.environ.get("FLIPUP_UPLOAD_TOKEN", "")
        self.timeout = timeout
        if not self.url or not self.token:
            raise SystemExit("set FLIPUP_COACH and FLIPUP_UPLOAD_TOKEN (see gto/scripts/laptop_service.sh)")

    def _call(self, method: str, path: str, body: bytes | None = None, tries: int = 4):
        req = urllib.request.Request(f"{self.url}/admin{path}", data=body, method=method,
                                     headers={"Authorization": f"Bearer {self.token}",
                                              "Content-Type": "application/octet-stream"})
        for k in range(tries):
            try:
                with urllib.request.urlopen(req, timeout=self.timeout) as r:
                    return r.status, r.read()
            except urllib.error.HTTPError as e:
                if e.code < 500:
                    raise Refused(f"coach said {e.code} to {method} {path}: {e.read().decode(errors='replace')}")
                err = e
            except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
                err = e
            time.sleep(5 * 2 ** k)  # the machine may still be waking up
        raise ConnectionError(f"{method} {path} failed after {tries} tries: {err}")

    def listing(self) -> dict:
        """{"spots": {spot: [flop, ...]}, "preflop": [file, ...]}"""
        return json.loads(self._call("GET", "/flops")[1])

    def get_flop(self, spot: str, flop: str, dest: str):
        _save(dest, self._call("GET", f"/flops/{spot}/{flop}")[1])

    def put_flop(self, spot: str, flop: str, path: str) -> str:
        """'saved' or 'exists'."""
        with open(path, "rb") as f:
            return json.loads(self._call("PUT", f"/flops/{spot}/{flop}", f.read())[1])["status"]

    def get_preflop(self, name: str, dest: str):
        _save(dest, self._call("GET", f"/preflop/{name}")[1])


def _save(dest: str, data: bytes):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".part"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, dest)
