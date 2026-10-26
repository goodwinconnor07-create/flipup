import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))

import json
import numpy as np
import pytest
import torch
from flipup_ml import SPOTS
from flipup_ml.model import EVModel
from flipup_gto.cards import parse_combo

@pytest.fixture
def fake_entry(tmp_path):
    directory=tmp_path/'btn_bb'; directory.mkdir()
    file=directory/'Kh7d2c.npz'
    combos=np.array([parse_combo(s) for s in ['AsAh','AdKd','3s4s']],np.int16)
    action=lambda t,a=0.:{'type':t,'amount':a,'all_in':False}
    meta={'pot':5.5,'stack':97.5,'iterations':100,'exploitability_pct':.1,'nodes':{'':{'player':0,'pot':5.5,'labels':['Check'],'actions':[action('check')]},'0':{'player':1,'pot':5.5,'labels':['Check','Bet 33%','Bet 75%','Bet 125%'],'actions':[action('check'),action('bet',1.815),action('bet',4.125),action('bet',6.875)]},'0.1':{'player':0,'pot':7.315,'labels':['Fold','Call'],'actions':[action('fold'),action('call',1.815)]}}}
    arrays={'combos0':combos,'combos1':combos,'meta':json.dumps(meta)}
    for key,n in meta['nodes'].items():
        arrays['s:'+key]=np.full((len(n['actions']),3),1/len(n['actions']),np.float16)
        arrays['e:'+key]=np.ones((len(n['actions']),3),np.float16)
        arrays['r:'+key]=np.ones(3,np.float16)
    np.savez_compressed(file,**arrays)
    return file

@pytest.fixture
def predictor(fake_entry,tmp_path):
    from flipup_ml.data import read_entry,domain
    from flipup_ml.features import feature_rows
    from flipup_ml.infer import Predictor
    entry=read_entry(fake_entry)
    x,_,_,_=feature_rows('btn_bb',entry.board,entry.meta,'',entry.arrays['combos0'],entry.roots,equity_samples=32)
    model=EVModel(x.shape[1])
    checkpoint=tmp_path/'model.pt'
    torch.save({'domain':domain([entry]),'state_dict':model.state_dict(),'input_dim':x.shape[1],'equity_samples':32,'synthetic':True},checkpoint)
    return Predictor(checkpoint)
