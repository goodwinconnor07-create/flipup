"""Plan validated laptop work without executing any numerical solving."""
def choose_work(jobs, validation, role, cycle):
    coverage={tuple(c) for c in validation.get('coverage',[])}
    work=set()
    for spec in jobs['spots']:
        players=spec['players'];street={3:'flop',4:'turn',5:'river'}[len(spec['board'])]
        if street not in ('turn','river') or (role=='slow' and players!=2):continue
        if (players,street) in coverage:work.add((players,street))
    work=sorted(work,key=lambda x:(x[0],x[1]!='river'))
    if not work:raise ValueError('no available input profiles have passing validation for this role')
    return work[cycle%len(work)]
