const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

function loadRules(browser) {
  const rulesPath = path.resolve(__dirname, `../${browser}/rules.json`);
  return JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
}

function validateRuleStructure(rule, index) {
  assert.ok(typeof rule.id === 'number', `rule[${index}].id must be a number`);
  assert.ok(typeof rule.priority === 'number', `rule[${index}].priority must be a number`);
  assert.ok(rule.priority >= 1, `rule[${index}].priority must be >= 1`);
  assert.strictEqual(rule.action?.type, 'redirect', `rule[${index}].action.type must be 'redirect'`);
  assert.ok(
    typeof rule.action?.redirect?.transform?.host === 'string',
    `rule[${index}].action.redirect.transform.host must be a string`
  );
  assert.ok(
    Array.isArray(rule.condition?.requestDomains),
    `rule[${index}].condition.requestDomains must be an array`
  );
  assert.ok(
    rule.condition.requestDomains.length > 0,
    `rule[${index}].condition.requestDomains must be non-empty`
  );
  assert.ok(
    Array.isArray(rule.condition?.resourceTypes),
    `rule[${index}].condition.resourceTypes must be an array`
  );
  assert.ok(
    rule.condition.resourceTypes.includes('main_frame'),
    `rule[${index}].condition.resourceTypes must include 'main_frame'`
  );
}

for (const browser of ['chrome', 'edge']) {
  describe(`${browser}/rules.json`, () => {
    let rules;

    test('parses as valid JSON array', () => {
      rules = loadRules(browser);
      assert.ok(Array.isArray(rules), 'rules.json must be a JSON array');
    });

    test('contains exactly 2 rules', () => {
      rules = rules ?? loadRules(browser);
      assert.strictEqual(rules.length, 2);
    });

    test('each rule has valid structure', () => {
      rules = rules ?? loadRules(browser);
      for (let i = 0; i < rules.length; i++) {
        validateRuleStructure(rules[i], i);
      }
    });

    test('rule IDs are unique', () => {
      rules = rules ?? loadRules(browser);
      const ids = rules.map(r => r.id);
      assert.strictEqual(new Set(ids).size, ids.length, 'rule IDs must be unique');
    });

    test('rule 1 redirects x.com to xcancel.com', () => {
      rules = rules ?? loadRules(browser);
      const rule = rules.find(r => r.condition?.requestDomains?.includes('x.com'));
      assert.ok(rule, 'a rule targeting x.com must exist');
      assert.strictEqual(rule.action.redirect.transform.host, 'xcancel.com');
    });

    test('rule 2 redirects www.x.com to www.xcancel.com', () => {
      rules = rules ?? loadRules(browser);
      const rule = rules.find(r => r.condition?.requestDomains?.includes('www.x.com'));
      assert.ok(rule, 'a rule targeting www.x.com must exist');
      assert.strictEqual(rule.action.redirect.transform.host, 'www.xcancel.com');
    });

    test('www.x.com rule has higher priority than x.com rule', () => {
      rules = rules ?? loadRules(browser);
      const xRule = rules.find(r => r.condition?.requestDomains?.includes('x.com') &&
        !r.condition?.requestDomains?.includes('www.x.com'));
      const wwwRule = rules.find(r => r.condition?.requestDomains?.includes('www.x.com'));
      assert.ok(xRule && wwwRule, 'both rules must exist');
      assert.ok(wwwRule.priority > xRule.priority,
        'www.x.com rule must have higher priority so it wins when both match');
    });
  });
}

describe('chrome vs edge rules consistency', () => {
  test('chrome and edge rules.json are identical', () => {
    const chromeRules = loadRules('chrome');
    const edgeRules = loadRules('edge');
    assert.deepStrictEqual(
      chromeRules,
      edgeRules,
      'chrome/rules.json and edge/rules.json must be identical'
    );
  });
});
