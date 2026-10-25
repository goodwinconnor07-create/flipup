import { useEffect, useState } from 'react';
import { BackBar } from '../../ui/components';
import { apiUrl } from '../../state/platform';
import { ScrollScenarios } from './ScrollScenarios';

import type { FullHand } from '../../quiz/fullHands';
import { loadBank, saveToBank } from '../../quiz/save';
export function FullScrollHand({ handId }: { handId?: string }) {
  const [hand,setHand]=useState<FullHand|null>(null);
  const [index,setIndex]=useState(0);
  const [error,setError]=useState('');
  const load=async () => {
    setError('');setHand(null);setIndex(0);
    try {
      let id=handId;
      if (!id) {
        const response=await fetch(apiUrl('/api/gto/scroll/hands/catalogue'));
        if (!response.ok) throw new Error('Could not load full hands.');
        const cat=await response.json() as {items:{id:string}[]};
        if (!cat.items.length) throw new Error('Full hands are awaiting laptop generation and validation.');
        id=cat.items[Math.floor(Math.random()*cat.items.length)].id;
      }
      const saved=loadBank().find(h=>h.id===id)?.snapshot;
      if (saved && 'schema' in saved && saved.schema===3 && saved.publicationApproved) {setHand(saved);return;}
      const response=await fetch(apiUrl(`/api/gto/scroll/hands/${id}`));
      if (!response.ok) throw new Error('Could not download this hand.');
      const data=await response.json() as FullHand;
      if (data.schema!==3 || !data.publicationApproved || !data.decisions.length) throw new Error('This hand has not passed publication checks.');
      setHand(data);
    } catch(e) {setError(e instanceof Error?e.message:'Could not load full hand.');}
  };
  useEffect(()=>{void load();},[handId]);
  if (!hand || index>=hand.decisions.length) return <div className="screen train">
    <BackBar title="Full Scroll hand" />
    <div className="screen-body"><p>{error || (hand ? 'Hand complete. Each answer was compared with its saved solution.' : 'Loading a validated full hand…')}</p>
      <button className="btn btn-blue" onClick={()=>void load()}>{hand?'Another hand':'Check for hands'}</button></div>
  </div>;
  const save=()=>{
    try {
      const first=hand.decisions[0].scenario;
      saveToBank({id:hand.id,at:Date.now(),title:'Full Scroll hand',cards:first.cards,picks:[],grades:[],snapshot:hand},'Full Scroll hand');
      setError('Full hand saved to your study bank.');
    } catch(e) {setError(e instanceof Error?e.message:'Could not save this hand.');}
  };
  return <>
    <div className="glass-card"><p>Decision {index+1} of {hand.decisions.length}. After your answer, the replay follows the saved solver line.</p>
      <button type="button" className="btn btn-outline" onClick={save}>Save full hand</button>
      {error && <p role="status">{error}</p>}
      <details><summary>Preflop history and assumptions</summary>
        <p>{hand.preflop.map(a=>`Seat ${a.player+1}: ${a.type}${a.to?' to '+a.to+'bb':''}`).join(' → ')}</p>
        <p>{hand.assumptions}</p></details></div>
    <ScrollScenarios key={`${hand.id}-${index}`} provided={hand.decisions[index].scenario} onNext={()=>{setError('');setIndex(index+1);}} />
  </>;
}
