import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Braces,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Code2,
  Download,
  ExternalLink,
  FileJson,
  Globe2,
  History,
  LayoutDashboard,
  Play,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Table2,
  Trash2,
  Zap,
} from "lucide-react";
import "./style.css";
import "./enhancements.css";
import "./journal.css";
import "./recipes.css";
import "./tutorials.css";
import "./help.css";
import "./selector-debug.css";
import "./visual-selector.css";
import "./apex-theme.css";
import apexLogo from "./assets/apexflow-logo.png";
const seed = [
  [
    "Saison 1",
    "Ce que 10 ans de formation m’ont appris",
    "Poser l’autorité, raconter l’expérience terrain et installer une voix crédible.",
    "10 épisodes",
  ],
  [
    "Saison 2",
    "Les erreurs fréquentes en formation",
    "Créer des posts utiles, directs, partageables et applicables immédiatement.",
    "10 épisodes",
  ],
  [
    "Saison 3",
    "La pédagogie terrain",
    "Montrer des méthodes concrètes et pratiques issues du quotidien de formateur.",
    "10 épisodes",
  ],
  [
    "Saison 4",
    "Les apprenants qu’on oublie",
    "Créer une saison humaine et mémorable sur les profils invisibles en formation.",
    "10 épisodes",
  ],
  [
    "Saison 5",
    "Certification, titres pro et référentiels",
    "Parler aux OF, formateurs et responsables pédagogiques sur la préparation aux certifications.",
    "10 épisodes",
  ],
  [
    "Saison 6",
    "Formation numérique, IA et automatisation",
    "Te positionner comme formateur moderne, capable d’utiliser les outils sans perdre l’humain.",
    "10 épisodes",
  ],
  [
    "Saison 7",
    "La réalité des organismes de formation",
    "Montrer une vision système : qualité, organisation, coordination, outils et contraintes terrain.",
    "10 épisodes",
  ],
  [
    "Saison 8",
    "Le formateur de demain",
    "Finir avec une saison visionnaire et positionner ton expertise sur l’avenir du métier.",
    "10 épisodes",
  ],
].map((x, i) => ({
  id: i + 1,
  saison: x[0],
  titre: x[1],
  description: x[2],
  episodes: x[3],
}));
const defaults = [
  { name: "saison", selector: ".edition", type: "text" },
  { name: "titre", selector: ".name", type: "text" },
  {
    name: "description",
    selector: "a.productname",
    type: "attribute",
    attribute: "href",
  },
  { name: "episodes", selector: ".pricecontainer", type: "text" },
];
function App() {
  const [url, setUrl] = useState("https://www.cards-capital.com/"),
    [selector, setSelector] = useState("ul.product_list > li"),
    [fields, setFields] = useState(defaults),
    [rows, setRows] = useState([]),
    [running, setRunning] = useState(false),
    [done, setDone] = useState(false),
    [query, setQuery] = useState(""),
    [tab, setTab] = useState("Données"),
    [advanced, setAdvanced] = useState(false),
    [maxPages, setMaxPages] = useState(5),
    [maxRows, setMaxRows] = useState(500),
    [nextSelector, setNextSelector] = useState(""),
    [deduplicate, setDeduplicate] = useState(true),
    [message, setMessage] = useState("Systèmes opérationnels"),
    [meta, setMeta] = useState(null),[runs,setRuns]=useState([]);
  const [crawlMode, setCrawlMode] = useState(false),
    [maxDepth, setMaxDepth] = useState(2),
    [includePattern, setIncludePattern] = useState(""),
    [excludePattern, setExcludePattern] = useState(""),
    [delay, setDelay] = useState(150),
    [renderJs,setRenderJs]=useState(false),[waitForSelector,setWaitForSelector]=useState(""),[scroll,setScroll]=useState(false),[retries,setRetries]=useState(2),[cache,setCache]=useState(true),[respectRobots,setRespectRobots]=useState(true);
  const [enrich,setEnrich]=useState(false),[urlField,setUrlField]=useState("url"),[detailLimit,setDetailLimit]=useState(25),[detailFields,setDetailFields]=useState([{name:"detail_titre",selector:"h1",type:"text"},{name:"detail_description",selector:".description,[itemprop='description'],main p",type:"text"}]);
  const [transforms,setTransforms]=useState([]);
  const [recipes,setRecipes]=useState([]),[recipeName,setRecipeName]=useState(""),[selectedRecipeId,setSelectedRecipeId]=useState(""),[scheduleMinutes,setScheduleMinutes]=useState(60),[schedules,setSchedules]=useState([]);
  const [tutorialOpen,setTutorialOpen]=useState(false),[tutorial,setTutorial]=useState(0);
  const [selectorTest,setSelectorTest]=useState(null),[testingSelector,setTestingSelector]=useState(false);
  const [visualOpen,setVisualOpen]=useState(false),[visualData,setVisualData]=useState(null),[visualLoading,setVisualLoading]=useState(false),[hoveredVisual,setHoveredVisual]=useState(null);
  const columns = [...fields,...(enrich?detailFields:[])].map((f) => f.name).filter(Boolean);
  const shown = useMemo(
    () =>
      rows.filter((r) =>
        Object.values(r).join(" ").toLowerCase().includes(query.toLowerCase()),
      ),
    [rows, query],
  );
  const scrape = async () => {
    setRunning(true);
    setDone(false);
    try {
      const r = await fetch(
        `http://localhost:4174/api/${crawlMode ? "crawl" : "scrape"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            url,
            selector,
            fields,
            maxPages,
            maxRows,
            nextSelector,
            deduplicate,
            maxDepth,
            includePattern,
            excludePattern,
            delay,
            renderJs,
            waitForSelector,
            scroll,
            retries,
            cache,
            respectRobots,
          }),
        },
      );
      let data = await r.json();
      if (!r.ok) throw Error(data.error);
      if(enrich&&data.rows.length){const er=await fetch("http://localhost:4174/api/enrich",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rows:data.rows,urlField,detailFields,limit:detailLimit,delay,renderJs,retries,cache})});const ed=await er.json();if(!er.ok)throw Error(ed.error);data={...data,rows:ed.rows,count:ed.count,enrichment:ed};}
      if(transforms.length&&data.rows.length){const tr=await fetch("http://localhost:4174/api/transform",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({rows:data.rows,transforms})});const td=await tr.json();if(!tr.ok)throw Error(td.error);data={...data,rows:td.rows,count:td.count,transformStats:td.stats};}
      const comparison=await fetch("http://localhost:4174/api/compare",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({key:`${url}|${selector}`,rows:data.rows})}).then(x=>x.json());
      setRows(data.rows.map((r, i) => ({ id: i + 1, ...r })));
      setMeta({...data,comparison});
      setMessage(
        comparison.firstRun?`${data.count} lignes · référence enregistrée`:`${data.count} lignes · +${comparison.addedCount} / -${comparison.removedCount} changements`,
      );
      setDone(true);
      fetch("http://localhost:4174/api/runs?limit=20").then(r=>r.json()).then(d=>setRuns(d.runs||[]));
    } catch (e) {
      alert(e.message);
    } finally {
      setRunning(false);
    }
  };
  const detect = async () => {
    setRunning(true);
    setMessage("Détection automatique…");
    try {
      const r = await fetch("http://localhost:4174/api/detect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, renderJs, waitForSelector, scroll, retries, cache, respectRobots }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setSelector(d.selector);
      setFields(d.fields);
      setMessage(`${d.fields.length} champs détectés · confiance ${d.confidence}%`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setRunning(false);
    }
  };
  const exportIt = (type) => {
    const text =
      type === "json"
        ? JSON.stringify(rows, null, 2)
        : [
            Object.keys(rows[0] || {}).join(","),
            ...rows.map((r) =>
              Object.values(r)
                .map((v) => `"${String(v).replaceAll('"', '""')}"`)
                .join(","),
            ),
          ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `scrapeflow.${type}`;
    a.click();
  };
  const retryRun=async(id)=>{setMessage("Relance en cours…");const r=await fetch(`http://localhost:4174/api/runs/${id}/retry`,{method:"POST"});const d=await r.json();setMessage(r.ok?`Relance terminée · ${d.count||0} lignes`:d.error);const logs=await fetch("http://localhost:4174/api/runs?limit=20").then(x=>x.json());setRuns(logs.runs||[])};
  const refreshRecipes=()=>fetch("http://localhost:4174/api/recipes").then(r=>r.json()).then(d=>setRecipes(d.recipes||[]));
  const saveRecipe=async()=>{if(!recipeName.trim())return setMessage("Donnez un nom à la recette");const config={url,selector,fields,maxPages,maxRows,nextSelector,deduplicate,maxDepth,includePattern,excludePattern,delay,renderJs,waitForSelector,scroll,retries,cache,respectRobots,crawlMode,enrich,urlField,detailLimit,detailFields,transforms};const r=await fetch("http://localhost:4174/api/recipes",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:recipeName,config})});const d=await r.json();if(r.ok)setSelectedRecipeId(d.recipe.id);setMessage(r.ok?`Recette « ${d.recipe.name} » enregistrée`:d.error);refreshRecipes()};
  const loadRecipe=recipe=>{const c=recipe.config||{};setRecipeName(recipe.name);setUrl(c.url||"");setSelector(c.selector||"article");setFields(c.fields||[]);setMaxPages(c.maxPages||1);setMaxRows(c.maxRows||500);setNextSelector(c.nextSelector||"");setDeduplicate(c.deduplicate!==false);setMaxDepth(c.maxDepth||2);setIncludePattern(c.includePattern||"");setExcludePattern(c.excludePattern||"");setDelay(c.delay??150);setRenderJs(!!c.renderJs);setWaitForSelector(c.waitForSelector||"");setScroll(!!c.scroll);setRetries(c.retries??2);setCache(c.cache!==false);setRespectRobots(c.respectRobots!==false);setCrawlMode(!!c.crawlMode);setEnrich(!!c.enrich);setUrlField(c.urlField||"url");setDetailLimit(c.detailLimit||25);setDetailFields(c.detailFields||[]);setTransforms(c.transforms||[]);setMessage(`Recette « ${recipe.name} » chargée`)};
  const refreshSchedules=()=>fetch("http://localhost:4174/api/schedules").then(r=>r.json()).then(d=>setSchedules(d.schedules||[]));
  const createSchedule=async()=>{if(!selectedRecipeId)return setMessage("Enregistrez ou chargez une recette d’abord");const r=await fetch("http://localhost:4174/api/schedules",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({recipeId:selectedRecipeId,intervalMinutes:scheduleMinutes})}),d=await r.json();setMessage(r.ok?`Planification créée · toutes les ${scheduleMinutes} min`:d.error);refreshSchedules()};
  const runSchedule=async id=>{setMessage("Exécution planifiée lancée…");const r=await fetch(`http://localhost:4174/api/schedules/${id}/run`,{method:"POST"}),d=await r.json();setMessage(r.ok?`Planification terminée · ${d.data.count||0} lignes`:d.error);refreshSchedules()};
  const testSelector=async()=>{setTestingSelector(true);setSelectorTest(null);try{const r=await fetch("http://localhost:4174/api/test-selector",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url,selector,renderJs,waitForSelector,scroll,retries,cache,respectRobots})}),d=await r.json();setSelectorTest(r.ok?d:{quality:"error",advice:d.error,samples:[],count:0})}finally{setTestingSelector(false)}};
  const openVisual=async()=>{setVisualOpen(true);setVisualLoading(true);setVisualData(null);const r=await fetch("http://localhost:4174/api/visual-inspect",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url,respectRobots})}),d=await r.json();setVisualData(r.ok?d:{error:d.error});setVisualLoading(false)};
  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="mark">
            <img src={apexLogo} alt="ApeXtract" />
          </div>
          <div>
            <b>ApeXtract</b>
            <small>BY APEXPLOIT</small>
          </div>
        </div>
        <nav>
          <span>ESPACE DE TRAVAIL</span>
          <button className="active">
            <LayoutDashboard />
            Nouveau scraping
          </button>
          <button>
            <History />
            Historique <i>12</i>
          </button>
          <button>
            <Code2 />
            Sélecteurs
          </button>
          <span>OUTILS</span>
          <button>
            <Braces />
            Nettoyage des données
          </button>
          <button>
            <FileJson />
            API & Webhooks
          </button>
          <button onClick={()=>setTutorialOpen(true)}><BookOpen/>Tutoriels</button>
        </nav>
        <div className="usage">
          <div>
            <span>Utilisation</span>
            <b>68%</b>
          </div>
          <progress value="68" max="100" />
          <small>6 840 / 10 000 lignes</small>
        </div>
        <div className="user">
          <div>YP</div>
          <p>
            <b>ApeXploit</b>
            <small>Developer Console</small>
          </p>
          <Settings2 />
        </div>
      </aside>
      <main>
        <header>
          <div>
            <p className="eyebrow">
              <Sparkles />
              APE X DATA / NOUVELLE EXTRACTION
            </p>
            <h1>Dominez le web. Extrayez la donnée.</h1>
            <p>
              Configurez votre source, choisissez les éléments et laissez
              ApeXtract orchestrer le reste.
            </p>
          </div>
          <div className="status">
            <span></span>
            {message}
          </div>
          <button className="help-link" onClick={()=>setTutorialOpen(true)}><BookOpen/>Tutoriels</button>
        </header>
        <section className="source card">
          <div className="step">1</div>
          <div className="grow">
            <div className="section-title">
              <div>
                <h2>Source à analyser</h2>
                <p>Indiquez l’URL de la page que vous souhaitez extraire.</p>
              </div>
              <div className="safe">
                <ShieldCheck />
                Navigation sécurisée
              </div>
            </div>
            <div className="urlbox">
              <Globe2 />
              <input value={url} onChange={(e) => setUrl(e.target.value)} />
              <button onClick={scrape} disabled={running}>
                {running ? (
                  <>
                    <Activity className="spin" />
                    Analyse…
                  </>
                ) : (
                  <>
                    <Play />
                    Lancer l’extraction
                  </>
                )}
              </button>
            </div>
            <div className="chips">
              <span>
                Pages : <b>{maxPages}</b>
              </span>
              <span>
                Limite : <b>{maxRows} lignes</b>
              </span>
              <span>
                Mode : <b>{crawlMode ? "Exploration du site" : "Pagination"}</b>
              </span>
            </div>
          </div>
        </section>
        <div className="grid">
          <section className="card config">
            <div className="step">2</div>
            <div className="section-title">
              <div>
                <h2>Recette d’extraction</h2>
                <p>Définissez les éléments à collecter.</p>
              </div>
              <button className="ghost" onClick={detect} disabled={running}>
                <Sparkles />
                Détection auto
              </button>
            </div>
            <label>
              ÉLÉMENT RÉPÉTÉ (CSS)
              <div className="code-input">
                <Code2 />
                <input
                  value={selector}
                  onChange={(e) => setSelector(e.target.value)}
                />
                <Check />
              </div>
              <button type="button" className="test-selector" onClick={testSelector} disabled={testingSelector}>{testingSelector?"Test en cours…":"Tester ce sélecteur"}</button>
              <button type="button" className="test-selector visual-button" onClick={openVisual}>Choisir visuellement</button>
              {selectorTest&&<div className={`selector-report ${selectorTest.quality}`}><div><b>{selectorTest.count} correspondance{selectorTest.count>1?"s":""}</b><span>{selectorTest.advice}</span></div>{selectorTest.samples?.length>0&&<div className="selector-samples">{selectorTest.samples.slice(0,4).map((s,i)=><code key={i}>&lt;{s.tag}&gt; {s.text||JSON.stringify(s.attributes)}</code>)}</div>}</div>}
            </label>
            <div className="fields-head">
              <b>CHAMPS À EXTRAIRE</b>
              <span>{fields.length} champs</span>
            </div>
            <div className="recipe-bar"><input placeholder="Nom de la recette" value={recipeName} onChange={e=>setRecipeName(e.target.value)}/><button onClick={saveRecipe}>Enregistrer</button><select defaultValue="" onFocus={refreshRecipes} onChange={e=>{setSelectedRecipeId(e.target.value);const r=recipes.find(x=>x.id===e.target.value);if(r)loadRecipe(r)}}><option value="">Charger une recette…</option>{recipes.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select><input type="number" min="1" value={scheduleMinutes} onChange={e=>setScheduleMinutes(+e.target.value)} title="Intervalle en minutes"/><button onClick={createSchedule}>Planifier</button><button className="wide-button" onClick={refreshSchedules}>Voir les planifications ({schedules.length})</button>{schedules.map(s=><div className="schedule-row" key={s.id}><span>{s.recipeName} · {s.intervalMinutes} min · {s.lastStatus}</span><button onClick={()=>runSchedule(s.id)}>Exécuter</button></div>)}</div>
            {fields.map((f, i) => (
              <div className="field" key={i}>
                <span className="drag">⠿</span>
                <div>
                  <small>NOM DU CHAMP</small>
                  <input
                    value={f.name}
                    onChange={(e) =>
                      setFields(
                        fields.map((x, j) =>
                          j === i ? { ...x, name: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
                <select
                  value={f.type}
                  onChange={(e) =>
                    setFields(
                      fields.map((x, j) =>
                        j === i ? { ...x, type: e.target.value } : x,
                      ),
                    )
                  }
                >
                  <option value="text">Texte</option>
                  <option value="attribute">Attribut</option>
                  <option value="html">HTML</option>
                </select>
                {f.type === "attribute" && (
                  <input
                    className="attr"
                    placeholder="href, src…"
                    value={f.attribute || ""}
                    onChange={(e) =>
                      setFields(
                        fields.map((x, j) =>
                          j === i ? { ...x, attribute: e.target.value } : x,
                        ),
                      )
                    }
                  />
                )}
                <div>
                  <small>SÉLECTEUR CSS</small>
                  <input
                    value={f.selector}
                    onChange={(e) =>
                      setFields(
                        fields.map((x, j) =>
                          j === i ? { ...x, selector: e.target.value } : x,
                        ),
                      )
                    }
                  />
                </div>
                <button
                  onClick={() => setFields(fields.filter((_, j) => j !== i))}
                >
                  <Trash2 />
                </button>
              </div>
            ))}
            <button
              className="add"
              onClick={() =>
                setFields([
                  ...fields,
                  {
                    name: "champ_" + (fields.length + 1),
                    selector: ".selector",
                    type: "text",
                  },
                ])
              }
            >
              <Plus />
              Ajouter un champ
            </button>
            <button className="options" onClick={() => setAdvanced(!advanced)}>
              <b>Options avancées</b>
              <ChevronDown />
            </button>
            {advanced && (
              <div className="advanced">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={crawlMode}
                    onChange={(e) => setCrawlMode(e.target.checked)}
                  />{" "}
                  Explorer les liens internes (file d’URLs)
                </label>
                <label className="check"><input type="checkbox" checked={renderJs} onChange={e=>setRenderJs(e.target.checked)}/> Rendu JavaScript avec Chrome</label>
                {renderJs&&<><label className="wide">ATTENDRE LE SÉLECTEUR<input placeholder="ex. .products-loaded" value={waitForSelector} onChange={e=>setWaitForSelector(e.target.value)}/></label><label className="check"><input type="checkbox" checked={scroll} onChange={e=>setScroll(e.target.checked)}/> Défilement automatique</label></>}
                <label>REPRISES SUR ERREUR<input type="number" min="0" max="5" value={retries} onChange={e=>setRetries(+e.target.value)}/></label>
                <label className="check"><input type="checkbox" checked={cache} onChange={e=>setCache(e.target.checked)}/> Cache des pages (5 min)</label>
                <label className="check"><input type="checkbox" checked={respectRobots} onChange={e=>setRespectRobots(e.target.checked)}/> Respecter robots.txt</label>
                <label className="check"><input type="checkbox" checked={enrich} onChange={e=>setEnrich(e.target.checked)}/> Visiter chaque fiche et enrichir les lignes</label>
                {enrich&&<><label>COLONNE URL<input value={urlField} onChange={e=>setUrlField(e.target.value)}/></label><label>FICHES MAX<input type="number" min="1" max="500" value={detailLimit} onChange={e=>setDetailLimit(+e.target.value)}/></label>{detailFields.map((f,i)=><React.Fragment key={i}><label>CHAMP DÉTAIL<input value={f.name} onChange={e=>setDetailFields(detailFields.map((x,j)=>j===i?{...x,name:e.target.value}:x))}/></label><label>SÉLECTEUR FICHE<input value={f.selector} onChange={e=>setDetailFields(detailFields.map((x,j)=>j===i?{...x,selector:e.target.value}:x))}/></label></React.Fragment>)}</>}
                <label className="wide transform-title">TRANSFORMATIONS ({transforms.length})</label>{transforms.map((t,i)=><React.Fragment key={i}><label>COLONNE<input value={t.column} onChange={e=>setTransforms(transforms.map((x,j)=>j===i?{...x,column:e.target.value}:x))}/></label><label>OPÉRATION<select value={t.operation} onChange={e=>setTransforms(transforms.map((x,j)=>j===i?{...x,operation:e.target.value}:x))}><option value="trim">Nettoyer espaces</option><option value="price">Prix → nombre</option><option value="number">Texte → nombre</option><option value="lowercase">Minuscules</option><option value="uppercase">Majuscules</option><option value="replace">Remplacer</option><option value="regex">Regex</option><option value="date">Date ISO</option><option value="drop-empty">Supprimer si vide</option><option value="prefix">Préfixe</option><option value="suffix">Suffixe</option></select></label>{["replace","regex"].includes(t.operation)&&<label>RECHERCHE<input value={t.search||""} onChange={e=>setTransforms(transforms.map((x,j)=>j===i?{...x,search:e.target.value}:x))}/></label>}{["replace","regex","prefix","suffix"].includes(t.operation)&&<label>VALEUR<input value={t.value||""} onChange={e=>setTransforms(transforms.map((x,j)=>j===i?{...x,value:e.target.value}:x))}/></label>}<button className="remove-transform" onClick={()=>setTransforms(transforms.filter((_,j)=>j!==i))}>Retirer</button></React.Fragment>)}<button className="add wide" onClick={()=>setTransforms([...transforms,{column:columns[0]||"titre",operation:"trim"}])}><Plus/>Ajouter une transformation</button>
                <label>
                  PAGES MAX
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={maxPages}
                    onChange={(e) => setMaxPages(+e.target.value)}
                  />
                </label>
                <label>
                  LIGNES MAX
                  <input
                    type="number"
                    min="1"
                    max="20000"
                    value={maxRows}
                    onChange={(e) => setMaxRows(+e.target.value)}
                  />
                </label>
                {crawlMode ? (
                  <>
                    <label>
                      PROFONDEUR
                      <input
                        type="number"
                        min="0"
                        max="5"
                        value={maxDepth}
                        onChange={(e) => setMaxDepth(+e.target.value)}
                      />
                    </label>
                    <label>
                      PAUSE (MS)
                      <input
                        type="number"
                        min="0"
                        max="5000"
                        value={delay}
                        onChange={(e) => setDelay(+e.target.value)}
                      />
                    </label>
                    <label className="wide">
                      INCLURE — REGEX
                      <input
                        placeholder="ex. /produits/|/catalogue/"
                        value={includePattern}
                        onChange={(e) => setIncludePattern(e.target.value)}
                      />
                    </label>
                    <label className="wide">
                      EXCLURE — REGEX
                      <input
                        placeholder="ex. /compte|/panier|/contact"
                        value={excludePattern}
                        onChange={(e) => setExcludePattern(e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <label className="wide">
                    SÉLECTEUR PAGE SUIVANTE (OPTIONNEL)
                    <input
                      placeholder="Vide = détection automatique · ex. a.next"
                      value={nextSelector}
                      onChange={(e) => setNextSelector(e.target.value)}
                    />
                  </label>
                )}
                <label className="check">
                  <input
                    type="checkbox"
                    checked={deduplicate}
                    onChange={(e) => setDeduplicate(e.target.checked)}
                  />{" "}
                  Supprimer les doublons
                </label>
              </div>
            )}
          </section>
          <section className="preview card">
            <div className="preview-head">
              <div>
                <h2>Aperçu des données</h2>
                <p>{rows.length} éléments détectés sur la page</p>
              </div>
              {done && (
                <span>
                  <Check />
                  Extraction réussie
                </span>
              )}
            </div>
            <div className="tabs">
              <button
                className={tab === "Données" ? "active" : ""}
                onClick={() => setTab("Données")}
              >
                <Table2 />
                Données
              </button>
              <button
                className={tab === "JSON" ? "active" : ""}
                onClick={() => setTab("JSON")}
              >
                <Braces />
                JSON
              </button>
              <button className={tab === "Journal" ? "active" : ""} onClick={()=>{setTab("Journal");fetch("http://localhost:4174/api/runs?limit=20").then(r=>r.json()).then(d=>setRuns(d.runs||[]))}}><Clock3/>Journal</button>
            </div>
            {tab === "Données" ? (
              <>
                <div className="toolbar">
                  <div>
                    <Search />
                    <input
                      placeholder="Filtrer les résultats…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <button onClick={() => exportIt("csv")}>
                    <Download />
                    CSV
                  </button>
                  <button onClick={() => exportIt("json")}>
                    <FileJson />
                    JSON
                  </button>
                </div>
                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        {columns.map((c) => (
                          <th key={c}>{c.toUpperCase()}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((r) => (
                        <tr key={r.id}>
                          <td>{String(r.id).padStart(2, "0")}</td>
                          {columns.map((c, i) => (
                            <td key={c}>
                              {i === 0 ? <b>{r[c]}</b> : String(r[c] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : tab === "JSON" ? (
              <pre>{JSON.stringify(rows, null, 2)}</pre>
            ) : <div className="tablewrap"><table><thead><tr><th>DATE</th><th>TYPE</th><th>STATUT</th><th>URL</th><th>VOLUME</th><th>DURÉE</th><th></th></tr></thead><tbody>{runs.map(run=><tr key={run.id}><td>{new Date(run.date).toLocaleString()}</td><td>{run.endpoint}{run.retryOf?" · relance":""}</td><td><span className={`run-status ${run.status}`}>{run.status}</span></td><td title={run.url}>{run.url}</td><td>{run.count} lignes · {run.pages} pages</td><td>{run.duration} ms</td><td>{run.status!=="success"&&<button className="retry" onClick={()=>retryRun(run.id)}>Relancer</button>}</td></tr>)}</tbody></table>{!runs.length&&<div className="empty">Aucune exécution enregistrée</div>}</div>}
            <footer>
              <span>
                Affichage de <b>{shown.length}</b> sur <b>{rows.length}</b>{" "}
                résultats
              </span>
              <span>
                <Clock3 />
                {meta
                  ? `HTTP ${meta.status} · ${meta.pages} page(s) · ${meta.pagination}`
                  : "Aucune requête"}
              </span>
            </footer>
          </section>
        </div>
      {visualOpen&&<div className="visual-overlay" onClick={()=>setVisualOpen(false)}><section className="visual-modal" onClick={e=>e.stopPropagation()}><header><div><p className="eyebrow">SÉLECTEUR VISUEL</p><h2>{visualData?.title||"Analyse de la page"}</h2><p>Cliquez sur un cadre pour utiliser son sélecteur CSS.</p></div><button onClick={()=>setVisualOpen(false)}>×</button></header>{visualLoading?<div className="visual-loading"><Activity className="spin"/>Rendu de la page…</div>:visualData?.error?<div className="visual-error">{visualData.error}</div>:visualData&&<div className="visual-workspace"><div className="visual-canvas" style={{aspectRatio:`${visualData.width}/${visualData.height}`}}><img src={visualData.image}/>{visualData.elements.map((el,i)=><button key={i} className={hoveredVisual===i?"hovered":""} style={{left:`${el.x/visualData.width*100}%`,top:`${el.y/visualData.height*100}%`,width:`${el.width/visualData.width*100}%`,height:`${el.height/visualData.height*100}%`}} title={`${el.selector} · ${el.matches} correspondances`} onMouseEnter={()=>setHoveredVisual(i)} onMouseLeave={()=>setHoveredVisual(null)} onClick={()=>{setSelector(el.selector);setSelectorTest(null);setVisualOpen(false)}}><span>{el.matches}×</span></button>)}</div><aside><b>Éléments visibles</b>{visualData.elements.slice(0,30).map((el,i)=><button key={i} className={hoveredVisual===i?"active":""} onMouseEnter={()=>setHoveredVisual(i)} onMouseLeave={()=>setHoveredVisual(null)} onClick={()=>{setSelector(el.selector);setVisualOpen(false)}}><code>{el.selector}</code><span>{el.matches} × · {el.text||el.tag}</span></button>)}</aside></div>}</section></div>}
      </main>
      {tutorialOpen&&<div className="tutorial-overlay" onClick={()=>setTutorialOpen(false)}><section className="tutorial-modal" onClick={e=>e.stopPropagation()}><header><div><p className="eyebrow"><BookOpen/>CENTRE D’AIDE</p><h2>Apprendre ScrapeFlow</h2><p>Choisissez un parcours et suivez les étapes dans l’ordre.</p></div><button className="close-tutorial" onClick={()=>setTutorialOpen(false)}>×</button></header><div className="tutorial-layout"><nav className="tutorial-nav">{["Premier scraping","Détection automatique","Pagination & crawl","Liste → fiche","Nettoyage","Recettes & planning"].map((name,i)=><button key={name} className={tutorial===i?"active":""} onClick={()=>setTutorial(i)}><span>{i+1}</span>{name}</button>)}</nav><div className="tutorial-content">{tutorial===0&&<><h3>Votre premier scraping</h3><ol><li>Collez une URL publique dans « Source à analyser ».</li><li>Indiquez le bloc répété, par exemple <code>.product</code> ou <code>article</code>.</li><li>Ajoutez les champs avec leur sélecteur CSS.</li><li>Cliquez sur « Lancer l’extraction ».</li><li>Vérifiez l’aperçu, puis exportez en CSV ou JSON.</li></ol><div className="tutorial-example"><b>Exemple e-commerce</b><code>Bloc : .product-item<br/>Titre : h2<br/>Prix : .price<br/>URL : a → attribut href</code></div></>}{tutorial===1&&<><h3>Utiliser la détection automatique</h3><ol><li>Saisissez d’abord l’URL cible.</li><li>Activez « Rendu JavaScript » si les données apparaissent après chargement.</li><li>Cliquez sur « Détection auto ».</li><li>Contrôlez le score de confiance et les champs proposés.</li><li>Corrigez les sélecteurs dont l’aperçu est vide.</li></ol><p>La détection est un point de départ : elle ne remplace pas la vérification de la recette.</p></>}{tutorial===2&&<><h3>Enchaîner plusieurs pages</h3><ol><li>Ouvrez « Options avancées ».</li><li>Réglez « Pages max » et « Lignes max ».</li><li>Laissez le sélecteur suivant vide pour la détection automatique.</li><li>Pour explorer tout un site, activez « Explorer les liens internes ».</li><li>Utilisez les Regex Inclure/Exclure pour limiter les chemins.</li></ol><div className="tutorial-example"><b>Exemple</b><code>Inclure : /produits/|/catalogue/<br/>Exclure : /panier|/compte|/contact</code></div></>}{tutorial===3&&<><h3>Visiter chaque fiche</h3><ol><li>Extrayez une colonne contenant l’URL de chaque résultat.</li><li>Activez « Visiter chaque fiche et enrichir ».</li><li>Choisissez le nom de la colonne URL, par exemple <code>url</code>.</li><li>Ajoutez les sélecteurs présents sur la page détaillée.</li><li>Limitez d’abord le test à 5 fiches.</li></ol></>}{tutorial===4&&<><h3>Nettoyer les données</h3><ol><li>Ajoutez une transformation dans les options avancées.</li><li>Choisissez la colonne cible.</li><li>Sélectionnez l’opération : prix, nombre, date, Regex ou remplacement.</li><li>Les transformations sont appliquées dans l’ordre.</li><li>Contrôlez le JSON avant l’export.</li></ol><div className="tutorial-example"><b>Conversion</b><code>« 1 299,90 € » → Prix → 1299.9</code></div></>}{tutorial===5&&<><h3>Automatiser une recette</h3><ol><li>Donnez un nom à votre configuration.</li><li>Cliquez sur « Enregistrer ».</li><li>Chargez la recette depuis la liste.</li><li>Indiquez l’intervalle en minutes.</li><li>Cliquez sur « Planifier » et consultez le Journal.</li></ol><p>Les recettes, exécutions et planifications restent disponibles après redémarrage.</p></>}</div></div><footer><button disabled={tutorial===0} onClick={()=>setTutorial(tutorial-1)}>Précédent</button><span>{tutorial+1} / 6</span><button disabled={tutorial===5} onClick={()=>setTutorial(tutorial+1)}>Suivant</button></footer></section></div>}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
