"""Select varied reached decision paths from an already computed tree. Does not solve."""
from collections import deque
import numpy as np


def reached_paths(query,weights,max_contexts=16,max_depth=6):
    pending=deque([[]]);selected=[]
    while pending and len(selected)<max_contexts:
        path=pending.popleft();q=query(path)
        if q['type']!='action':continue
        mass=np.asarray(weights(q),dtype=float)
        if mass.sum()<=0:continue
        mass=mass/mass.sum()
        selected.append(path)
        if len(path)>=max_depth:continue
        frequencies=np.asarray(q['strategy'])@mass
        for i in sorted(range(len(frequencies)),key=lambda a:-frequencies[a]):
            if q['actions'][i]['type']!='fold' and frequencies[i]>.01:
                pending.append(path+[i])
    return selected
