import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mobileRequire = createRequire(new URL('../mobile/package.json', import.meta.url));
const React = mobileRequire('react');
const { act, create } = mobileRequire('react-test-renderer');
const { transformSync } = mobileRequire('@babel/core');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Render the real screens with native services replaced at the module boundary.
// These checks exercise handlers and effects; simulator checks cover native layout.
function screen(path, overrides = {}) {
  const native = {
    View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView',
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
  const filename = new URL(`../mobile/src/${path}`, import.meta.url);
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
  return { Component: module.exports.default, native };
}

function button(renderer, label) {
  return renderer.root.findAllByType('Pressable').find(node =>
    node.findAllByType('Text').some(text => text.props.children === label));
}

test('paywall legal links open readable in-app policies and return without opening the website', async () => {
  const destinations = [], externalUrls = [];
  const { Component, native } = screen('screens/tabs/UpgradeScreen.jsx');
  native.Linking.openURL = async url => externalUrls.push(url);
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component, {
    navigation: { navigate: (name, params) => destinations.push({ name, params }) },
  })); });

  for (const [label, type, title] of [
    ['upgrade.terms_link', 'terms', 'Terms of Service'],
    ['upgrade.privacy_link', 'privacy', 'Privacy Policy'],
  ]) {
    await act(async () => button(renderer, label).props.onPress());
    const destination = destinations.at(-1);
    assert.deepEqual(destination, { name: 'Legal', params: { type } });
    const billing = await import('../mobile/src/lib/legalBilling.ios.js');
    const { Component: Legal } = screen('screens/legal/LegalScreen.jsx', {
      '@expo/vector-icons': { Feather: 'Feather' },
      '../../lib/legalBilling': billing,
    });
    let legalRenderer, returned = false;
    await act(async () => { legalRenderer = create(React.createElement(Legal, {
      route: destination, navigation: { goBack: () => { returned = true; } },
    })); });
    const text = legalRenderer.root.findAllByType('Text').map(node => node.props.children).join(' ');
    assert.ok(text.includes(title));
    assert.ok(legalRenderer.root.findByType('ScrollView'));
    if (type === 'privacy') assert.ok(text.includes('Apple through In-App Purchase'));
    else assert.ok(text.includes('view their progress and performance analytics'));
    await act(async () => legalRenderer.root.findByType('Pressable').props.onPress());
    assert.equal(returned, true);
    await act(async () => legalRenderer.unmount());
  }
  assert.deepEqual(externalUrls, []);
  await act(async () => renderer.unmount());
});

test('onboarding stays in bounds and preserves its page when iPad width changes', async () => {
  const { Component, native } = screen('screens/auth/OnboardingScreen.jsx');
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component, { onDone() {} })); });
  const list = () => renderer.root.findByType('FlatList');
  await act(async () => list().props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 9000 } } }));
  assert.ok(button(renderer, 'onboarding.get_started'));
  native.useWindowDimensions = () => ({ width: 600, height: 800 });
  await act(async () => renderer.update(React.createElement(Component, { onDone() {} })));
  assert.equal(list().props.initialScrollIndex, 3);
  assert.deepEqual(list().props.getItemLayout(null, 3), { index: 3, length: 600, offset: 1800 });
  await act(async () => list().props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: -1000 } } }));
  assert.ok(button(renderer, 'auth.next'));
  await act(async () => renderer.unmount());
});

test('Pro users can reach subscription controls from More', async () => {
  const destinations = [];
  const { Component } = screen('screens/tabs/MoreScreen.tsx', {
    '@expo/vector-icons': { Feather: 'Feather', Ionicons: 'Ionicons', MaterialCommunityIcons: 'MaterialCommunityIcons' },
    '../../context/AuthContext': { useAuth: () => ({ user: { isPremium: true } }) },
  });
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component, {
    navigation: { navigate: destination => destinations.push(destination) },
  })); });
  await act(async () => button(renderer, 'upgrade.manage_subscription').props.onPress());
  assert.deepEqual(destinations, ['Upgrade']);
  await act(async () => renderer.unmount());
});

test('Pro restore waits for Apple result, syncs the plan and refreshes the session', async (context) => {
  const events = [];
  let completeRestore;
  const { Component, native } = screen('screens/tabs/UpgradeScreen.jsx', {
    '../../context/AuthContext': { useAuth: () => ({
      user: { isPremium: true }, token: 'test-token',
      refreshSession: async () => { events.push('refresh'); return { isPremium: true }; },
    }) },
    '../../services/RevenueCatService': {
      getOfferings: async () => ({ availablePackages: [] }),
      getTrialEligibility: async () => ({}),
      restorePurchases: () => new Promise(resolve => { completeRestore = resolve; }),
    },
  });
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://www.rbtgenius.com/api/billing/revenuecat-sync');
    assert.equal(options.method, 'POST');
    events.push('sync');
    return { ok: true, json: async () => ({ is_premium: true }) };
  });
  native.Alert.alert = title => events.push(title);
  let renderer, restoring;
  await act(async () => { renderer = create(React.createElement(Component, {
    navigation: { goBack: () => events.push('back') },
  })); });
  await act(async () => { restoring = button(renderer, 'upgrade.restore').props.onPress(); });
  assert.ok(renderer.root.findAllByType('Pressable').some(node => node.props.disabled === true));
  assert.deepEqual(events, []);
  await act(async () => { completeRestore(true); await restoring; });
  assert.deepEqual(events, ['sync', 'refresh', 'upgrade.restored', 'back']);
  await act(async () => renderer.unmount());
});

