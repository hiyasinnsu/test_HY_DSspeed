// Verifies the deployed GitHub Pages build with the same browser checks.
// Run explicitly: node --test tests/live.check.mjs
process.env.CHECK_URL = process.env.CHECK_URL
  || 'https://hiyasinnsu.github.io/test_HY_DSspeed/';
console.log('checking', process.env.CHECK_URL);
await import('./browser.test.mjs');
