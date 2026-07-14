import express from "express";
import cors from "cors";
import * as cheerio from "cheerio";
import fs from "node:fs";
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));
const pageCache = new Map();
const robotsCache = new Map();
const snapshotFile = new URL("./work/snapshots.json", import.meta.url);
const runFile = new URL("./work/runs.json", import.meta.url);
const recipeFile = new URL("./work/recipes.json", import.meta.url);
const scheduleFile = new URL("./work/schedules.json", import.meta.url);
let snapshotData = {};
try {
  snapshotData = JSON.parse(fs.readFileSync(snapshotFile, "utf8"));
} catch {}
const snapshots = new Map(Object.entries(snapshotData));
let runs = [];
try {
  runs = JSON.parse(fs.readFileSync(runFile, "utf8"));
} catch {}
let recipes = [];
try {
  recipes = JSON.parse(fs.readFileSync(recipeFile, "utf8"));
} catch {}
let schedules = [];
try {
  schedules = JSON.parse(fs.readFileSync(scheduleFile, "utf8"));
} catch {}
const saveRecipes = () => {
  fs.mkdirSync(new URL("./work/", import.meta.url), { recursive: true });
  fs.writeFileSync(recipeFile, JSON.stringify(recipes, null, 2));
};
const saveSchedules = () => {
  fs.mkdirSync(new URL("./work/", import.meta.url), { recursive: true });
  fs.writeFileSync(scheduleFile, JSON.stringify(schedules, null, 2));
};
async function runRecipe(recipe, schedule) {
  const c = recipe.config || {},
    endpoint = c.crawlMode ? "crawl" : "scrape";
  let response = await fetch(`http://localhost:4174/api/${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...c, __scheduleId: schedule?.id }),
    }),
    data = await response.json();
  if (!response.ok) throw Error(data.error);
  if (c.enrich && data.rows?.length) {
    response = await fetch("http://localhost:4174/api/enrich", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rows: data.rows,
        urlField: c.urlField,
        detailFields: c.detailFields,
        limit: c.detailLimit,
        delay: c.delay,
        renderJs: c.renderJs,
        retries: c.retries,
        cache: c.cache,
        respectRobots: c.respectRobots,
      }),
    });
    data = { ...data, enrichment: await response.json() };
    data.rows = data.enrichment.rows || data.rows;
  }
  if (c.transforms?.length && data.rows?.length) {
    response = await fetch("http://localhost:4174/api/transform", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rows: data.rows, transforms: c.transforms }),
    });
    const transformed = await response.json();
    data = {
      ...data,
      rows: transformed.rows || data.rows,
      transformStats: transformed.stats,
    };
  }
  return data;
}
app.use(["/api/scrape", "/api/crawl", "/api/enrich"], (req, res, next) => {
  const started = Date.now(),
    original = res.json.bind(res);
  res.json = (body) => {
    const entry = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: new Date().toISOString(),
      endpoint: req.path,
      url: req.body?.url || req.body?.rows?.[0]?.url || "",
      status:
        res.statusCode >= 400
          ? "error"
          : body?.errors?.length
            ? "partial"
            : "success",
      httpStatus: res.statusCode,
      duration: Date.now() - started,
      count: body?.count || 0,
      pages: body?.pages || 0,
      error: body?.error || "",
      errors: body?.errors || [],
      trail: body?.trail || [],
      retryOf: req.body?.__retryOf || null,
      attempt: (req.body?.__attempt || 0) + 1,
      config: {
        ...req.body,
        rows: req.body?.rows ? req.body.rows.slice(0, 500) : undefined,
      },
    };
    runs = [entry, ...runs].slice(0, 100);
    fs.mkdirSync(new URL("./work/", import.meta.url), { recursive: true });
    fs.writeFileSync(runFile, JSON.stringify(runs, null, 2));
    return original(body);
  };
  next();
});
app.get("/api/runs", (req, res) =>
  res.json({
    runs: runs.slice(0, Math.min(+req.query.limit || 25, 100)),
    count: runs.length,
  }),
);
app.delete("/api/runs", (_, res) => {
  runs = [];
  fs.writeFileSync(runFile, "[]");
  res.json({ ok: true });
});
app.get("/api/recipes", (_, res) =>
  res.json({ recipes, count: recipes.length }),
);
app.post("/api/recipes", (req, res) => {
  const { name, config } = req.body;
  if (!clean(name)) return res.status(400).json({ error: "Nom requis" });
  const existing = recipes.find(
      (x) => x.name.toLowerCase() === name.trim().toLowerCase(),
    ),
    now = new Date().toISOString();
  if (existing) {
    existing.config = config;
    existing.updatedAt = now;
  } else
    recipes.unshift({
      id: `recipe_${Date.now()}`,
      name: name.trim(),
      config,
      createdAt: now,
      updatedAt: now,
    });
  saveRecipes();
  res.json({
    ok: true,
    recipe: recipes.find(
      (x) => x.name.toLowerCase() === name.trim().toLowerCase(),
    ),
  });
});
app.delete("/api/recipes/:id", (req, res) => {
  const before = recipes.length;
  recipes = recipes.filter((x) => x.id !== req.params.id);
  saveRecipes();
  res.json({ ok: recipes.length < before });
});
app.get("/api/schedules", (_, res) =>
  res.json({ schedules, count: schedules.length }),
);
app.post("/api/schedules", (req, res) => {
  const { recipeId, intervalMinutes = 60 } = req.body,
    recipe = recipes.find((x) => x.id === recipeId);
  if (!recipe) return res.status(404).json({ error: "Recette introuvable" });
  const minutes = Math.max(1, Math.min(+intervalMinutes || 60, 43200)),
    schedule = {
      id: `schedule_${Date.now()}`,
      recipeId,
      recipeName: recipe.name,
      intervalMinutes: minutes,
      enabled: true,
      createdAt: new Date().toISOString(),
      nextRun: new Date(Date.now() + minutes * 60000).toISOString(),
      lastRun: null,
      lastStatus: "pending",
    };
  schedules.unshift(schedule);
  saveSchedules();
  res.json({ ok: true, schedule });
});
app.patch("/api/schedules/:id", (req, res) => {
  const s = schedules.find((x) => x.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Planification introuvable" });
  if (typeof req.body.enabled === "boolean") s.enabled = req.body.enabled;
  if (req.body.intervalMinutes) {
    s.intervalMinutes = Math.max(1, Math.min(+req.body.intervalMinutes, 43200));
    s.nextRun = new Date(Date.now() + s.intervalMinutes * 60000).toISOString();
  }
  saveSchedules();
  res.json({ ok: true, schedule: s });
});
app.delete("/api/schedules/:id", (req, res) => {
  schedules = schedules.filter((x) => x.id !== req.params.id);
  saveSchedules();
  res.json({ ok: true });
});
app.post("/api/schedules/:id/run", async (req, res) => {
  const s = schedules.find((x) => x.id === req.params.id),
    recipe = s && recipes.find((x) => x.id === s.recipeId);
  if (!s || !recipe)
    return res
      .status(404)
      .json({ error: "Planification ou recette introuvable" });
  try {
    const data = await runRecipe(recipe, s);
    s.lastRun = new Date().toISOString();
    s.lastStatus = "success";
    s.lastCount = data.count || data.rows?.length || 0;
    s.nextRun = new Date(Date.now() + s.intervalMinutes * 60000).toISOString();
    saveSchedules();
    res.json({ ok: true, data, schedule: s });
  } catch (e) {
    s.lastRun = new Date().toISOString();
    s.lastStatus = "error";
    s.lastError = e.message;
    s.nextRun = new Date(Date.now() + s.intervalMinutes * 60000).toISOString();
    saveSchedules();
    res.status(400).json({ error: e.message, schedule: s });
  }
});
app.post("/api/runs/:id/retry", async (req, res) => {
  const run = runs.find((x) => x.id === req.params.id);
  if (!run) return res.status(404).json({ error: "Exécution introuvable" });
  const config = {
    ...run.config,
    __retryOf: run.id,
    __attempt: run.attempt || 1,
    cache: false,
  };
  if (run.endpoint === "/api/crawl" && run.errors.length === 1)
    config.url = run.errors[0].url;
  try {
    const response = await fetch(`http://localhost:4174${run.endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(config),
      }),
      body = await response.json();
    res.status(response.status).json({ ...body, retryOf: run.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
let chromePromise;
async function robotsAllowed(url, userAgent = "ScrapeFlow") {
  const u = new URL(url),
    robotsUrl = `${u.origin}/robots.txt`;
  let text = robotsCache.get(robotsUrl);
  if (text === undefined) {
    try {
      const r = await fetch(robotsUrl, {
        headers: { "user-agent": userAgent },
      });
      text = r.ok ? await r.text() : "";
    } catch {
      text = "";
    }
    robotsCache.set(robotsUrl, text);
  }
  if (!text) return { allowed: true, robotsUrl, rules: [] };
  if (
    /forbidden to use search robots|access is only permitted with special permission/i.test(
      text,
    )
  )
    return {
      allowed: false,
      robotsUrl,
      rule: { type: "policy", path: "/" },
      notice: "Méthodes automatiques interdites sans autorisation.",
    };
  let active = false,
    rules = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line) continue;
    const [key, ...rest] = line.split(":"),
      value = rest.join(":").trim();
    if (key.toLowerCase() === "user-agent")
      active =
        value === "*" || userAgent.toLowerCase().includes(value.toLowerCase());
    else if (active && /^(allow|disallow)$/i.test(key) && value)
      rules.push({ type: key.toLowerCase(), path: value });
  }
  const path = u.pathname + u.search,
    matches = rules
      .filter((r) => path.startsWith(r.path))
      .sort((a, b) => b.path.length - a.path.length),
    winner = matches[0];
  return {
    allowed: !winner || winner.type === "allow",
    robotsUrl,
    rule: winner || null,
    rules: rules.slice(0, 50),
  };
}
const abs = (v, b) => {
    try {
      return new URL(v, b).href;
    } catch {
      return v || "";
    }
  },
  clean = (v) =>
    String(v ?? "")
      .replace(/\s+/g, " ")
      .trim();
