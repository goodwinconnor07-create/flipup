"""Persistent approved scenarios and deduplicated laptop work queue. No live solving here."""
from __future__ import annotations
import json
import secrets
import sqlite3
import time
import shutil
from pathlib import Path
from .value_data import digest
from .scroll_scenarios import validate_public,VERSION

ROOT=Path(__file__).parent/'data/cache/scroll'
MAX_PENDING=256


def retired_ids():
    return set(json.loads((Path(__file__).parent/'data/withdrawn_scroll.json').read_text()))


def install_seed():
    """Withdraw the unauthorized cloud starter bank, preserving private audit records."""
    with db() as c:
        c.execute('CREATE TABLE IF NOT EXISTS withdrawn(id TEXT PRIMARY KEY)')
        c.executemany('INSERT OR IGNORE INTO withdrawn VALUES(?)', [(i,) for i in retired_ids()])



def db():
    ROOT.mkdir(parents=True,exist_ok=True)
    c=sqlite3.connect(ROOT/'scroll.sqlite3',timeout=15);c.row_factory=sqlite3.Row
    c.execute('PRAGMA journal_mode=WAL')
    c.executescript('''
    CREATE TABLE IF NOT EXISTS withdrawn(id TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS scenarios(id TEXT PRIMARY KEY, public TEXT NOT NULL, spec TEXT NOT NULL, created REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, lease TEXT, until REAL, result TEXT, error TEXT, updated REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    ''')
    return c


def publish(entries):
    # Validate the entire pack before changing any public content.
    seen=set()
    retired=retired_ids()
    for e in entries:
        p=validate_public(e['scenario']);spec=e['solve']
        if p['id'] in retired:raise ValueError('withdrawn cloud starter cannot be republished')
        if p['id'] in seen or spec.get('version')!=VERSION or spec['players']!=p['players']:raise ValueError('duplicate/mismatched scenario')
        if len(spec['ranges'])!=spec['players'] or any(len(r)!=1326 for r in spec['ranges']):raise ValueError('invalid ranges')
        json.dumps(e,allow_nan=False);seen.add(p['id'])
    with db() as c:
        count=c.execute('SELECT count(*) FROM scenarios').fetchone()[0]
        new=sum(c.execute('SELECT 1 FROM scenarios WHERE id=?',(e['scenario']['id'],)).fetchone() is None for e in entries)
        if new and (count+new>20000 or shutil.disk_usage(ROOT).free<512*1024**2):raise ValueError('Scroll storage capacity reached; laptop data remains intact')
        for e in entries:
            old=c.execute('SELECT public FROM scenarios WHERE id=?',(e['scenario']['id'],)).fetchone()
            body=json.dumps(e['scenario'],separators=(',',':'))
            if old and old['public']!=body:raise ValueError('immutable scenario id cannot be replaced')
            c.execute('INSERT OR IGNORE INTO scenarios VALUES(?,?,?,?)',(e['scenario']['id'],body,json.dumps(e['solve']),time.time()))
    return len(entries)


def catalogue():
    with db() as c:rows=c.execute('SELECT public FROM scenarios WHERE id NOT IN (SELECT id FROM withdrawn) ORDER BY created DESC LIMIT 1000').fetchall()
    items=[json.loads(r['public']) for r in rows if json.loads(r['public'])['id'] not in retired_ids()]
    small=[{k:d[k] for k in ('id','family','tags','difficulty','players')} for d in items]
    return dict(version=digest(small),count=len(small),items=small)


def get_scenario(ident,private=False):
    if ident in retired_ids():return None
    with db() as c:r=c.execute('SELECT * FROM scenarios WHERE id=?',(ident,)).fetchone()
    if not r:return None
    return {'scenario':json.loads(r['public']),'solve':json.loads(r['spec'])} if private else json.loads(r['public'])


def enqueue(kind,payload,identity=None):
    key=digest([VERSION,kind,payload if identity is None else identity])
    with db() as c:
        old=c.execute('SELECT id FROM jobs WHERE id=?',(key,)).fetchone()
        if old:return key
        count=c.execute("SELECT count(*) FROM jobs WHERE state IN ('queued','running')").fetchone()[0]
        if count>=MAX_PENDING:raise ValueError('solve queue is full; try later')
        if c.execute('SELECT count(*) FROM jobs').fetchone()[0]>=50000:raise ValueError('solve cache capacity reached')
        c.execute('INSERT INTO jobs(id,kind,payload,state,updated) VALUES(?,?,?,?,?)',(key,kind,json.dumps(payload),'queued',time.time()))
    return key


def result(key):
    with db() as c:r=c.execute('SELECT kind,state,result,error FROM jobs WHERE id=?',(key,)).fetchone()
    if not r:return None
    return dict(kind=r['kind'],status=r['state'],result=json.loads(r['result']) if r['result'] else None,
                error=r['error'] if r['state']=='failed' else None)


def lease():
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        paused=c.execute("SELECT value FROM settings WHERE key='paused'").fetchone()
        if paused and paused[0]=='true':return None
        c.execute("UPDATE jobs SET state=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,lease=NULL,error='worker lease expired' WHERE state='running' AND until<?",(time.time(),))
        r=c.execute("SELECT * FROM jobs WHERE state='queued' AND attempts<3 ORDER BY updated LIMIT 1").fetchone()
        if not r:return None
        token=secrets.token_hex(24)
        c.execute("UPDATE jobs SET state='running',attempts=attempts+1,lease=?,until=?,updated=? WHERE id=?",(token,time.time()+600,time.time(),r['id']))
        return dict(id=r['id'],kind=r['kind'],payload=json.loads(r['payload']),lease=token,attempt=r['attempts']+1)


def heartbeat(key,token):
    with db() as c:
        changed=c.execute("UPDATE jobs SET until=? WHERE id=? AND lease=? AND state='running'",(time.time()+600,key,token)).rowcount
    if not changed:raise ValueError('stale lease')


def complete(key,token,value=None,error=None):
    if value is not None:
        json.dumps(value,allow_nan=False)
        quality=value.get('quality',{})
        if not 0<=quality.get('gapPct',1)<=.1 or not 0<=quality.get('heroFrequencyDrift',1)<=.03:raise ValueError('unverified result')
        if not 0<=quality.get('heroEvDrift',0)<=.01:raise ValueError('unstable action values')
    with db() as c:
        r=c.execute('SELECT * FROM jobs WHERE id=? AND lease=? AND state=\'running\'',(key,token)).fetchone()
        if not r:raise ValueError('stale lease')
        state='done' if value is not None else ('queued' if r['attempts']<3 else 'failed')
        c.execute('UPDATE jobs SET state=?,result=?,error=?,lease=NULL,updated=? WHERE id=?',
                  (state,json.dumps(value) if value is not None else None,str(error)[:500] if error else None,time.time(),key))


def control(paused):
    with db() as c:c.execute("INSERT OR REPLACE INTO settings VALUES('paused',?)",(json.dumps(bool(paused)),))


def status():
    with db() as c:
        jobs={r[0]:r[1] for r in c.execute('SELECT state,count(*) FROM jobs GROUP BY state')}
        count=c.execute('SELECT count(*) FROM scenarios').fetchone()[0]
        paused=c.execute("SELECT value FROM settings WHERE key='paused'").fetchone()
    return dict(scenarios=count,jobs=jobs,paused=bool(paused and paused[0]=='true'))
