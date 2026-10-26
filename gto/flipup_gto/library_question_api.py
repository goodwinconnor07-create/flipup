"""Versioned library question delivery; private candidates never enter the public bank."""
import json
import re
import math
from fastapi import APIRouter,Request,HTTPException
from . import scroll_store as store
from .scroll_api import body
from .flop_admin import _check
from .scroll_release import publication_enabled

router=APIRouter()


def db():
    connection=store.db()
    connection.execute('CREATE TABLE IF NOT EXISTS library_questions(id TEXT PRIMARY KEY,public TEXT NOT NULL)')
    return connection


def publish(items):
    if not publication_enabled():raise ValueError('publication is disabled')
    if not isinstance(items,list) or not 1<=len(items)<=100:raise ValueError('upload 1–100 reviewed questions')
    for q in items:
        if q.get('schema')!='library-question-v1' or q.get('publicationApproved') is not True:raise ValueError('reviewed library questions required')
        if not re.fullmatch(r'lq-[a-f0-9]{24}',q['id']) or not re.fullmatch(r'[a-f0-9]{64}',q['source']['sha256']):raise ValueError('invalid source identity')
        if q['source'].get('model')!='existing flop-library betting abstraction; future-street simplifications retained':raise ValueError('source model must be disclosed')
        if len(q['board'])!=3 or q['players']!=2 or len(q['options'])<2:raise ValueError('unsupported library question')
        probabilities=[o['freq'] for o in q['options']]
        if any(not isinstance(v,(float,int)) or not math.isfinite(v) or not 0<=v<=1 for v in probabilities) or abs(sum(probabilities)-1)>.0001:raise ValueError('invalid policy')
        if any(not isinstance(o['ev'],(int,float)) or not math.isfinite(o['ev']) for o in q['options']):raise ValueError('finite solved EVs required')
        json.dumps(q,allow_nan=False)
    with db() as c:
        for q in items:
            encoded=json.dumps(q,sort_keys=True)
            previous=c.execute('SELECT public FROM library_questions WHERE id=?',(q['id'],)).fetchone()
            if previous and previous[0]!=encoded:raise ValueError('question IDs are immutable')
            if c.execute('SELECT count(*) FROM library_questions').fetchone()[0]>=20000 and not previous:raise ValueError('question bank capacity reached')
            c.execute('INSERT OR IGNORE INTO library_questions VALUES(?,?)',(q['id'],encoded))
    return len(items)


@router.post('/admin/scroll/library/publish')
async def upload(request:Request):
    _check(request);payload=await body(request)
    try:return dict(published=publish(payload['items']))
    except (KeyError,ValueError,TypeError) as exc:raise HTTPException(400,str(exc))


@router.get('/scroll/library/catalogue')
def catalogue():
    with db() as c:rows=c.execute('SELECT id FROM library_questions ORDER BY id LIMIT 20000').fetchall()
    return dict(items=[dict(id=row[0]) for row in rows],count=len(rows),schema='library-question-v1')


@router.get('/scroll/library/questions/{ident}')
def get(ident:str):
    with db() as c:row=c.execute('SELECT public FROM library_questions WHERE id=?',(ident,)).fetchone()
    if row is None:raise HTTPException(404,'question not found')
    return json.loads(row[0])
