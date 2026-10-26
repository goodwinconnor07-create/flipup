import numpy as np
import torch
from torch import nn

class EVModel(nn.Module):
    def __init__(self,input_dim,width=128):
        super().__init__()
        self.register_buffer('mean',torch.zeros(input_dim))
        self.register_buffer('scale',torch.ones(input_dim))
        self.body=nn.Sequential(nn.Linear(input_dim,width),nn.SiLU(),nn.Linear(width,width),nn.SiLU(),nn.Linear(width,width),nn.SiLU())
        self.ev=nn.Linear(width,8); self.strategy=nn.Linear(width,8)

    def forward(self,x,mask):
        z=self.body((x-self.mean)/self.scale)
        ev=self.ev(z)*mask
        logits=self.strategy(z).masked_fill(~mask.bool(),-1e9)
        return ev,torch.softmax(logits,dim=-1)

def predict(model,d):
    model.eval(); ev=[]; strategy=[]
    with torch.inference_mode():
        for i in range(0,len(d['x']),8192):
            e,s=model(torch.as_tensor(d['x'][i:i+8192],dtype=torch.float32),torch.as_tensor(d['mask'][i:i+8192],dtype=torch.float32))
            ev.append(e.numpy()*d['pot'][i:i+8192,None]); strategy.append(s.numpy())
    return np.concatenate(ev),np.concatenate(strategy)
