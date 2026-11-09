// Enables GitHub Pages for this repository (branch: main, path: /) and waits
// for the deployment to finish. Requires GITHUB_TOKEN with repo scope.
const OWNER = process.env.PAGES_OWNER || 'hiyasinnsu';
const REPO = process.env.PAGES_REPO || 'test_HY_DSspeed';
const TOKEN = process.env.GITHUB_TOKEN;
const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

if (!TOKEN) {
  console.error('GITHUB_TOKEN is not set');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'ds-speed-deploy',
  'Content-Type': 'application/json',
};

async function api(path, init = {}) {
  const res = await fetch(API + path, { ...init, headers });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const current = await api('/pages');
if (current.status === 200) {
  console.log('pages already enabled:', current.body.html_url || current.body.url);
} else if (current.status === 404) {
  const created = await api('/pages', {
    method: 'POST',
    body: JSON.stringify({ source: { branch: 'main', path: '/' } }),
  });
  console.log('enable pages:', created.status, JSON.stringify(created.body).slice(0, 300));
  if (created.status >= 400 && created.status !== 409) process.exit(1);
} else {
  console.error('unexpected /pages response', current.status, current.body);
  process.exit(1);
}

let build = null;
for (let i = 0; i < 40; i++) {
  const res = await api('/pages/builds/latest');
  if (res.status === 200) {
    build = res.body;
    if (build.status === 'built' || build.status === 'errored') break;
  }
  await sleep(5000);
}
const info = await api('/pages');
console.log(JSON.stringify({
  url: info.status === 200 ? info.body.html_url || info.body.url : null,
  status: info.status === 200 ? info.body.status : null,
  build: build ? { status: build.status, error: build.error?.message || null } : null,
}, null, 2));
if (build && build.status !== 'built') process.exitCode = 1;
