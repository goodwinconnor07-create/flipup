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
import { Drill } from './screens/train/Drill';
import { Custom } from './screens/train/Custom';

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
      screen = <Join initialCode={route.code} />;
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
  }

  return (
    <>
      <div key={`${depth}-${route.name}`}>{screen}</div>
      {sheet && <SheetHost key={sheetKey} sheet={sheet} />}
      <Toasts />
    </>
  );
}
