import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const KEY = "wortspiel.state.v1";
const pages = [
  ["projekt.html", "Für gute gemeinsame Runden."],
  ["impressum.html", "Impressum"],
  ["datenschutz.html", "Datenschutz beim Spielen"],
  ["unterstuetzen.html", "Jugendarbeit möglich machen."],
];
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);

test("community pages and footer fit phone, tablet and desktop widths", async ({page}) => {
  for (const [width, height] of [[320,568],[375,667],[393,852],[852,393],[800,1280],[1180,820],[1368,912],[1440,900],[1920,1080]]) {
    await page.setViewportSize({width,height});
    await page.goto("/");
    await expect(page.locator(".site-footer").getByRole("link",{name:"Impressum",exact:true})).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const [file, title] of pages) {
      await page.goto(`/${file}`);
      await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await page.getByRole("link",{name:"← Zurück zum Spiel"}).evaluate(a=>a.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
    }
  }
});

test("opening information pauses the round and returning preserves scores and card history", async ({page}) => {
  await page.goto("/");
  await page.getByRole("button",{name:"Los geht’s",exact:true}).click();
  await page.getByRole("button",{name:"Wir sind bereit",exact:true}).click();
  const first = await page.locator("#current-word").innerText();
  await page.locator('[data-action="correct"]').click();
  await expect(page.locator("#current-word")).not.toHaveText(first);
  const before=await stored(page);
  await page.locator(".site-footer").getByRole("link",{name:"Unterstützen",exact:true}).click();
  // Pages uses a canonical extensionless URL; GitHub/local hosts retain .html.
  await expect(page).toHaveURL(/\/unterstuetzen(?:\.html)?$/);
  const paused=await stored(page);
  expect(paused.session.phase).toBe("paused");
  expect(paused.session.deadline).toBeNull();
  expect(paused.session.current).toBe(before.session.current);
  expect(paused.session.scores).toEqual(before.session.scores);
  expect(paused.session.log).toEqual(before.session.log);
  expect(paused.groups).toEqual(before.groups);
  await page.getByRole("link",{name:"← Zurück zum Spiel"}).click();
  await expect(page.getByRole("heading",{name:"Kurz durchatmen."})).toBeVisible();
  const resumed=await stored(page);
  expect(resumed.session.remaining).toBe(paused.session.remaining);
  expect(resumed.groups).toEqual(before.groups);
  expect(resumed.session.scores).toEqual(before.session.scores);
  await page.getByRole("button",{name:"Weiter geht’s",exact:true}).click();
  expect((await stored(page)).session.current).toBe(before.session.current);
});

test("information and banking QR stay available offline without foreign requests", async ({page,context,baseURL}) => {
  const foreign=[];
  context.on("request",r=>{if(new URL(r.url()).origin!==new URL(baseURL).origin)foreign.push(r.url());});
  await page.goto("/");
  await expect(page.locator("#connection")).toHaveText("Offline bereit");
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>new Promise(resolve=>{
    if(navigator.serviceWorker.controller)return resolve();
    navigator.serviceWorker.addEventListener("controllerchange",resolve,{once:true});
  })));
  const before=await stored(page);
  const cached=await page.evaluate(async()=>{
    const cache=await caches.open((await caches.keys()).find(k=>k.startsWith("wortspiel-")));
    return (await cache.keys()).map(r=>new URL(r.url).pathname);
  });
  for(const file of [...pages.map(([file])=>file),"projekt-info.css","projekt-info.js","spenden-jugendarbeit.svg","spenden-jugendarbeit.png"])expect(cached).toContain(`/${file}`);
  await context.setOffline(true);
  for(const [file,title] of pages){
    await page.goto(`/${file}?offline=1`);
    await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible();
    expect(await stored(page)).toEqual(before);
  }
  await expect(page.locator(".banking-qr")).toBeVisible();
  expect(await page.locator(".banking-qr").evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  const png=await page.evaluate(async()=>{
    const r=await fetch("./spenden-jugendarbeit.png");
    return {ok:r.ok,bytes:(await r.arrayBuffer()).byteLength};
  });
  expect(png.ok).toBe(true);expect(png.bytes).toBeGreaterThan(0);
  expect(foreign).toEqual([]);
});

