import { ActionSheetIOS, Alert, Platform, type AlertButton } from 'react-native';

/**
 * Choices that follow a tap (a seat's menu, the reasons for a report): Apple's action sheet on iPhone. An alert is
 * for news the person didn't ask for, and one with a long row of buttons scrolls. Elsewhere it stays an alert.
 * Buttons are an alert's: `style: 'cancel'` is the sheet's Cancel, `'destructive'` is drawn red.
 */
export function choose(title: string, message: string | undefined, buttons: AlertButton[]): void {
  if (Platform.OS !== 'ios') return Alert.alert(title, message, buttons);
  const cancel = buttons.findIndex((b) => b.style === 'cancel');
  const destructive = buttons.flatMap((b, i) => (b.style === 'destructive' ? [i] : []));
  ActionSheetIOS.showActionSheetWithOptions(
    {
      title,
      message,
      options: buttons.map((b) => b.text ?? ''),
      ...(cancel >= 0 ? { cancelButtonIndex: cancel } : {}),
      ...(destructive.length ? { destructiveButtonIndex: destructive } : {}),
    },
    (i) => buttons[i]?.onPress?.(),
  );
}
