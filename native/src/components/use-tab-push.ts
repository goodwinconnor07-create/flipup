import { router, useNavigationContainerRef } from 'expo-router';

/**
 * A push from a tab's screen that can't land in the wrong place. Swiping a sheet away (the Join sheet) and tapping
 * a button on Home before the sheet's exit has reached the app left the sheet in the root stack's state; a push
 * then worked from the sheet, opened a second Play tab with Settings as its only screen, and Settings had no back
 * button. Anything still above the tabs in the root stack is cleared first (the screen is already gone), so the
 * push lands in the tab's own stack.
 */
export function useTabPush() {
  const ref = useNavigationContainerRef();
  return (path: string) => {
    const root = ref.isReady() ? ref.getRootState() : undefined;
    if (root?.type === 'stack') {
      const tabs = root.routes.findIndex((r) => r.name === '(tabs)');
      const above = root.index - tabs;
      if (tabs >= 0 && above > 0) ref.dispatch({ type: 'POP', payload: { count: above }, target: root.key });
    }
    router.push(path as never);
  };
}
