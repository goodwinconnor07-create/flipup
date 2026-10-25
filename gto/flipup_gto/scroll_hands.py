"""Full-hand catalogue. Publication requires a matching engine validation receipt."""
import json
import time
from . import scroll_store as store
from .scroll_contract import fingerprint
from .scroll_scenarios import validate_public


def database():
    c=store.db()
    c.execute('CREATE TABLE IF NOT EXISTS full_hands(id TEXT PRIMARY KEY,public TEXT NOT NULL,created REAL NOT NULL)')
    return c


def publish(entries,validation):
    if validation.get('engine')!=fingerprint() or validation.get('passed') is not True:
        raise ValueError('full-hand publication requires current independent validation')
    coverage={tuple(x) for x in validation.get('coverage',[])}
    for entry in entries:
        hand=entry['hand']
        if hand.get('publicationApproved') is not True:raise ValueError('draft hands cannot be published')
        if hand.get('schema')!=3 or not hand['id'].startswith('h-') or not hand['decisions']:raise ValueError('invalid full hand')
        selected={d['scenario']['id'] for d in hand['decisions']}
        available={d['scenario']['id'] for d in entry['privateDecisions']}
        if not selected<=available:raise ValueError('missing private solve state for a hand decision')
        json.dumps(hand,allow_nan=False)
        if len(hand['board']) not in (3,4,5):raise ValueError('invalid full-hand board')
        previous=-1
        for d in hand['decisions']:
            if not previous<d['event']<len(hand['events']):raise ValueError('decisions must follow the hand event order')
            previous=d['event']
            s=validate_public(d['scenario']);st={3:'flop',4:'turn',5:'river'}[len(s['board'])]
            if (s['players'],st) not in coverage:raise ValueError('decision street/player profile is not validated')
            if hand['seats'][s['hero']]!=hand['hero'] or hand['events'][d['event']].get('player')!=s['hero']:raise ValueError('decision actor does not match hero')
            if s['board']!=hand['board'][:len(s['board'])]:raise ValueError('decision reveals a different board than the replay')
            if not 0<=d['line']<len(s['options']):raise ValueError('missing continuation action')
        with database() as c:
            old=c.execute('SELECT public FROM full_hands WHERE id=?',(hand['id'],)).fetchone()
            if old and old[0]!=json.dumps(hand,separators=(',',':')):raise ValueError('immutable hand cannot be replaced')
    # Store per-decision private roots too: arbitrary size requests must remain resolvable.
    for entry in entries:
        selected={d['scenario']['id'] for d in entry['hand']['decisions']}
        store.publish([dict(scenario=d['scenario'],solve=d['solve']) for d in entry['privateDecisions'] if d['scenario']['id'] in selected])
        with database() as c:
            c.execute('INSERT OR IGNORE INTO full_hands VALUES(?,?,?)',(entry['hand']['id'],json.dumps(entry['hand'],separators=(',',':')),time.time()))
    return len(entries)


def catalogue():
    with database() as c:rows=c.execute('SELECT id FROM full_hands ORDER BY created DESC LIMIT 1000').fetchall()
    return dict(items=[dict(id=r[0]) for r in rows],count=len(rows))


def get(ident):
    with database() as c:row=c.execute('SELECT public FROM full_hands WHERE id=?',(ident,)).fetchone()
    return json.loads(row[0]) if row else None
