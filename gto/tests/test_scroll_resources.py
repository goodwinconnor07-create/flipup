"""Resource planning only; no numerical solver runs."""
from pathlib import Path
import sys
import pytest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from scroll_resources import choose


def test_all_available_cpus_with_memory_headroom():
    threads,memory=choose(12,12000,16000)
    assert threads==12 and memory==9000


def test_cgroup_limits_are_respected():
    threads,memory=choose(16,12000,16000,quota=4,remaining_mb=2000)
    assert threads==4 and memory==976


def test_insufficient_ram_blocks_launch():
    with pytest.raises(ValueError):choose(8,100,16000)