test('onboarding can finish even when device storage fails', async () => {
  let finished = 0;
  const { Component } = screen('screens/auth/OnboardingScreen.jsx', {
    '@react-native-async-storage/async-storage': { setItem: async () => { throw new Error('disk full'); } },
  });
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component, { onDone: () => finished++ })); });
  await act(async () => button(renderer, 'auth.skip').props.onPress());
  assert.equal(finished, 1);
  await act(async () => renderer.unmount());
});

test('iOS paywall retries a failed catalog and restores without offerings', async () => {
  let calls = 0, restores = 0, available = false;
  const { Component } = screen('screens/tabs/UpgradeScreen.jsx', {
    '../../services/RevenueCatService': {
      getOfferings: async () => {
        calls++;
        return available ? { availablePackages: [{
          identifier: '$rc_monthly', packageType: 'MONTHLY',
          product: { identifier: 'monthly', price: 19.99, priceString: '$19.99' },
        }] } : null;
      },
      restorePurchases: async () => { restores++; return false; },
      getTrialEligibility: async () => ({}), purchasePackage: async () => ({}),
    },
  });
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component, { navigation: {} })); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 4100)); });
  assert.equal(calls, 3);
  assert.ok(button(renderer, 'common.retry'));
  assert.equal(button(renderer, 'upgrade.start_pro').props.disabled, true);
  await act(async () => button(renderer, 'upgrade.restore').props.onPress());
  assert.equal(restores, 1);
  available = true;
  await act(async () => button(renderer, 'common.retry').props.onPress());
  assert.equal(calls, 4);
  assert.equal(button(renderer, 'upgrade.start_pro').props.disabled, false);
  assert.equal(button(renderer, 'common.retry'), undefined);
  await act(async () => renderer.unmount());
});

test('restore never announces Pro access or closes the screen when server sync fails', async context => {
  const events = [];
  const { Component, native } = screen('screens/tabs/UpgradeScreen.jsx', {
    '../../context/AuthContext': { useAuth: () => ({
      user: { isPremium: true }, token: 'test-token',
      refreshSession: async () => { events.push('refresh'); return { isPremium: false }; },
    }) },
    '../../services/RevenueCatService': {
      getOfferings: async () => ({ availablePackages: [] }),
      getTrialEligibility: async () => ({}), restorePurchases: async () => true,
    },
  });
  context.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 503 }));
  native.Alert.alert = title => events.push(title);
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component, {
    navigation: { goBack: () => events.push('back') },
  })); });
  try {
    await act(async () => button(renderer, 'upgrade.restore').props.onPress());
    assert.ok(!events.includes('upgrade.restored'));
    assert.ok(!events.includes('back'));
    assert.ok(events.includes('upgrade.sync_pending_title'));
  } finally { await act(async () => renderer.unmount()); }
});

test('a confirmed Apple purchase can retry activation without purchasing twice', async context => {
  let purchases = 0, synced = false;
  const events = [];
  const { Component, native } = screen('screens/tabs/UpgradeScreen.jsx', {
    '../../context/AuthContext': { useAuth: () => ({
      user: { isPremium: false }, token: 'test-token',
      refreshSession: async () => ({ isPremium: synced }),
    }) },
    '../../services/RevenueCatService': {
      getOfferings: async () => ({ availablePackages: [{
        identifier: '$rc_monthly', packageType: 'MONTHLY',
        product: { identifier: 'monthly', price: 19.99, priceString: '$19.99' },
      }] }),
      getTrialEligibility: async () => ({}),
      purchasePackage: async () => { purchases++; return { success: true }; },
    },
  });
  context.mock.method(globalThis, 'fetch', async () => ({
    ok: true, json: async () => ({ is_premium: synced }),
  }));
  native.Alert.alert = title => events.push(title);
  let renderer;
  await act(async () => { renderer = create(React.createElement(Component, {
    navigation: { goBack: () => events.push('back') },
  })); });
  try {
    await act(async () => button(renderer, 'upgrade.start_pro').props.onPress());
    assert.equal(purchases, 1);
    assert.deepEqual(events, ['upgrade.sync_pending_title']);
    assert.ok(button(renderer, 'upgrade.retry_access'));
    synced = true;
    await act(async () => button(renderer, 'upgrade.retry_access').props.onPress());
    assert.equal(purchases, 1);
    assert.deepEqual(events, ['upgrade.sync_pending_title', 'upgrade.welcome_pro', 'back']);
  } finally { await act(async () => renderer.unmount()); }
});
