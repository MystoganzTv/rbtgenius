import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const mobileRequire = createRequire(new URL('../../mobile/package.json', import.meta.url));
export const React = mobileRequire('react');
export const { act, create } = mobileRequire('react-test-renderer');
const { transformSync } = mobileRequire('@babel/core');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Render the real screens with native services replaced at the module boundary.
// These checks exercise handlers and effects; simulator checks cover native layout.
export function screen(path, overrides = {}) {
  const native = {
    RefreshControl: 'RefreshControl', View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView',
    FlatList: 'FlatList', ActivityIndicator: 'ActivityIndicator',
    StyleSheet: { create: value => value },
    useColorScheme: () => 'light', useWindowDimensions: () => ({ width: 1024, height: 1366 }),
    Animated: {
      View: 'AnimatedView', Value: class { constructor(value) { this.value = value; } },
      timing: () => ({}), parallel: () => ({ start() {} }),
    },
    Alert: { alert() {} }, Linking: { openURL: async () => {} },
  };
  const modules = {
    react: React, 'react/jsx-runtime': mobileRequire('react/jsx-runtime'),
    'react-native': native,
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    'expo-haptics': {
      impactAsync: async () => {}, notificationAsync: async () => {},
      ImpactFeedbackStyle: {}, NotificationFeedbackType: {},
    },
    '@react-native-async-storage/async-storage': { setItem: async () => {} },
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    '../../theme': { alpha: value => value, getTheme: () => ({}) },
    '../../context/AuthContext': { useAuth: () => ({ user: {}, token: null }) },
    '@react-navigation/native': { CommonActions: { reset: value => value } },
    '../../lib/webBilling': { WEB_BILLING_ENABLED: false },
    '../../lib/legalContentEs': { LEGAL_CONTENT_ES: { privacy: { sections: [] }, refund: {}, terms: {} } },
    ...overrides,
  };
  const filename = new URL(`../../mobile/src/${path}`, import.meta.url);
  const { code } = transformSync(readFileSync(filename, 'utf8'), {
    babelrc: false, configFile: false,
    plugins: [
      ...(path.endsWith('.tsx') ? [[mobileRequire.resolve('@babel/plugin-transform-typescript'), { isTSX: true }]] : []),
      [mobileRequire.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
      mobileRequire.resolve('@babel/plugin-transform-modules-commonjs'),
    ],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (!(id in modules)) throw new Error(`Unmocked module: ${id}`);
    return modules[id];
  }, module, module.exports);
  return { Component: module.exports.default, exports: module.exports, native };
}

export function button(renderer, label) {
  return renderer.root.findAllByType('Pressable').find(node =>
    node.findAllByType('Text').some(text => text.props.children === label));
}

