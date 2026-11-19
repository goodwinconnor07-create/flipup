import { Host } from '@expo/ui';
import { Button, DisclosureGroup, Form, HStack, Image, Picker, Section, Spacer, Stepper, Text, Toggle, VStack } from '@expo/ui/swift-ui';
import { buttonStyle, contentShape, controlSize, fixedSize, font, frame, foregroundStyle, labelsHidden, padding, pickerStyle, scrollContentBackground, shapes, tag, tint } from '@expo/ui/swift-ui/modifiers';
import { Color } from 'expo-router';
import { Fragment } from 'react';
import { View } from 'react-native';

import { brand } from '@/theme';

import { haptic } from './haptics';
import type { MenuItem, NativeMenuProps } from './native-menu.types';

const SECONDARY = foregroundStyle({ type: 'hierarchical', style: 'secondary' });
const TERTIARY = foregroundStyle({ type: 'hierarchical', style: 'tertiary' });
const PRIMARY = foregroundStyle({ type: 'hierarchical', style: 'primary' });
const DESTRUCTIVE = '#ff453a';
const sf = (name: string | undefined) => name as never;

/**
 * The settings list, drawn by SwiftUI itself (the owner, 16 Nov 2026: "build a native Apple style menu"): a `Form`, which
 * iOS draws as Apple's inset grouped list, with its own section headings, footers, hairlines, press highlight, scroll
 * and Dynamic Type, and the system's switch, segmented control, pop-up menu, stepper and disclosure rows.
 * The web build has no SwiftUI; `native-menu.tsx` draws the same data with React Native.
 */
export function NativeMenu({ groups, top, transparent }: NativeMenuProps) {
  // The Form's own page is hidden and painted here instead: in an iOS 26 sheet SwiftUI leaves it clear, so the table
  // or lobby behind showed through the rows as a coloured smear. Solid grouped grey unless the page asks to show through.
  return (
    <View style={{ flex: 1, backgroundColor: transparent ? undefined : Color.ios.systemGroupedBackground }}>
      {top}
      <Host style={{ flex: 1 }}>
        <Form modifiers={[tint(brand.violet), scrollContentBackground('hidden')]}>
          {groups.map((g) => {
            const items = g.items.filter((i): i is MenuItem => !!i);
            if (items.length === 0) return null;
            return (
              <Section key={g.id} title={g.header} footer={g.footer ? <Text>{g.footer}</Text> : undefined}>
                {items.map((item) => (
                  <Fragment key={item.id}>{row(item)}</Fragment>
                ))}
              </Section>
            );
          })}
        </Form>
      </Host>
    </View>
  );
}

