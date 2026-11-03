import { ScrollView, type ScrollViewProps } from 'react-native';

/**
 * The scroll view every sheet uses. iOS 26 draws a sheet's title bar see-through with a blur along its edge; a scroll
 * view that doesn't ask for automatic insets starts underneath it, so its first row sits in the blur. This one
 * always asks, so content starts under the title and only blurs once it's scrolled up there.
 */
export function SheetScroll(props: ScrollViewProps) {
  return <ScrollView contentInsetAdjustmentBehavior="automatic" {...props} />;
}
