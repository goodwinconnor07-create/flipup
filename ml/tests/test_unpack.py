import zipfile
import pytest
from flipup_ml.unpack import unpack

def test_archive_data_only_and_no_overwrite(tmp_path):
    z=tmp_path/'a.zip'; out=tmp_path/'data'
    with zipfile.ZipFile(z,'w') as f:
        f.writestr('flops/btn_bb/Kh7d2c.npz',b'data')
        f.writestr('RUN_ME.sh',b'exit 1')
    assert unpack([z],out)==1
    assert unpack([z],out)==1
    assert not (out/'RUN_ME.sh').exists()
    with zipfile.ZipFile(z,'w') as f: f.writestr('btn_bb/Kh7d2c.npz',b'changed')
    with pytest.raises(ValueError,match='Conflicting'): unpack([z],out)

def test_archive_path_traversal_rejected(tmp_path):
    z=tmp_path/'a.zip'
    with zipfile.ZipFile(z,'w') as f: f.writestr('../btn_bb/Kh7d2c.npz',b'data')
    with pytest.raises(ValueError,match='Unsafe'): unpack([z],tmp_path/'data')
