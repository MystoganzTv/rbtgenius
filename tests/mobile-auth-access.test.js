import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(new URL('../mobile/package.json', import.meta.url));
const React = require('react');
const { act, create } = require('react-test-renderer');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function loadAuth() {
  const { code } = require('@babel/core').transformSync(
    readFileSync(new URL('../mobile/src/context/AuthContext.jsx', import.meta.url), 'utf8'), {
      babelrc: false, configFile: false,
      plugins: [[require.resolve('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
        require.resolve('@babel/plugin-transform-modules-commonjs')],
    });
  const modules = {
    react: React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'react-native': { Platform: { OS: 'ios' } },
    '@react-native-async-storage/async-storage': {
      getItem: async () => null, setItem: async () => {}, removeItem: async () => {},
    },
    '@react-native-google-signin/google-signin': {
      GoogleSignin: { configure() {}, signOut: async () => {} }, statusCodes: {},
    },
    '../services/RevenueCatService': { initRevenueCat: async () => {}, resetRevenueCat: async () => {} },
    'expo-apple-authentication': {},
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => {
    if (!(id in modules)) throw new Error(`Unmocked: ${id}`);
    return modules[id];
  }, module, module.exports);
  return module.exports;
}

const response = body => ({ ok: true, json: async () => body });

test('a server-confirmed Pro account stays Pro when dashboard loading fails', async context => {
  const { AuthProvider, useAuth } = loadAuth();
  let auth, renderer;
  function Probe() { auth = useAuth(); return null; }
  context.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('/auth/login')) return response({ token: 'test', user: { id: 'pro', plan: 'premium_monthly' } });
    if (url.endsWith('/dashboard')) return { ok: false, status: 503 };
    throw new Error(`Unexpected request ${url}`);
  });
  await act(async () => { renderer = create(React.createElement(AuthProvider, null, React.createElement(Probe))); });
  try {
    await act(async () => auth.login('test@example.com', 'test'));
    assert.equal(auth.user.isPremium, true);
  } finally { await act(async () => renderer.unmount()); }
});

test('a delayed pre-purchase dashboard cannot overwrite refreshed Pro access', async context => {
  const { AuthProvider, useAuth } = loadAuth();
  let auth, renderer, resolveOldDashboard, dashboards = 0;
  function Probe() { auth = useAuth(); return null; }
  context.mock.method(globalThis, 'fetch', async url => {
    if (url.endsWith('/auth/login')) return response({ token: 'test', user: { id: 'user', plan: 'free' } });
    if (url.endsWith('/auth/me')) return response({ id: 'user', plan: 'premium_monthly' });
    if (url.endsWith('/dashboard')) {
      if (++dashboards === 1) return new Promise(resolve => { resolveOldDashboard = resolve; });
      return response({ entitlements: { is_premium: true }, progress: {} });
    }
    throw new Error(`Unexpected request ${url}`);
  });
  await act(async () => { renderer = create(React.createElement(AuthProvider, null, React.createElement(Probe))); });
  try {
    await act(async () => auth.login('test@example.com', 'test'));
    await act(async () => auth.refreshSession());
    assert.equal(auth.user.isPremium, true);
    await act(async () => resolveOldDashboard(response({ entitlements: { is_premium: false }, progress: {} })));
    assert.equal(auth.user.isPremium, true);
    assert.equal(auth.user.plan, 'premium_monthly');
  } finally { await act(async () => renderer.unmount()); }
});