async function load(url, o = {}) {
  if (o.respectRobots) {
    const check = await robotsAllowed(url, o.userAgent || "ScrapeFlow");
    if (!check.allowed) {
      const e = Error(`Interdit par robots.txt : ${check.rule.path}`);
      e.code = "ROBOTS_DENIED";
      throw e;
    }
  }
  const key = `${o.renderJs ? "js" : "html"}:${url}`;
  const cached = pageCache.get(key);
  if (
    o.cache !== false &&
    cached &&
    Date.now() - cached.time < (+o.cacheTtl || 300000)
  )
    return { ...cached.value, cached: true };
  let lastError;
  for (let attempt = 0; attempt <= Math.min(+o.retries || 2, 5); attempt++) {
    try {
      let value;
      if (o.renderJs) {
        const { chromium } = await import("playwright-core");
        chromePromise ||= chromium.launch({
          headless: true,
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          args: ["--no-sandbox"],
        });
        const browser = await chromePromise,
          context = await browser.newContext({
            userAgent: o.userAgent || "Mozilla/5.0 ScrapeFlow/2.3",
          }),
          page = await context.newPage();
        try {
          await page.goto(url, {
            waitUntil: o.waitUntil || "domcontentloaded",
            timeout: Math.min(+o.timeout || 30000, 60000),
          });
          if (o.waitForSelector)
            await page.waitForSelector(o.waitForSelector, {
              timeout: Math.min(+o.timeout || 30000, 60000),
            });
          if (o.scroll)
            await page.evaluate(async () => {
              for (let i = 0; i < 12; i++) {
                window.scrollBy(0, window.innerHeight);
                await new Promise((r) => setTimeout(r, 150));
              }
            });
          value = { html: await page.content(), url: page.url(), status: 200 };
        } finally {
          await context.close();
        }
      } else {
        const c = new AbortController(),
          t = setTimeout(() => c.abort(), Math.min(+o.timeout || 15000, 60000));
        try {
          const r = await fetch(url, {
            headers: {
              "user-agent": o.userAgent || "Mozilla/5.0 ScrapeFlow/2.3",
              accept: "text/html",
              ...(o.headers || {}),
            },
            signal: c.signal,
          });
          if (!r.ok) throw Error(`HTTP ${r.status} — ${r.statusText}`);
          value = { html: await r.text(), url: r.url, status: r.status };
        } finally {
          clearTimeout(t);
        }
      }
      if (o.cache !== false) pageCache.set(key, { time: Date.now(), value });
      return { ...value, retries: attempt };
    } catch (error) {
      lastError = error;
      if (o.renderJs && /closed|disconnected|Target page/i.test(error.message))
        chromePromise = undefined;
      if (attempt < (+o.retries || 2))
        await new Promise((r) =>
          setTimeout(r, Math.min(500 * 2 ** attempt, 5000)),
        );
    }
  }
  throw lastError;
}
function val($, root, f, base) {
  const n =
    !f.selector || f.selector === ":scope"
      ? $(root)
      : $(root).find(f.selector).first();
  if (!n.length) return f.defaultValue || "";
  let v =
    f.type === "html"
      ? n.html() || ""
      : f.type === "attribute"
        ? n.attr(f.attribute || "href") || ""
        : n.text();
  v = f.trim === false ? String(v) : clean(v);
  if (f.absoluteUrl && v) v = abs(v, base);
  if (f.regex)
    try {
      const m = v.match(new RegExp(f.regex, f.regexFlags || "i"));
      v = m ? (m[1] ?? m[0]) : "";
    } catch {}
  return (f.prefix || "") + v + (f.suffix || "");
}
app.post("/api/detect", async (req, res) => {
  try {
    const { url, ...o } = req.body;
    if (!/^https?:\/\//i.test(url || "")) throw Error("URL invalide");
    const l = await load(url, o),
      $ = cheerio.load(l.html),
      sels = [
        "article",
        "ul.product_list > li",
        ".product",
        ".product-item",
        ".card",
        ".item",
        ".quote",
        ".search-result",
        "[data-testid='product-card']",
        "table tbody tr",
        "main li",
      ],
      rank = sels
        .map((selector) => {
          const nodes = $(selector).filter(
              (_, el) =>
                !$(el).closest("nav,header,footer,[role='navigation']").length,
            ),
            count = nodes.length;
          if (count < 2) return { selector, count, score: 0, completeness: 0 };
          const sample = nodes.slice(0, Math.min(count, 12)),
            signals = [
              "h1,h2,h3,h4,.name,.title,.productname",
              "p,.description,.summary",
              ".price,[itemprop='price']",
              "img",
              "a[href]",
            ];
          const completeness =
            signals.reduce(
              (sum, s) =>
                sum + sample.filter((_, el) => $(el).find(s).length).length,
              0,
            ) /
            (sample.length * signals.length);
          const textQuality =
            sample.toArray().filter((el) => clean($(el).text()).length > 12)
              .length / sample.length;
          const score =
            Math.round(
              (Math.min(count, 50) * 0.8 +
                completeness * 55 +
                textQuality * 25) *
                10,
            ) / 10;
          return {
            selector,
            count,
            score,
            completeness: Math.round(completeness * 100),
          };
        })
        .filter((x) => x.count >= 2)
        .sort((a, b) => b.score - a.score),
      selector = rank[0]?.selector || "article",
      first = $(selector).first(),
      fields = [];
    const add = (name, s, type = "text", attribute, absoluteUrl = false) => {
      if (first.find(s).length)
        fields.push({
          name,
          selector: s,
          type,
          ...(attribute ? { attribute } : {}),
          absoluteUrl,
        });
    };
    add("titre", "h1,h2,h3,h4,.name,.title,.productname");
    add("description", "p,.description,.summary");
    add("texte", ".text,.content,.excerpt");
    add("auteur", ".author,.byline,[rel='author']");
    add("prix", '.price,[itemprop="price"]');
    add("image", "img", "attribute", "src", true);
    add("url", "a", "attribute", "href", true);
    if (!fields.length)
      fields.push({ name: "texte", selector: ":scope", type: "text" });
    res.json({
      selector,
      fields,
      candidates: rank.slice(0, 6),
      confidence: rank[0] ? Math.min(99, Math.round(rank[0].score)) : 0,
      title: clean($("title").first().text()),
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.name === "AbortError" ? "Délai dépassé." : e.message });
  }
});
app.post("/api/robots", async (req, res) => {
  try {
    res.json(
      await robotsAllowed(req.body.url, req.body.userAgent || "ScrapeFlow"),
    );
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.post("/api/test-selector", async (req, res) => {
  try {
    const { url, selector, limit = 8, ...o } = req.body;
    if (!selector) throw Error("Sélecteur requis");
    const l = await load(url, o),
      $ = cheerio.load(l.html);
    let nodes;
    try {
      nodes = $(selector);
    } catch {
      throw Error("Sélecteur CSS invalide");
    }
    const count = nodes.length,
      samples = nodes
        .slice(0, Math.min(+limit || 8, 20))
        .map((_, el) => ({
          tag: el.tagName || el.name || "",
          text: clean($(el).text()).slice(0, 220),
          html: $.html(el).slice(0, 500),
          attributes: Object.fromEntries(
            Object.entries(el.attribs || {}).slice(0, 12),
          ),
        }))
        .get(),
      quality =
        count === 0
          ? "empty"
          : count > 500
            ? "too-broad"
            : samples.filter((x) => x.text).length === 0
              ? "no-text"
              : "good",
      advice =
        quality === "empty"
          ? "Aucun élément ne correspond. Vérifiez la classe, l’ID ou activez le rendu JavaScript."
          : quality === "too-broad"
            ? "Le sélecteur est trop large. Ajoutez un parent ou une classe plus spécifique."
            : quality === "no-text"
              ? "Les éléments sont présents mais sans texte. Extrayez un attribut ou ciblez un enfant."
              : "Sélecteur exploitable.";
    res.json({
      count,
      samples,
      quality,
      advice,
      url: l.url,
      cached: !!l.cached,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.post("/api/visual-inspect", async (req, res) => {
  let context;
  try {
    const { url, respectRobots = true } = req.body;
    if (respectRobots) {
      const check = await robotsAllowed(url, "ScrapeFlow");
      if (!check.allowed)
        throw Error(`Interdit par robots.txt : ${check.rule.path}`);
    }
    const { chromium } = await import("playwright-core");
    chromePromise ||= chromium.launch({
      headless: true,
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      args: ["--no-sandbox"],
    });
    const browser = await chromePromise;
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent: "Mozilla/5.0 ScrapeFlow/2.4",
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(800);
    await page.evaluate(() =>
      document
        .querySelector(
          "article, main li, ul.product_list > li, .product, .product-item, .card, .item, .quote, [data-testid]",
        )
        ?.scrollIntoView({ block: "start" }),
    );
    await page.waitForTimeout(250);
    const elements = await page.evaluate(() => {
      const candidates = [
          ...document.querySelectorAll(
            "article, main li, ul.product_list > li, .product, .product-item, .card, .item, .quote, [data-testid]",
          ),
        ],
        seen = new Set(),
        out = [];
      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        if (r.width < 80 || r.height < 35 || r.bottom < 0 || r.top > 800)
          continue;
        let selector = el.tagName.toLowerCase();
        if (el.id) selector = `#${CSS.escape(el.id)}`;
        else {
          const classes = [...el.classList]
            .filter((x) => /^[a-zA-Z_][\w-]*$/.test(x))
            .slice(0, 2);
          if (classes.length)
            selector += classes.map((x) => `.${CSS.escape(x)}`).join("");
          else if (el.getAttribute("data-testid"))
            selector = `[data-testid=\"${el.getAttribute("data-testid")}\"]`;
        }
        if (seen.has(selector)) continue;
        seen.add(selector);
        out.push({
          selector,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          text: (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 100),
          tag: el.tagName.toLowerCase(),
          matches: document.querySelectorAll(selector).length,
        });
        if (out.length >= 80) break;
      }
      return out;
    });
    const image = (
      await page.screenshot({ type: "jpeg", quality: 72 })
    ).toString("base64");
    res.json({
      image: `data:image/jpeg;base64,${image}`,
      width: 1280,
      height: 800,
      elements,
      url: page.url(),
      title: await page.title(),
    });
  } catch (e) {
    if (/closed|disconnected/i.test(e.message)) chromePromise = undefined;
    res.status(400).json({ error: e.message });
  } finally {
    if (context) await context.close();
  }
});
app.post("/api/transform", (req, res) => {
  try {
    let rows = Array.isArray(req.body.rows)
      ? structuredClone(req.body.rows)
      : [];
    const transforms = req.body.transforms || [],
      stats = [];
    for (const t of transforms) {
      let changed = 0;
      if (t.operation === "drop-empty") {
        const before = rows.length;
        rows = rows.filter((r) => clean(r[t.column]) !== "");
        stats.push({
          operation: t.operation,
          column: t.column,
          changed: before - rows.length,
        });
        continue;
      }
      rows = rows.map((row) => {
        const old = row[t.column];
        let value = old;
        try {
          if (t.operation === "trim") value = clean(old);
          else if (t.operation === "lowercase")
            value = String(old ?? "").toLowerCase();
          else if (t.operation === "uppercase")
            value = String(old ?? "").toUpperCase();
          else if (t.operation === "number")
            value = Number(
              String(old ?? "")
                .replace(/\s/g, "")
                .replace(",", ".")
                .replace(/[^0-9.-]/g, ""),
            );
          else if (t.operation === "price")
            value = Number(
              String(old ?? "")
                .replace(/\s/g, "")
                .replace(",", ".")
                .replace(/[^0-9.-]/g, ""),
            );
          else if (t.operation === "replace")
            value = String(old ?? "")
              .split(t.search || "")
              .join(t.value || "");
          else if (t.operation === "regex")
            value = String(old ?? "").replace(
              new RegExp(t.search || "", t.flags || "gi"),
              t.value || "",
            );
          else if (t.operation === "date") {
            const d = new Date(old);
            value = Number.isNaN(d.valueOf()) ? old : d.toISOString();
          } else if (t.operation === "prefix")
            value = (t.value || "") + String(old ?? "");
          else if (t.operation === "suffix")
            value = String(old ?? "") + (t.value || "");
        } catch {}
        if (value !== old) changed++;
        return { ...row, [t.column]: value };
      });
      stats.push({ operation: t.operation, column: t.column, changed });
    }
    res.json({ rows, count: rows.length, stats });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.post("/api/compare", (req, res) => {
  const { key, rows = [] } = req.body,
    previous = snapshots.get(key) || [],
    signature = (r) => JSON.stringify(r),
    before = new Set(previous.map(signature)),
    now = new Set(rows.map(signature)),
    added = rows.filter((r) => !before.has(signature(r))),
    removed = previous.filter((r) => !now.has(signature(r)));
  snapshots.set(key, rows);
  fs.mkdirSync(new URL("./work/", import.meta.url), { recursive: true });
  fs.writeFileSync(
    snapshotFile,
    JSON.stringify(Object.fromEntries(snapshots), null, 2),
  );
  res.json({
    firstRun: !previous.length,
    added,
    removed,
    addedCount: added.length,
    removedCount: removed.length,
    previousCount: previous.length,
    currentCount: rows.length,
    persistent: true,
  });
});
app.post("/api/enrich", async (req, res) => {
  const start = Date.now();
  try {
    const {
      rows = [],
      urlField = "url",
      detailFields = [],
      limit = 50,
      delay = 150,
      ...o
    } = req.body;
    if (!detailFields.length)
      throw Error("Ajoutez au moins un champ de détail.");
    const output = [],
      errors = [];
    for (const row of rows.slice(0, Math.min(+limit || 50, 500))) {
      const url = row[urlField];
      if (!/^https?:\/\//i.test(url || "")) {
        output.push(row);
        errors.push({ url, error: `Champ ${urlField} absent ou invalide` });
        continue;
      }
      try {
        const l = await load(url, o),
          $ = cheerio.load(l.html),
          root = $.root(),
          details = Object.fromEntries(
            detailFields.map((f) => [f.name, val($, root, f, l.url)]),
          );
        output.push({ ...row, ...details, __detailSource: l.url });
      } catch (e) {
        output.push(row);
        errors.push({ url, error: e.message });
      }
      if (delay)
        await new Promise((r) => setTimeout(r, Math.min(+delay, 5000)));
    }
    output.push(...rows.slice(Math.min(+limit || 50, 500)));
    res.json({
      rows: output,
      count: output.length,
      enriched: Math.min(rows.length, +limit || 50) - errors.length,
      errors,
      duration: Date.now() - start,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.post("/api/crawl", async (req, res) => {
  const start = Date.now();
  try {
    const {
      url,
      selector = "article",
      fields = [],
      maxPages = 10,
      maxRows = 1000,
      maxDepth = 2,
      includePattern = "",
      excludePattern = "",
      delay = 150,
      deduplicate = true,
      ...o
    } = req.body;
    if (!/^https?:\/\//i.test(url || "")) throw Error("URL invalide");
    const origin = new URL(url).origin,
      inc = includePattern ? new RegExp(includePattern, "i") : null,
      exc = excludePattern ? new RegExp(excludePattern, "i") : null,
      queue = [{ url, depth: 0 }],
      seen = new Set(),
      trail = [],
      errors = [];
    let rows = [];
    while (
      queue.length &&
      trail.length < Math.min(+maxPages || 10, 100) &&
      rows.length < Math.min(+maxRows || 1000, 20000)
    ) {
      const job = queue.shift();
      if (seen.has(job.url)) continue;
      seen.add(job.url);
      try {
        const l = await load(job.url, o),
          $ = cheerio.load(l.html);
        trail.push(l.url);
        $(selector).each((_, root) => {
          if (rows.length < maxRows)
            rows.push({
              __source: l.url,
              ...Object.fromEntries(
                fields.map((f) => [f.name, val($, root, f, l.url)]),
              ),
            });
        });
        if (job.depth < maxDepth)
          $("a[href]").each((_, a) => {
            const next = abs($(a).attr("href"), l.url);
            try {
              const u = new URL(next);
              if (
                u.origin === origin &&
                !seen.has(u.href) &&
                !u.hash &&
                (!inc || inc.test(u.pathname)) &&
                (!exc || !exc.test(u.pathname)) &&
                !/\.(jpg|png|gif|svg|pdf|zip)$/i.test(u.pathname)
              )
                queue.push({ url: u.href, depth: job.depth + 1 });
            } catch {}
          });
      } catch (e) {
        errors.push({ url: job.url, error: e.message });
      }
      if (delay)
        await new Promise((r) => setTimeout(r, Math.min(+delay, 5000)));
    }
    rows = rows.filter((row) =>
      Object.entries(row).some(
        ([key, value]) => key !== "__source" && clean(value) !== "",
      ),
    );
    if (deduplicate) {
      const s = new Set();
      rows = rows.filter((r) => {
        const k = JSON.stringify({ ...r, __source: undefined });
        if (s.has(k)) return false;
        s.add(k);
        return true;
      });
    }
    res.json({
      rows,
      count: rows.length,
      pages: trail.length,
      status: 200,
      duration: Date.now() - start,
      trail,
      errors,
      queued: queue.length,
      pagination: "crawl en largeur",
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.post("/api/scrape", async (req, res) => {
  const start = Date.now();
  try {
    const {
      url,
      selector = "article",
      fields = [],
      maxPages = 1,
      maxRows = 500,
      nextSelector = "",
      deduplicate = true,
      ...o
    } = req.body;
    if (!/^https?:\/\//i.test(url || "")) throw Error("URL invalide");
    if (!fields.length) throw Error("Ajoutez au moins un champ.");
    let current = url,
      page = 0,
      rows = [],
      status = 200;
    const visited = new Set(),
      trail = [];
    while (
      current &&
      page < Math.min(+maxPages || 1, 25) &&
      rows.length < Math.min(+maxRows || 500, 10000)
    ) {
      if (visited.has(current)) break;
      visited.add(current);
      trail.push(current);
      page++;
      const l = await load(current, o);
      status = l.status;
      const $ = cheerio.load(l.html);
      $(selector).each((_, root) => {
        if (rows.length < maxRows)
          rows.push(
            Object.fromEntries(
              fields.map((f) => [f.name, val($, root, f, l.url)]),
            ),
          );
      });
      let href = nextSelector ? $(nextSelector).first().attr("href") : "";
      if (!href) {
        const automatic = [
          'link[rel="next"]',
          'a[rel="next"]',
          "a.next",
          ".next a",
          "li.next a",
          ".pagination-next a",
          'a[aria-label="Next"]',
          'a[aria-label="Suivant"]',
        ];
        for (const s of automatic) {
          href = $(s).first().attr("href");
          if (href) break;
        }
        if (!href) {
          $("a").each((_, a) => {
            if (
              !href &&
              /^(suivant|next|›|»|page suivante)$/i.test(clean($(a).text()))
            )
              href = $(a).attr("href");
          });
        }
      }
      const candidate = href ? abs(href, l.url) : "";
      current = candidate && !visited.has(candidate) ? candidate : "";
    }
    rows = rows.filter((row) =>
      Object.entries(row).some(
        ([key, value]) => key !== "__source" && clean(value) !== "",
      ),
    );
    if (deduplicate) {
      const seen = new Set();
      rows = rows.filter((r) => {
        const k = JSON.stringify(r);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    res.json({
      rows,
      count: rows.length,
      pages: page,
      status,
      duration: Date.now() - start,
      trail,
      pagination:
        page > 1
          ? "enchaînée"
          : maxPages > 1
            ? "aucune page suivante détectée"
            : "désactivée",
    });
  } catch (e) {
    res
      .status(400)
      .json({ error: e.name === "AbortError" ? "Délai dépassé." : e.message });
  }
});
app.get("/api/health", (_, r) => r.json({ ok: true, version: "2.1" }));
const runningSchedules = new Set();
setInterval(async () => {
  for (const s of schedules.filter(
    (x) => x.enabled && new Date(x.nextRun) <= new Date(),
  )) {
    if (runningSchedules.has(s.id)) continue;
    runningSchedules.add(s.id);
    const recipe = recipes.find((x) => x.id === s.recipeId);
    try {
      if (!recipe) throw Error("Recette supprimée");
      const data = await runRecipe(recipe, s);
      s.lastStatus = "success";
      s.lastCount = data.count || data.rows?.length || 0;
      s.lastError = "";
    } catch (e) {
      s.lastStatus = "error";
      s.lastError = e.message;
    } finally {
      s.lastRun = new Date().toISOString();
      s.nextRun = new Date(
        Date.now() + s.intervalMinutes * 60000,
      ).toISOString();
      runningSchedules.delete(s.id);
      saveSchedules();
    }
  }
}, 15000).unref();
app.listen(4174, () => console.log("ScrapeFlow API v2.1"));
