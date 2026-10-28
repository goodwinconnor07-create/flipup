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
import { PartyScreen } from './screens/Party';
import { PartySetup } from './screens/PartySetup';

export function App() {
  const route = useApp((s) => s.stack[s.stack.length - 1]);
  const depth = useApp((s) => s.stack.length);
  const sheet = useApp((s) => s.sheet);
  const sheetKey = useApp((s) => s.sheetKey);

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
    case 'partySetup':
      screen = <PartySetup />;
      break;
    case 'party':
      screen = <PartyScreen />;
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
      <div key={`${depth}-${route.name}`}>{screen}</div>
      {sheet && <SheetHost key={sheetKey} sheet={sheet} />}
      <Toasts />
    </>
  );
}
