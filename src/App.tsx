import { useApp } from './state/store';
import { Toasts } from './ui/components';
import { Home } from './screens/Home';
import { Profile } from './screens/Profile';
import { Setup } from './screens/Setup';
import { Join, JoinTable } from './screens/Join';
import { Table } from './screens/Table';
import { SheetHost } from './screens/sheets/SheetHost';
import { PartyScreen } from './screens/Party';
import { PartySetup } from './screens/PartySetup';
import { CashSeat } from './screens/CashSeat';
import { BotResearch } from './screens/BotResearch';
import { RangeTrainer } from './screens/RangeTrainer';
import { useEffect } from 'react';
import { Roulette } from './screens/Roulette';
import { Blackjack } from './screens/Blackjack';
import { BjInviteBanner } from './screens/sheets/BlackjackSheets';
import { watchInvites } from './state/blackjack';
import { CAMPAIGN_ON } from './game';

export function App() {
  const route = useApp((s) => s.stack[s.stack.length - 1]);
  const depth = useApp((s) => s.stack.length);
  const sheet = useApp((s) => s.sheet);
  const sheetKey = useApp((s) => s.sheetKey);
  // Friends asking you to their blackjack table (a Campaign floor game).
  useEffect(() => (CAMPAIGN_ON ? watchInvites() : undefined), []);

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
    case 'roulette':
      screen = CAMPAIGN_ON ? <Roulette /> : <Home />;
      break;
    case 'blackjack':
      screen = CAMPAIGN_ON ? <Blackjack /> : <Home />;
      break;
    case 'cashSeat':
      screen = CAMPAIGN_ON ? <CashSeat /> : <Home />;
      break;
    case 'botResearch':
      screen = <BotResearch review={route.review} />;
      break;
    case 'ranges':
      screen = <RangeTrainer />;
      break;
  }

  return (
    <>
      <div key={`${depth}-${route.name}`}>{screen}</div>
      {sheet && <SheetHost key={sheetKey} sheet={sheet} />}
      {CAMPAIGN_ON && <BjInviteBanner />}
      <Toasts />
    </>
  );
}
