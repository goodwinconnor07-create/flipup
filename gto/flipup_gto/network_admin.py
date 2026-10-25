"""Authenticated immutable campaign artifacts on the coach's persistent volume.

Objects are opaque bytes, never unpickled/executed/activated. A client uploads
content-addressed objects then a snapshot describing original paths/checksums.
"""
from __future__ import annotations
import fcntl
import hashlib
import os
from pathlib import Path
import re
import shutil
import tempfile
from fastapi import APIRouter,HTTPException,Request
from fastapi.responses import FileResponse
from .flop_admin import _check

ROOT=Path(__file__).parent/'data/cache/network'
MAX_BYTES=64*1024**2
QUOTA_BYTES=int(os.environ.get('FLIPUP_NETWORK_QUOTA_BYTES',str(10*1024**3)))
router=APIRouter(prefix='/admin/network')
NAME=re.compile(r'[a-zA-Z0-9_-]{1,80}\Z')
SHA=re.compile(r'[0-9a-f]{64}\Z')


def folder(run):
    if not NAME.fullmatch(run):raise HTTPException(400,'invalid run')
    return ROOT/run


def file_path(run,kind,sha):
    if kind not in ('objects','snapshots') or not SHA.fullmatch(sha):raise HTTPException(400,'invalid object')
    return folder(run)/kind/sha


@router.get('/storage')
def storage(request:Request):
    _check(request)
    ROOT.mkdir(parents=True,exist_ok=True)
    return {'quota_bytes':QUOTA_BYTES,'free_bytes':shutil.disk_usage(ROOT).free}


@router.get('/{run}/{kind}')
def listing(run:str,kind:str,request:Request):
    _check(request)
    if kind!='snapshots':raise HTTPException(400,'only snapshots may be listed')
    root=folder(run)/kind
    return {'snapshots':sorted([{'sha':p.name,'created':p.stat().st_mtime} for p in root.glob('*') if SHA.fullmatch(p.name)],key=lambda r:r['created'])}


@router.get('/{run}/{kind}/{sha}')
def download(run:str,kind:str,sha:str,request:Request):
    _check(request);path=file_path(run,kind,sha)
    if not path.is_file():raise HTTPException(404,'not uploaded')
    return FileResponse(path,media_type='application/octet-stream')


@router.put('/{run}/{kind}/{sha}')
async def upload(run:str,kind:str,sha:str,request:Request):
    _check(request);dest=file_path(run,kind,sha)
    if dest.exists():return {'status':'exists'}
    dest.parent.mkdir(parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix='.incoming-',dir=dest.parent)
    size=0;hasher=hashlib.sha256()
    try:
        with os.fdopen(fd,'wb') as f:
            async for chunk in request.stream():
                size+=len(chunk)
                if size>MAX_BYTES:raise HTTPException(413,'artifact exceeds 64 MiB; split it before upload')
                hasher.update(chunk);f.write(chunk)
            f.flush();os.fsync(f.fileno())
        if hasher.hexdigest()!=sha:raise HTTPException(400,'checksum mismatch')
        ROOT.mkdir(parents=True,exist_ok=True)
        with (ROOT/'.quota.lock').open('w') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            if not dest.exists():
                counter=ROOT/'.reserved-bytes'
                used=int(counter.read_text()) if counter.exists() else sum(
                    p.stat().st_size for p in ROOT.rglob('*') if p.is_file() and SHA.fullmatch(p.name))
                if used+size>QUOTA_BYTES or shutil.disk_usage(ROOT).free<size+512*1024**2:
                    raise HTTPException(507,'network artifact quota/disk reserve reached; local files remain safe')
                # Reserve before linking: a crash can overcount one object, never bypass quota.
                counter_tmp=ROOT/'.reserved-bytes.part'
                with counter_tmp.open('w') as cf:
                    cf.write(str(used+size));cf.flush();os.fsync(cf.fileno())
                os.replace(counter_tmp,counter)
                os.link(tmp,dest)
        return {'status':'saved','bytes':size}
    finally:
        Path(tmp).unlink(missing_ok=True)
