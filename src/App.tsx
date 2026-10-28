import { useApp } from './state/store';
import { Toasts } from './ui/components';
import { Home } from './screens/Home';
import { Profile } from './screens/Profile';
import { Setup } from './screens/Setup';
import { Join, JoinTable } from './screens/Join';
import { Table } from './screens/Table';
import { SheetHost } from './screens/sheets/SheetHost';
import { Legend } from './screens/Legend';
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
      screen = <Profile then={route.then} info={route.info} variant={route.variant} />;
      break;
    case 'setup':
      screen = <Setup mode={route.mode} variant={route.variant} />;
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
    case 'partySetup':
      screen = <PartySetup />;
      break;
    case 'party':
      screen = <PartyScreen />;
      break;
    case 'legend':
      screen = <Legend key={route.id} id={route.id} />;
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
