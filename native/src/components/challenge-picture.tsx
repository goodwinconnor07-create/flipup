import type { SoloId } from '@design/challengeArt';
import { radius } from '@/theme';

import { IconBanner } from './game-icon';

/** A solo card's wide picture (the three challenges and Range training): its icon on its own blurred art. */
export function ChallengePicture({ id, width, height, rounded = radius.md }: { id: SoloId; width: number; height: number; rounded?: number }) {
  return <IconBanner id={id} width={width} height={height} rounded={rounded} />;
}
