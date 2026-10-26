"""WSL configuration text only; never touches Windows or runs a solver."""
from pathlib import Path
import sys
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from configure_scroll_wsl import updated_config


def test_new_file_and_repeat():
    result=updated_config('')
    assert 'memory=5GB' in result and 'swap=4GB' in result
    assert updated_config(result)==result


def test_other_settings_and_sections_survive():
    result=updated_config('[wsl2]\nmemory=4GB\nprocessors=8\n[experimental]\nautoMemoryReclaim=gradual\n')
    assert 'memory=4GB' not in result and 'memory=5GB' in result
    assert result.index('swap=4GB')<result.index('[experimental]')
    assert 'processors=8' in result and 'autoMemoryReclaim=gradual' in result


def test_duplicate_sections_rejected():
    with pytest.raises(ValueError):updated_config('[wsl2]\n[wsl2]\n')
