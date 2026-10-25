#!/usr/bin/env python3
"""Select CPU threads and a RAM budget from Ubuntu/WSL and cgroup limits."""
import os
from pathlib import Path


def text(path):
    try:return Path(path).read_text().strip()
    except OSError:return ''


def choose(cpus,available_mb,total_mb,quota=None,remaining_mb=None):
    threads=max(1,min(cpus,quota)) if quota else max(1,cpus)
    available=min(available_mb,remaining_mb) if remaining_mb is not None else available_mb
    # Leave space for Python, tree construction, Ubuntu and other applications.
    memory=int(min(available*.75,max(0,available-min(1024,total_mb*.2))))
    if memory<256:raise ValueError('Less than 256 MiB available for the solver; close applications or increase WSL memory')
    return threads,memory


def detect():
    cpus=len(os.sched_getaffinity(0)) if hasattr(os,'sched_getaffinity') else os.cpu_count() or 1
    mem={line.split(':')[0]:int(line.split()[1])/1024 for line in text('/proc/meminfo').splitlines() if line.startswith(('MemTotal:','MemAvailable:'))}
    if not mem:raise ValueError('Cannot read Ubuntu memory availability')
    quota=None;cpu=text('/sys/fs/cgroup/cpu.max').split()
    if len(cpu)==2 and cpu[0]!='max':quota=max(1,int(cpu[0])//int(cpu[1]))
    maximum=text('/sys/fs/cgroup/memory.max');current=text('/sys/fs/cgroup/memory.current')
    remaining=(int(maximum)-int(current))/1024**2 if maximum.isdigit() and current.isdigit() else None
    return choose(cpus,mem['MemAvailable'],mem['MemTotal'],quota,remaining)


if __name__=='__main__':
    threads,memory=detect()
    threads=int(os.environ.get('FU_NET_THREADS') or threads)
    memory=int(os.environ.get('FU_NET_MEMORY_MB') or memory)
    if threads<1 or memory<256:raise SystemExit('Invalid explicit CPU/memory override')
    print(threads,memory)
