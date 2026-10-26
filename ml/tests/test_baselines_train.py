import numpy as np
from flipup_ml.data import read_entry,build_dataset
from flipup_ml.baselines import Chart,Equity
from flipup_ml.train import fit,Budget
from flipup_ml.model import predict

def test_models_execute_and_mask(fake_entry,tmp_path):
    d=build_dataset([read_entry(fake_entry)],tmp_path/'cache',32)
    models=[Chart().fit(d),Equity().fit(d)]
    for model in models:
        ev,s=model.predict(d)
        assert np.isfinite(ev).all() and np.isfinite(s).all()
        assert np.all(s[d['mask']==0]==0)
        assert np.allclose(s.sum(1),1)
    model,record=fit(d,d,Budget(20),epochs=2)
    ev,s=predict(model,d)
    assert record['epochs']==2 and np.isfinite(ev).all()
    assert np.allclose(s.sum(1),1)
