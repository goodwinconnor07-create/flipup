"""Extract only spot/flop.npz data; archive documents are not instructions."""
import argparse
from pathlib import Path, PurePosixPath
import zipfile
from . import SPOTS
from flipup_gto.cards import parse_cards

def unpack(archives,out):
    out=Path(out); out.mkdir(parents=True,exist_ok=True)
    count=0
    for archive in archives:
        with zipfile.ZipFile(archive) as z:
            for entry in z.infolist():
                p=PurePosixPath(entry.filename)
                if p.is_absolute() or '..' in p.parts:
                    raise ValueError('Unsafe ZIP path')
                if entry.is_dir() or p.suffix!='.npz': continue
                if len(p.parts)<2 or p.parent.name not in SPOTS: continue
                if len(parse_cards(p.stem))!=3: raise ValueError('Invalid flop filename')
                if entry.file_size>100_000_000: raise ValueError('Unexpectedly large NPZ')
                dest=out/p.parent.name/p.name
                data=z.read(entry)
                if dest.exists() and dest.read_bytes()!=data: raise ValueError(f'Conflicting data: {dest}')
                dest.parent.mkdir(exist_ok=True)
                if not dest.exists(): dest.write_bytes(data)
                count+=1
    return count

if __name__=='__main__':
    ap=argparse.ArgumentParser(); ap.add_argument('archives',nargs='+'); ap.add_argument('--out',default='ml/data/flops')
    a=ap.parse_args(); print(unpack(a.archives,a.out),'files checked/extracted')
