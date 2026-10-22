"""Train a value network on solved spots (scripts/value_net_river.py output).

The network: features -> 3 hidden layers -> each player's value per strength bucket, followed by
DeepStack's zero-sum correction (both players' range-weighted values must add up to the pot). Weights
are saved as plain arrays (flipup_gto.valuenet loads them; no torch needed to use the network).

    python3 scripts/train_value_net.py data/valuenet/river_*.npz --out flipup_gto/data/valuenet/river.npz
"""
from __future__ import annotations

import argparse
import glob

import numpy as np
import torch
import torch.nn as nn


class Net(nn.Module):
    def __init__(self, k: int, hidden: int = 256, layers: int = 3):
        super().__init__()
        self.k = k
        mods, d = [], 2 * k + 1
        for _ in range(layers):
            mods += [nn.Linear(d, hidden), nn.PReLU()]
            d = hidden
        mods.append(nn.Linear(d, 2 * k))
        self.body = nn.Sequential(*mods)

    def forward(self, x):
        k = self.k
        v = self.body(x).view(-1, 2, k)
        m = torch.stack([x[:, :k], x[:, k:2 * k]], 1)
        err = ((m * v).sum((1, 2)) - 1.0) / 2.0   # range-weighted values must sum to the pot (=1)
        return v - err[:, None, None]


def load(paths):
    xs, ys = [], []
    for p in paths:
        d = np.load(p)
        xs.append(d["x"]); ys.append(d["y"])
    return np.concatenate(xs), np.concatenate(ys)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--epochs", type=int, default=300)
    ap.add_argument("--hidden", type=int, default=256)
    ap.add_argument("--holdout", type=float, default=0.1)
    args = ap.parse_args()
    paths = sorted({q for p in args.data for q in glob.glob(p)})
    X, Y = load(paths)
    k = Y.shape[2]
    n = len(X); rng = np.random.default_rng(0); idx = rng.permutation(n)
    nv = max(1, int(n * args.holdout)); va, tr = idx[:nv], idx[nv:]
    Xt, Yt = torch.tensor(X[tr]), torch.tensor(Y[tr]); Xv, Yv = torch.tensor(X[va]), torch.tensor(Y[va])
    print(f"{n} samples from {len(paths)} files; train {len(tr)}, held out {nv}", flush=True)
    net = Net(k, args.hidden)
    opt = torch.optim.Adam(net.parameters(), lr=1e-3)
    sched = torch.optim.lr_scheduler.CosineAnnealingLR(opt, args.epochs)
    loss_fn = nn.HuberLoss(delta=0.5)
    best = (1e9, None)

    def held_out():
        net.eval()
        with torch.no_grad():
            pv = net(Xv)
            m = torch.stack([Xv[:, :k], Xv[:, k:2 * k]], 1)
            mae_all = (pv - Yv).abs().mean().item()
            mae_w = ((pv - Yv).abs() * m).sum().item() / m.sum().item()  # weighted by range mass
        net.train()
        return mae_all, mae_w

    for ep in range(args.epochs):
        perm = torch.randperm(len(Xt))
        for i in range(0, len(Xt), 256):
            b = perm[i:i + 256]
            opt.zero_grad()
            loss = loss_fn(net(Xt[b]), Yt[b])
            loss.backward()
            opt.step()
        sched.step()
        if (ep + 1) % 20 == 0 or ep + 1 == args.epochs:
            mae_all, mae_w = held_out()
            print(f"epoch {ep + 1}: held-out error {mae_all:.4f} pot (all buckets), {mae_w:.4f} (range-weighted)", flush=True)
            if mae_w < best[0]:
                best = (mae_w, {k_: v.detach().numpy().copy() for k_, v in net.state_dict().items()})
    # Baseline: a hand's value = the average bucket value over the training set (ignores the ranges).
    base = np.abs(Y[va] - Y[tr].mean(0)).mean()
    print(f"baseline (ignore ranges): {base:.4f} pot; best network {best[0]:.4f} (range-weighted)")
    arrays = {f"w{i}": v for i, v in enumerate(best[1].values())}
    np.savez(args.out, k=k, names=np.asarray(list(best[1].keys())), **arrays)
    print("saved", args.out)


if __name__ == "__main__":
    main()
