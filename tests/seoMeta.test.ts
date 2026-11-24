import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {SEO_ROUTES,HOME_PATHS,DEFAULT_META,injectSeoMeta,renderMetaTags} from '../server/seoMeta';

const SHELL='<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="description" content="old default"><meta name="robots" content="index,follow"><link rel="canonical" href="https://oravini.com/old"><meta property="og:title" content="old og"><meta name="twitter:card" content="summary"><title>Old Title</title></head><body><div id="root"></div></body></html>';

test('public marketing routes carry index,follow metadata',()=>{
 for(const route of ['/','/oravini','/preview','/video-marketing-landing','/brandverse','/apply','/audit']){
  const meta=SEO_ROUTES[route];assert.ok(meta,`missing SEO meta for ${route}`);
  assert.match(meta.description,/Oravini/i);
  assert.ok(meta.canonical.startsWith('https://oravini.com'));
  assert.equal(meta.robots??'index,follow','index,follow');
 }
 assert.deepEqual(HOME_PATHS,['/','/oravini']);
});

test('utility routes are noindex',()=>{
 for(const route of ['/login','/select-plan','/onboarding','/verify-phone'])assert.equal(SEO_ROUTES[route].robots,'noindex,follow');
});

test('injectSeoMeta replaces shell defaults without duplicating tags',()=>{
 const html=injectSeoMeta(SHELL,SEO_ROUTES['/preview']);
 assert.equal((html.match(/name="description"/g)||[]).length,1);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
 assert.equal((html.match(/property="og:title"/g)||[]).length,1);
 assert.equal((html.match(/name="twitter:card"/g)||[]).length,1);
 assert.equal((html.match(/<title>/g)||[]).length,1);
 assert.ok(html.includes(`<title>${SEO_ROUTES['/preview'].title}</title>`));
 assert.ok(html.includes(`<link rel="canonical" href="https://oravini.com/preview" />`));
 assert.ok(!html.includes('old default')&&!html.includes('Old Title'));
});

test('injected attribute values are escaped',()=>{
 const html=renderMetaTags({title:'A "quoted" <title>',description:'5 > 3 & "ok"',canonical:'https://oravini.com/'});
 assert.ok(!html.includes('"quoted" <title>')&&html.includes('&quot;quoted&quot;'));
 assert.ok(html.includes('5 &gt; 3 &amp; &quot;ok&quot;'));
});

test('robots.txt allows crawling and references the sitemap',()=>{
 const robots=readFileSync(new URL('../client/public/robots.txt',import.meta.url),'utf8');
 assert.match(robots,/User-agent: \*/);
 assert.match(robots,/Allow: \//);
 assert.match(robots,/Disallow: \/api\//);
 assert.ok(!/Disallow: \/\s*$/m.test(robots),'robots.txt must not block the whole site');
 assert.match(robots,/Sitemap: https:\/\/oravini\.com\/sitemap\.xml/);
});

test('sitemap.xml lists only public pages',()=>{
 const sitemap=readFileSync(new URL('../client/public/sitemap.xml',import.meta.url),'utf8');
 for(const p of ['/','/oravini','/preview','/privacy','/terms'])assert.ok(sitemap.includes(`<loc>https://oravini.com${p==='/'?'/':p}</loc>`),`sitemap missing ${p}`);
 for(const p of ['/api/','/dashboard','/admin','/onboarding','/select-plan'])assert.ok(!sitemap.includes(`oravini.com${p}`),`sitemap must not list ${p}`);
 assert.ok(existsSync(new URL('../client/public/robots.txt',import.meta.url)));
 assert.equal(DEFAULT_META.canonical,'https://oravini.com/');
});