function row(item: MenuItem) {
  switch (item.kind) {
    case 'link':
      return (
        <Button
          onPress={() => {
            haptic.tap();
            item.onPress();
          }}
          modifiers={[buttonStyle('plain')]}
        >
          <HStack spacing={8} modifiers={[contentShape(shapes.rectangle())]}>
            {item.symbol && <Image systemName={sf(item.symbol)} size={20} modifiers={[foregroundStyle(brand.violet)]} />}
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[PRIMARY]}>{item.title}</Text>
              {item.subtitle && <Text modifiers={[SECONDARY, font({ textStyle: 'footnote' })]}>{item.subtitle}</Text>}
            </VStack>
            <Spacer />
            {item.detail && <Text modifiers={item.detailTint ? [foregroundStyle(brand.violet)] : [SECONDARY]}>{item.detail}</Text>}
            {item.trailingCrown && <Image systemName="crown.fill" size={14} modifiers={[foregroundStyle(brand.gold)]} />}
            {item.chevron !== false && <Image systemName="chevron.right" size={13} modifiers={[TERTIARY, font({ weight: 'semibold' })]} />}
          </HStack>
        </Button>
      );
    case 'button': {
      // Drawn by hand, not as a Label: a Label sizes each symbol by its own shape, so the icons sat at different widths and
      // kept the tint while the text went red. One fixed icon column and one colour for the glyph and its words.
      const colour = item.destructive ? DESTRUCTIVE : brand.violet;
      return (
        <Button
          onPress={
            item.onPress && !item.busy
              ? () => {
                  haptic.tap();
                  item.onPress?.();
                }
              : undefined
          }
          modifiers={[buttonStyle('plain')]}
        >
          <HStack spacing={12} modifiers={[contentShape(shapes.rectangle())]}>
            {item.symbol && (
              <HStack modifiers={[frame({ width: 28, alignment: 'center' })]}>
                <Image systemName={sf(item.symbol)} size={20} modifiers={[foregroundStyle(colour)]} />
              </HStack>
            )}
            <Text modifiers={[foregroundStyle(colour)]}>{item.busy ? `${item.title}…` : item.title}</Text>
            <Spacer />
          </HStack>
        </Button>
      );
    }
    case 'toggle':
      return (
        <Toggle
          isOn={item.value}
          label={item.subtitle ? undefined : item.title}
          systemImage={item.symbol && !item.subtitle ? sf(item.symbol) : undefined}
          onIsOnChange={(on) => {
            haptic.select();
            item.onChange(on);
          }}
        >
          {item.subtitle ? (
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[PRIMARY]}>{item.title}</Text>
              <Text modifiers={[SECONDARY, font({ textStyle: 'footnote' })]}>{item.subtitle}</Text>
            </VStack>
          ) : undefined}
        </Toggle>
      );
    case 'segmented': {
      const picker = (
        <Picker
          label={item.title}
          selection={item.value}
          onSelectionChange={(next: string) => {
            haptic.select();
            item.onChange(next);
          }}
          modifiers={[pickerStyle('segmented'), labelsHidden(), ...(item.stacked ? [] : [fixedSize()])]}
        >
          {item.options.map((o) => (
            <Text key={o.value} modifiers={[tag(o.value)]}>
              {o.label}
            </Text>
          ))}
        </Picker>
      );
      if (item.stacked) {
        return (
          <VStack alignment="leading" spacing={10} modifiers={[padding({ vertical: 4 })]}>
            <Text modifiers={[PRIMARY]}>{item.title}</Text>
            {picker}
            {item.note && <Text modifiers={[SECONDARY, font({ textStyle: 'footnote' })]}>{item.note}</Text>}
          </VStack>
        );
      }
      return (
        <HStack spacing={12}>
          <Text modifiers={[PRIMARY]}>{item.title}</Text>
          <Spacer />
          {picker}
        </HStack>
      );
    }
    case 'picker':
      return (
        <Picker
          label={item.title}
          selection={item.value}
          onSelectionChange={(next: string) => {
            haptic.select();
            item.onChange(next);
          }}
          modifiers={[pickerStyle('menu')]}
        >
          {item.options.map((o) => (
            <Text key={o.value} modifiers={[tag(o.value)]}>
              {o.label}
            </Text>
          ))}
        </Picker>
      );
    case 'stepper':
      return (
        <HStack spacing={12}>
          <Text modifiers={[PRIMARY]}>{item.title}</Text>
          <Spacer />
          <Text modifiers={[SECONDARY]}>{item.detail}</Text>
          <Stepper
            label={item.title}
            value={item.value}
            min={item.min}
            max={item.max}
            step={1}
            onValueChange={(next) => {
              haptic.select();
              item.onChange(next);
            }}
            modifiers={[labelsHidden(), controlSize('regular')]}
          />
        </HStack>
      );
    case 'value':
      return (
        <HStack spacing={12}>
          <Text modifiers={[PRIMARY]}>{item.title}</Text>
          <Spacer />
          <Text modifiers={[SECONDARY]}>{item.detail}</Text>
        </HStack>
      );
    case 'info':
      return (
        <HStack alignment="top" spacing={14} modifiers={[padding({ vertical: 4 })]}>
          <Image systemName={sf(item.symbol)} size={22} modifiers={[foregroundStyle(brand.violet)]} />
          <VStack alignment="leading" spacing={3}>
            <Text modifiers={[font({ textStyle: 'body', weight: 'semibold' })]}>{item.title}</Text>
            <Text modifiers={[SECONDARY, font({ textStyle: 'subheadline' })]}>{item.text}</Text>
          </VStack>
        </HStack>
      );
    case 'faq':
      return (
        <DisclosureGroup label={item.title}>
          <Text modifiers={[SECONDARY]}>{item.text}</Text>
        </DisclosureGroup>
      );
  }
}
