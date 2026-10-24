import { readdir, readFile } from 'node:fs/promises';

const site = 'https://daminow.github.io/itmap/';
const endpoint = 'https://www.bing.com/indexnow';
const keys = (await readdir(new URL('../public/', import.meta.url))).filter(name => /^[a-f0-9]{32}\.txt$/.test(name));
if (keys.length !== 1) throw new Error('Exactly one IndexNow ownership file is required');
const key = (await readFile(new URL('../public/' + keys[0], import.meta.url), 'utf8')).trim();
if (key !== keys[0].slice(0, -4)) throw new Error('Ownership file content does not match its name');
const keyLocation = new URL(keys[0], site).href;
const validateOnly = process.argv.includes('--validate-only');
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' });
  if (!response.ok) throw new Error(`Public resource not ready: HTTP ${response.status}`);
  return response.text();
}
const xml = validateOnly ? await readFile(new URL('../dist/sitemap.xml', import.meta.url), 'utf8') : await get(new URL('sitemap.xml', site));
const urlList = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
if (!urlList.length || urlList.length > 10000 || new Set(urlList).size !== urlList.length) throw new Error('Invalid sitemap URL count');
for (const url of urlList) {
  const parsed = new URL(url);
  if (!url.startsWith(site) || parsed.origin !== new URL(site).origin || parsed.search || parsed.hash) throw new Error('Sitemap contains a URL outside the canonical project');
}
if (validateOnly) {
  console.log(`IndexNow configuration valid: ${urlList.length} canonical project URLs; no requests sent.`);
} else {
  if ((await get(keyLocation)).trim() !== key) throw new Error('Public ownership file has not been published');
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(site).hostname, key, keyLocation, urlList }),
    signal: AbortSignal.timeout(30000),
  });
  if (response.status !== 200 && response.status !== 202) throw new Error(`IndexNow rejected submission: HTTP ${response.status}`);
  console.log(`IndexNow received ${urlList.length} URLs: HTTP ${response.status}${response.status === 202 ? ' (ownership validation pending)' : ''}. This does not confirm indexing.`);
}
