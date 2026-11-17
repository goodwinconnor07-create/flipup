import { Text, View } from 'react-native';

/** A bot's face in a filled circle, as it sits in the lobby. */
export function Face({ emoji, size }: { emoji: string; size: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.26)' }}>
      <Text maxFontSizeMultiplier={1} style={{ fontSize: size * 0.54 }}>
        {emoji}
      </Text>
    </View>
  );
}