test("same-phone donation copies exact bank details and downloads the local QR", async ({page,context}) => {
  await context.grantPermissions(["clipboard-read","clipboard-write"]);
  await page.goto("/unterstuetzen.html");
  await expect(page.locator(".iban")).toHaveText("DE50 5105 0015 0656 2363 79");
  await page.getByRole("button",{name:"IBAN kopieren",exact:true}).click();
  await expect(page.getByRole("status")).toHaveText("IBAN kopiert.");
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe("DE50510500150656236379");
  await page.getByRole("button",{name:"Verwendungszweck kopieren",exact:true}).click();
  await expect(page.getByRole("status")).toHaveText("Verwendungszweck kopiert.");
  expect(await page.evaluate(()=>navigator.clipboard.readText())).toBe("Spende Jugendarbeit");
  const downloading=page.waitForEvent("download");
  await page.getByRole("link",{name:"QR-Bild speichern"}).click();
  const download=await downloading;
  expect(download.suggestedFilename()).toBe("spende-jugendarbeit.png");
  expect(await readFile(await download.path())).toEqual(await readFile(new URL("../../public/spenden-jugendarbeit.png",import.meta.url)));
});

test("standalone information works without JavaScript or a readable game snapshot", async ({browser,baseURL,page}) => {
  const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:568}});
  try {
    const tab=await plain.newPage();
    for(const [file,title] of pages){
      await tab.goto(`${baseURL}/${file}`);
      await expect(tab.getByRole("heading",{name:title,exact:true})).toBeVisible();
    }
    await expect(tab.getByRole("button",{name:"IBAN kopieren"})).toHaveCount(0);
    await expect(tab.locator(".iban")).toHaveText("DE50 5105 0015 0656 2363 79");
    await expect(tab.locator(".banking-qr")).toBeVisible();
  } finally {await plain.close();}
  await page.goto("/impressum.html");
  const raw="{this saved snapshot must not be changed";
  await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:KEY,raw});
  for(const [file,title] of pages){
    await page.goto(`/${file}`);
    await expect(page.getByRole("heading",{name:title,exact:true})).toBeVisible();
    expect(await page.evaluate(key=>localStorage.getItem(key),KEY)).toBe(raw);
  }
});

test("clipboard denial and a failed pause never hide bank details or abandon the round", async ({page,context}) => {
  await context.addInitScript(()=>{
    Object.defineProperty(window,"indexedDB",{get(){throw new Error("Local-only regression");}});
  });
  await page.goto("/unterstuetzen.html");
  await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{value:{writeText:async()=>{throw new Error("Permission denied");}}}));
  await page.getByRole("button",{name:"IBAN kopieren",exact:true}).click();
  await expect(page.getByRole("status")).toContainText("markiere und kopiere");
  await expect(page.locator(".iban")).toBeVisible();
  await page.goto("/");
  await page.getByRole("button",{name:"Los geht’s",exact:true}).click();
  await page.getByRole("button",{name:"Wir sind bereit",exact:true}).click();
  await expect(page.locator("#current-word")).toBeVisible();
  const before=await stored(page);
  await page.evaluate(key=>{
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(k,v){if(k===key)throw new DOMException("Storage full","QuotaExceededError");return original.call(this,k,v);};
  },KEY);
  await page.locator(".site-footer").getByRole("link",{name:"Impressum",exact:true}).click();
  await expect(page.locator("#toast")).toContainText("Storage full");
  await expect(page).not.toHaveURL(/impressum\.html/);
  expect(await stored(page)).toEqual(before);
  await expect(page.locator("#current-word")).toBeVisible();
});

test("support controls work with an explicit CSP that forbids inline scripts", async ({page,context}) => {
  const violations=[];
  await context.addInitScript(()=>{
    window.__infoViolations=[];
    document.addEventListener("securitypolicyviolation",e=>window.__infoViolations.push(e.violatedDirective));
  });
  await context.grantPermissions(["clipboard-read","clipboard-write"]);
  await context.route("**/unterstuetzen.html",async route=>{
    const response=await route.fetch();
    await route.fulfill({response,headers:{...response.headers(),"Content-Security-Policy":"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'self'"}});
  });
  await page.goto("/unterstuetzen.html");
  await page.getByRole("button",{name:"IBAN kopieren",exact:true}).click();
  await expect(page.getByRole("status")).toHaveText("IBAN kopiert.");
  violations.push(...await page.evaluate(()=>window.__infoViolations));
  expect(violations).toEqual([]);
  expect(await page.locator(".banking-qr").evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
});
