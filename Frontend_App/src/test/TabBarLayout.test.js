import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import useTabBarLayout from '../navigation/useTabBarLayout';

function Probe() {
  const layout = useTabBarLayout();
  return <Text testID="layout">{JSON.stringify(layout)}</Text>;
}
function tree(insets) {
  return <SafeAreaInsetsContext.Provider value={insets}><Probe /></SafeAreaInsetsContext.Provider>;
}
function layout(view) {
  return JSON.parse(view.getByTestId('layout').props.children);
}

test('keeps the interactive row above a home indicator', () => {
  const view = render(tree({ top: 47, bottom: 34, left: 0, right: 0 }));
  const result = layout(view);
  expect(result.paddingBottom).toBeGreaterThanOrEqual(34);
  expect(result.height - result.paddingBottom - result.paddingTop).toBeGreaterThanOrEqual(44);
});

test('retains touch target space with no bottom inset', () => {
  const view = render(tree({ top: 0, bottom: 0, left: 0, right: 0 }));
  const result = layout(view);
  expect(result.paddingBottom).toBeGreaterThanOrEqual(10);
  expect(result.height - result.paddingBottom - result.paddingTop).toBeGreaterThanOrEqual(44);
});

test('recalculates layout when system insets change', () => {
  const view = render(tree({ top: 47, bottom: 34, left: 0, right: 0 }));
  view.rerender(tree({ top: 0, bottom: 21, left: 44, right: 44 }));
  const result = layout(view);
  expect(result.paddingBottom).toBeGreaterThanOrEqual(21);
  expect(result.paddingLeft).toBeGreaterThanOrEqual(44);
  expect(result.paddingRight).toBeGreaterThanOrEqual(44);
});
