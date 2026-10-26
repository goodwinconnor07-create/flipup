"""LAPTOP numerical/API regression. Do not run in the assistant workspace."""
from flipup_gto.solver import PostflopSolver,BetSizing,StreetSizing
from flipup_gto.cards import card_str

def test_current_street_wagers_reset_but_total_contributions_remain():
    sizes=BetSizing(oop={'flop':StreetSizing('50%',''),'turn':StreetSizing('',''),'river':StreetSizing('','')},
                    ip={'flop':StreetSizing('50%',''),'turn':StreetSizing('',''),'river':StreetSizing('','')},
                    max_raises=0,add_allin_threshold=0,force_allin_threshold=0,merge_threshold=0)
    s=PostflopSolver('2c3d4h',4,10,'AsAh','KsKh',sizing=sizes,max_nodes=30000)
    path=[];q=s.engine.query(path,False,False)
    idx=next(i for i,a in enumerate(q['actions']) if a['type']=='bet');path.append(str(idx))
    q=s.engine.query(path,False,False)
    path.append(str(next(i for i,a in enumerate(q['actions']) if a['type']=='call')))
    q=s.engine.query(path,False,False)
    assert q['type']=='chance'
    path.append(card_str(next(c for c in q['deal_cards'] if card_str(c) not in ('As','Ah','Ks','Kh'))))
    q=s.engine.query(path,False,False)
    assert list(q['contrib'])==[2,2]
    assert list(q['wager'])==[0,0]
    assert q['pot']==8
