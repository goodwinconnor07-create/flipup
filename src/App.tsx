import { useEffect, useMemo, useState } from 'react';
import { useApp } from './state/store';
import { Toasts } from './ui/components';
import { Home } from './screens/Home';
import { Profile } from './screens/Profile';
import { Setup } from './screens/Setup';
import { Join, JoinTable } from './screens/Join';
import { Table } from './screens/Table';
import { SheetHost } from './screens/sheets/SheetHost';
import { Train } from './screens/train/Train';
import { Lesson } from './screens/train/Lesson';
import { Replay } from './screens/train/Replay';
import { SolvedHands } from './screens/train/SolvedHands';
import { Drill } from './screens/train/Drill';
import { Custom } from './screens/train/Custom';
import { FullScrollHand } from './screens/train/FullScrollHand';
import { ScrollScenarios } from './screens/train/ScrollScenarios';
import { TwinReport } from './screens/train/TwinReport';
import { Friends } from './screens/train/Friends';
import { Scout } from './screens/train/Scout';
import { Progress } from './screens/train/Progress';
import { Legend } from './screens/train/Legend';
import { canTransition, transition } from './ui/viewTransition';

export function App() {
  const top = useApp((s) => s.stack[s.stack.length - 1]);
  const depth = useApp((s) => s.stack.length);
  const sheet = useApp((s) => s.sheet);
  const sheetKey = useApp((s) => s.sheetKey);

  // A change of screen cross-fades (and the shared names in global.css glide): the old screen stays for a frame
  // while the browser takes its picture, then the new one is swapped in. The store has already moved on, so
  // nothing that reads it waits. The table is left out: it's busy, and it changes with the game, not with a tap.
  const current = useMemo(() => ({ route: top, depth }), [top, depth]);
  const [shown, setShown] = useState(current);
  const smooth = canTransition() && top.name !== 'table' && shown.route.name !== 'table';
  useEffect(() => {
    if (shown === current) return;
    if (smooth) transition(() => setShown(current));
    else setShown(current);
  }, [current]);
  const view = smooth ? shown : current;

  const { route } = view;
  let screen;
  switch (route.name) {
    case 'home':
      screen = <Home />;
      break;
    case 'profile':
      screen = <Profile then={route.then} info={route.info} />;
      break;
    case 'setup':
      screen = <Setup mode={route.mode} />;
      break;
    case 'join':
      screen = <Join code={route.code} />;
      break;
    case 'joinTable':
      screen = <JoinTable info={route.info} />;
      break;
    case 'table':
      screen = <Table />;
      break;
    case 'train':
      screen = <Train section={route.section} />;
      break;
    case 'lesson':
      screen = <Lesson handKey={route.key} />;
      break;
    case 'replay':
      screen = <Replay key={route.key} handKey={route.key} />;
      break;
    case 'drill':
      screen = <Drill key={route.scenario} scenario={route.scenario} />;
      break;
    case 'custom':
      screen = <Custom />;
      break;
    case 'scroll':
      screen = route.hand?.startsWith('h-') || route.hand === 'full' ? <FullScrollHand handId={route.hand === 'full' ? undefined : route.hand} /> : !route.hand || route.hand.startsWith('s-')
        ? <ScrollScenarios key={route.hand ?? 'feed'} handId={route.hand} />
        : <SolvedHands key={route.hand} handId={route.hand} />;
      break;
    case 'twinReport':
      screen = <TwinReport friend={route.friend} />;
      break;
    case 'friends':
      screen = <Friends />;
      break;
    case 'scout':
      screen = <Scout key={route.code} code={route.code} />;
      break;
    case 'legend':
      screen = <Legend key={route.id} id={route.id} />;
      break;
    case 'progress':
      screen = <Progress />;
      break;
  }

  return (
    <>
      <div key={`${view.depth}-${route.name}`}>{screen}</div>
      {sheet && <SheetHost key={sheetKey} sheet={sheet} />}
      <Toasts />
    </>
  );
}
