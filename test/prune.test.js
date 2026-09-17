/**
 * Unit Tests for RobinHood Smart Prune
 */

const assert = require('assert');

// Test globToRegex logic
function globToRegex(glob) {
  let cleaned = glob.trim().replace(/^['"]|['"]$/g, '');
  if (cleaned.startsWith('./')) cleaned = cleaned.slice(2);
  
  let reStr = '';
  let i = 0;
  while (i < cleaned.length) {
    const c = cleaned[i];
    if (c === '*' && cleaned[i + 1] === '*') {
      if (cleaned[i + 2] === '/') {
        reStr += '(?:.+/)?';
        i += 3;
      } else {
        reStr += '.*';
        i += 2;
      }
    } else if (c === '*') {
      reStr += '[^/]*';
      i++;
    } else if (c === '?') {
      reStr += '[^/]';
      i++;
    } else if (['.', '+', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\'].includes(c)) {
      reStr += '\\' + c;
      i++;
    } else {
      reStr += c;
      i++;
    }
  }
  return new RegExp(`^${reStr}$`);
}

console.log('Testing RobinHood Smart Prune...');

// Test 1: Glob match directory recursiveness
const mobileRe = globToRegex('apps/mobile/**');
assert.strictEqual(mobileRe.test('apps/mobile/src/App.kt'), true, 'Should match nested file');
assert.strictEqual(mobileRe.test('apps/web/src/App.tsx'), false, 'Should not match different directory');

// Test 2: Extension glob
const mdRe = globToRegex('*.md');
assert.strictEqual(mdRe.test('README.md'), true, 'Should match root markdown');
assert.strictEqual(mdRe.test('docs/README.md'), false, 'Should not match nested file when no wildcard prefix');

// Test 3: Nested extension glob
const allMdRe = globToRegex('**/*.md');
assert.strictEqual(allMdRe.test('docs/sub/guide.md'), true, 'Should match deeply nested markdown');
assert.strictEqual(allMdRe.test('docs/sub/guide.txt'), false, 'Should not match different extension');

console.log('✅ All 3 tests passed successfully!');
