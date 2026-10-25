#!/usr/bin/env python3
"""Checksum backups and peer downloads through the coach; no model activation or deletion."""
from __future__ import annotations
import fcntl
import hashlib
import json
from pathlib import Path
import urllib.request
import urllib.error
import os
import time
from coach_client import Coach,Refused


class Artifacts:
    def __init__(self):
        self.coach=Coach()
    def call(self,method,run,kind,sha='',body=None):
        # Coach._call retries 5xx and waking-machine connection failures. Token stays in headers.
        path=f'/network/{run}/{kind}'+('/'+sha if sha else '')
        return self.coach._call(method,path,body)[1]
    def probe(self,run):
        return json.loads(self.call('GET',run,'snapshots'))
    def push(self,root,run):
        root=Path(root)
        with (root/'.sync.lock').open('w') as lock:
            fcntl.flock(lock,fcntl.LOCK_EX)
            return self._push(root,run)
    def _push(self,root,run):
        root=Path(root)
        inventory=[]
        for p in sorted(root.rglob('*')):
            if not p.is_file() or p.is_symlink() or any(x.startswith('.') for x in p.relative_to(root).parts):continue
            if p.suffix in ('.lock','.part') or p.name.endswith('.tmp.npz'):continue
            if p.stat().st_size>64*1024**2:raise ValueError(f'{p}: exceeds artifact limit')
            before=p.stat();body=p.read_bytes();after=p.stat()
            if (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):continue
            sha=hashlib.sha256(body).hexdigest()
            # Local receipt avoids uploading completed immutable samples every sync.
            receipt=root/'.uploaded'/run/sha
            if not receipt.exists():
                self.call('PUT',run,'objects',sha,body)
                receipt.parent.mkdir(parents=True,exist_ok=True);receipt.touch()
            inventory.append(dict(path=str(p.relative_to(root)),sha=sha,bytes=len(body)))
        body=json.dumps(dict(files=inventory,created=time.time()),sort_keys=True).encode()
        sha=hashlib.sha256(body).hexdigest();self.call('PUT',run,'snapshots',sha,body)
        return len(inventory)
    def pull(self,dest,run):
        listing=self.probe(run)['snapshots']
        if not listing:return 0
        snapshot=self.call('GET',run,'snapshots',listing[-1]['sha'])
        if hashlib.sha256(snapshot).hexdigest()!=listing[-1]['sha']:raise ValueError('snapshot checksum mismatch')
        dest=Path(dest).resolve();dest.mkdir(parents=True,exist_ok=True)
        count=0
        for row in json.loads(snapshot)['files']:
            relative=Path(row['path'])
            if relative.is_absolute() or '..' in relative.parts:raise ValueError('unsafe snapshot path')
            p=dest/relative
            if p.exists() and hashlib.sha256(p.read_bytes()).hexdigest()==row['sha']:continue
            body=self.call('GET',run,'objects',row['sha'])
            if hashlib.sha256(body).hexdigest()!=row['sha']:raise ValueError('artifact checksum mismatch')
            p.parent.mkdir(parents=True,exist_ok=True)
            tmp=p.with_suffix(p.suffix+'.part');tmp.write_bytes(body);os.replace(tmp,p);count+=1
        return count


if __name__=='__main__':
    import argparse
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('action',choices=['push','pull','probe'])
    ap.add_argument('--root',type=Path,required=True);ap.add_argument('--run',required=True);a=ap.parse_args()
    client=Artifacts();print(client.probe(a.run) if a.action=='probe' else getattr(client,a.action)(a.root,a.run))
