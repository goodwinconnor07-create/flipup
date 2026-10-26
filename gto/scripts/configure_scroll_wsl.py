#!/usr/bin/env python3
"""Run in Ubuntu/WSL: back up and update the Windows user's WSL2 memory settings."""
import argparse
from datetime import datetime
from pathlib import Path
import re
import shutil
import subprocess


def updated_config(original):
    lines=original.splitlines();section=None;found=False;seen=set();result=[]
    settings={'memory':'5GB','swap':'4GB'}
    def missing():return [f'{k}={v}' for k,v in settings.items() if k not in seen]
    for line in lines:
        match=re.match(r'^\s*\[([^]]+)\]',line)
        if match:
            if section=='wsl2':result.extend(missing())
            section=match[1].strip().lower()
            if section=='wsl2':
                if found:raise ValueError('Duplicate [wsl2] sections; review configuration manually')
                found=True
        key=re.match(r'^\s*(memory|swap)\s*=',line,re.I) if section=='wsl2' else None
        if key:
            name=key[1].lower()
            if name not in seen:result.append(f'{name}={settings[name]}');seen.add(name)
        else:result.append(line)
    if not found:result.extend(['','[wsl2]'])
    if section=='wsl2' or not found:result.extend(missing())
    return '\r\n'.join(result)+'\r\n'


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--apply',action='store_true');a=p.parse_args()
    profile=subprocess.check_output(['powershell.exe','-NoProfile','-Command','[Environment]::GetFolderPath("UserProfile")'],text=True).strip()
    base=Path(subprocess.check_output(['wslpath','-u',profile],text=True).strip())
    path=base/'.wslconfig'
    raw=path.read_bytes() if path.exists() else b''
    encoding='utf-16' if raw.startswith((b'\xff\xfe',b'\xfe\xff')) else 'utf-8-sig'
    result=updated_config(raw.decode(encoding))
    print('Target:',path)
    print('WSL2 maximum RAM: 5 GB; swap: 4 GB. Other settings preserved.')
    if not a.apply:
        print('Preview only. Add --apply to save.');return
    if path.exists():
        backup=path.with_name('.wslconfig.flipup-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.bak')
        shutil.copy2(path,backup);print('Backup:',backup)
    temporary=path.with_name('.wslconfig.flipup.tmp')
    temporary.write_bytes(result.encode('utf-8'));temporary.replace(path)
    print('Saved. Close work in ALL WSL distributions, then run wsl --shutdown from Windows PowerShell and reopen Ubuntu.')
    print('This does not start generation or disable Windows sleep.')


if __name__=='__main__':main()
