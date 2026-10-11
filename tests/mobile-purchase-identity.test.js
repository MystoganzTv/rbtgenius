import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const require = createRequire(new URL('../mobile/package.json', import.meta.url));
function service(purchases) {
  const { code } = require('@babel/core').transformSync(
    readFileSync(new URL('../mobile/src/services/RevenueCatService.js', import.meta.url), 'utf8'), {
      babelrc: false, configFile: false,
      plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
    });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', '__DEV__', code)(() => ({
    __esModule: true, default: purchases, LOG_LEVEL: {},
  }), module, module.exports, false);
  return module.exports;
}

test('purchases wait until the signed-in account is identified', async () => {
  let resolveLogin, bought = 0, configuredUser;
  const rc = service({
    configure: args => { configuredUser = args.appUserID; },
    logIn: async user => {
      if (user === 'second') await new Promise(resolve => { resolveLogin = resolve; });
    },
    purchasePackage: async () => { bought++; return { customerInfo: { entitlements: { active: { pro: {} } } } }; },
  });
  await rc.initRevenueCat('first');
  const identifying = rc.initRevenueCat('second');
  await new Promise(resolve => setImmediate(resolve));
  const buying = rc.purchasePackage({ identifier: 'monthly' });
  await new Promise(resolve => setImmediate(resolve));
  const beforeLogin = bought;
  resolveLogin();
  await identifying;
  assert.equal((await buying).success, true);
  assert.equal(beforeLogin, 0);
  assert.equal(bought, 1);
  assert.equal(configuredUser, 'first');
});

test('failed account identification blocks purchases under the previous account', async () => {
  let bought = 0;
  const rc = service({
    configure() {},
    logIn: async user => { if (user === 'second') throw new Error('offline'); },
    purchasePackage: async () => { bought++; return { customerInfo: { entitlements: { active: { pro: {} } } } }; },
    getCustomerInfo: async () => ({ entitlements: { active: { pro: {} } } }),
  });
  await rc.initRevenueCat('first');
  await rc.initRevenueCat('second').catch(() => {});
  const result = await rc.purchasePackage({});
  assert.equal(result.success, false);
  assert.equal(bought, 0);
});

test('a restore network failure is not reported as an empty purchase history', async () => {
  const rc = service({ configure() {}, logIn: async () => {}, restorePurchases: async () => { throw new Error('offline'); } });
  await rc.initRevenueCat('first');
  await assert.rejects(rc.restorePurchases(), /offline/);
});
