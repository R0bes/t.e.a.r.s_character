'use strict';

// ── UTILS ─────────────────────────────────────────────────────────────────────

function esc(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function toast(msg, type = 'ok') {
  const palettes = { ok: '#4caf73', warn: '#ffa726', err: '#e94560', info: '#29b6f6' };
  const el = document.createElement('div');
  el.className = 'toast toast-' + type;
  el.style.setProperty('--tc', palettes[type] || palettes.ok);
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 350); }, 2400);
}

function talentSelectHTML() {
  let h = `<option value="">– kein –</option>`;
  for (const [cat, data] of Object.entries(TALENT_CATS)) {
    h += `<optgroup label="${esc(data.label)}">`;
    for (const t of data.talents)
      h += `<option value="${esc(t.n)}">${esc(t.n)}</option>`;
    h += '</optgroup>';
  }
  return h;
}

// ── PROGRESS & CHECKLIST ──────────────────────────────────────────────────────

function renderProgress() {
  const spent = poolSpent();
  const left  = poolLeft();
  const pct   = Math.min(100, (spent / ATTR_FREE) * 100);
  const cls   = left < 0 ? 'over' : left === 0 ? 'full' : '';

  let html = `<div class="prog-chip ${cls}" title="Attributpunkte (${spent}/${ATTR_FREE} vergeben)">
    <span class="chip-lbl">ATT</span>
    <div class="chip-bar"><div class="chip-fill" style="width:${pct}%"></div></div>
    <span class="chip-val">${left < 0 ? '−' : '+'}${Math.abs(left)}</span>
  </div>`;

  for (const cat of TALENT_CAT_KEYS) {
    const avail = talentAvail(cat);
    const sp    = talentSpent(cat);
    const left  = avail - sp;
    const pct   = avail > 0 ? Math.min(100, (sp / avail) * 100) : 0;
    const cc    = left < 0 ? 'over' : left === 0 && sp > 0 ? 'full' : '';
    html += `<div class="prog-chip ${cc}" title="${TALENT_CATS[cat].label}: ${sp}/${avail}">
      <span class="chip-lbl">${TALENT_CATS[cat].chipLabel}</span>
      <div class="chip-bar"><div class="chip-fill" style="width:${pct}%"></div></div>
      <span class="chip-val">${left < 0 ? '−' : '+'}${Math.abs(left)}</span>
    </div>`;
  }

  // Variable points chip
  const vLeft = varPtsLeft();
  const vPct  = Math.min(100, (varPtsSpent() / VARIABLE_PTS) * 100);
  const vCls  = vLeft < 0 ? 'over' : vLeft === 0 && varPtsSpent() > 0 ? 'full' : '';
  html += `<div class="prog-chip ${vCls}" title="Variable Punkte (Führerscheine etc.)">
    <span class="chip-lbl">VAR</span>
    <div class="chip-bar"><div class="chip-fill" style="width:${vPct}%"></div></div>
    <span class="chip-val">${vLeft < 0 ? '−' : '+'}${Math.abs(vLeft)}</span>
  </div>`;

  document.getElementById('header-progress').innerHTML = html;
  renderChecklist();
}

function renderChecklist() {
  const g   = S.g;
  const has = key => !!(BERUFSKAT[S.g.berufskategorie]?.talentPts[key] > 0 || talentSpent(key) > 0);
  const items = [
    { done: !!g.name.trim(),              label: 'Name' },
    { done: !!g.beruf.trim(),             label: 'Beruf' },
    { done: !!g.berufskategorie,          label: 'Kategorie' },
    { done: poolSpent() === ATTR_FREE,    label: 'Attribute (14P)' },
    { done: !!g.hobby1.trim(),            label: 'Hobby 1' },
    { done: !!g.hobby1Talent,             label: 'H1-Talent' },
    { done: !!g.hobby2.trim(),            label: 'Hobby 2' },
    { done: !!g.hobby2Talent,             label: 'H2-Talent' },
    { done: !!g.spezPos.trim(),           label: '+Spezifikum' },
    { done: !!g.spezNegBeruf.trim(),      label: '−Beruf' },
    { done: !!g.spezNegHobby1.trim(),     label: '−Hobby1' },
    { done: !!g.spezNegFrei.trim(),       label: '−Frei' },
  ];
  const total = items.length;
  const done  = items.filter(i => i.done).length;

  document.getElementById('checklist-bar').innerHTML =
    `<span class="cl-count">${done}/${total}</span>` +
    items.map(i =>
      `<div class="cl-item${i.done ? ' done' : ''}">
        <span class="cl-dot"></span>
        <span class="cl-lbl">${i.label}</span>
      </div>`
    ).join('');
}

// ── TAB ROUTING ───────────────────────────────────────────────────────────────

function renderTab(id) {
  activeTab = id;
  document.querySelectorAll('.tab-pane').forEach(p =>
    p.classList.toggle('active', p.id === 'tab-' + id)
  );
  document.querySelectorAll('.tab-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === id)
  );

  switch (id) {
    case 'charakter':  renderTabCharakter();  break;
    case 'attribute':  renderTabAttribute();  break;
    case 'talente':    renderTabTalente();     break;
    case 'waffen':     renderTabWaffen();      break;
    case 'notizen':    renderTabNotizen();     break;
  }
}

// ── TAB: CHARAKTER ────────────────────────────────────────────────────────────

function renderTabCharakter() {
  const g  = S.g;
  const el = document.getElementById('tab-charakter');

  el.innerHTML = `
    <div class="pane-inner">

      <h2 class="section-title">Grunddaten</h2>
      <div class="form-grid">
        <div class="fg span-2">
          <label>Name</label>
          <input id="f-name" type="text" value="${esc(g.name)}" placeholder="Charaktername…" autocomplete="off">
        </div>
        <div class="fg">
          <label>Geschlecht</label>
          <div class="radio-group">
            <label class="radio-opt"><input type="radio" name="geschlecht" value="männlich"  ${g.geschlecht === 'männlich'  ? 'checked' : ''}><span>männlich</span></label>
            <label class="radio-opt"><input type="radio" name="geschlecht" value="weiblich"  ${g.geschlecht === 'weiblich'  ? 'checked' : ''}><span>weiblich</span></label>
            <label class="radio-opt"><input type="radio" name="geschlecht" value="divers"    ${g.geschlecht === 'divers'    ? 'checked' : ''}><span>divers</span></label>
          </div>
        </div>
        <div class="fg">
          <label>Beruf <span class="fg-note">freie Beschreibung</span></label>
          <input id="f-beruf" type="text" value="${esc(g.beruf)}" placeholder="z.B. Chirurg, Bergmann…" autocomplete="off">
        </div>
        <div class="fg">
          <label>Alter</label>
          <input id="f-alter" type="number" min="1" max="120" value="${esc(g.alter)}" placeholder="35">
        </div>
        <div class="fg">
          <label>Größe (m)</label>
          <input id="f-groesse" type="text" value="${esc(g.groesse)}" placeholder="1.75">
        </div>
      </div>

      <h2 class="section-title">Berufskategorie</h2>
      <div class="info-box">
        Die Berufskategorie setzt <strong>Attribut-Mindestwerte</strong> und vergibt <strong>Talentpunkte</strong> pro Kategorie.
        Zusätzlich erhält jeder Charakter <strong>${ATTR_FREE} freie Attributpunkte</strong> und <strong>${VARIABLE_PTS} variable Punkte</strong>.
      </div>
      <div class="fg" style="margin-bottom:14px">
        <label>Berufskategorie</label>
        <select id="f-berufskategorie">
          <option value="">– wählen –</option>
          ${BERUFSKAT_KEYS.map(k =>
            `<option value="${k}"${g.berufskategorie === k ? ' selected' : ''}>${BERUFSKAT[k].label}</option>`
          ).join('')}
        </select>
      </div>
      ${g.berufskategorie ? renderBerufInfo(g.berufskategorie) : ''}

      <h2 class="section-title">Hobbys</h2>
      <div class="info-box">
        <strong>Hobby 1:</strong> +5 Punkte auf ein passendes Talent + negatives Spezifikum (ohne Bonus).<br>
        <strong>Hobby 2:</strong> +3 Punkte auf ein passendes Talent.
      </div>
      <div class="form-grid">
        <div class="fg">
          <label>Hobby 1</label>
          <input id="f-hobby1" type="text" value="${esc(g.hobby1)}" placeholder="z.B. Klettern, Kochen…" autocomplete="off">
        </div>
        <div class="fg">
          <label>Hobby1-Talent <span class="fg-bonus">+5 Punkte</span></label>
          <select id="f-hobby1Talent">${talentSelectHTML()}</select>
        </div>
        <div class="fg">
          <label>Hobby 2</label>
          <input id="f-hobby2" type="text" value="${esc(g.hobby2)}" placeholder="z.B. Lesen, Sport…" autocomplete="off">
        </div>
        <div class="fg">
          <label>Hobby2-Talent <span class="fg-bonus">+3 Punkte</span></label>
          <select id="f-hobby2Talent">${talentSelectHTML()}</select>
        </div>
      </div>

      <h2 class="section-title">Spezifika</h2>
      <div class="info-box">
        <strong>1 positives</strong> Spezifikum + <strong>3 negative</strong> Spezifika (Beruf, Hobby 1, frei).<br>
        Negative Spezifika = Charakter-Nachteile → geben <em>Talentpunkte</em>. Positives = Vorteil → kostet Punkte.
      </div>
      <div class="spez-list">
        <div class="spez-item spez-pos">
          <div class="spez-tag">+ Positives Spezifikum <span class="spez-note">frei wählbar</span></div>
          <input id="f-spezPos" type="text" value="${esc(g.spezPos)}" placeholder="z.B. Eisennerven, Glückspilz…">
        </div>
        <div class="spez-item spez-neg">
          <div class="spez-tag">− Negatives Spezifikum: Beruf <span class="spez-note">muss zum Beruf passen</span></div>
          <input id="f-spezNegBeruf" type="text" value="${esc(g.spezNegBeruf)}" placeholder="z.B. Arroganz, Berufsrisiko…">
        </div>
        <div class="spez-item spez-neg">
          <div class="spez-tag">− Negatives Spezifikum: Hobby 1 <span class="spez-note">kein Bonus</span></div>
          <input id="f-spezNegHobby1" type="text" value="${esc(g.spezNegHobby1)}" placeholder="z.B. Risikofreudig, Süchtig…">
        </div>
        <div class="spez-item spez-neg">
          <div class="spez-tag">− Negatives Spezifikum: frei</div>
          <input id="f-spezNegFrei" type="text" value="${esc(g.spezNegFrei)}" placeholder="z.B. Angst, Schlechter Ruf…">
        </div>
      </div>
    </div>
  `;

  // Set select values
  el.querySelector('#f-hobby1Talent').value = g.hobby1Talent;
  el.querySelector('#f-hobby2Talent').value = g.hobby2Talent;

  // Wire text/number inputs
  const textBindings = {
    'f-name':         v => { S.g.name = v; },
    'f-beruf':        v => { S.g.beruf = v; },
    'f-alter':        v => { S.g.alter = v; },
    'f-groesse':      v => { S.g.groesse = v; },
    'f-hobby1':       v => { S.g.hobby1 = v; },
    'f-hobby2':       v => { S.g.hobby2 = v; },
    'f-spezPos':      v => { S.g.spezPos = v; },
    'f-spezNegBeruf': v => { S.g.spezNegBeruf = v; },
    'f-spezNegHobby1':v => { S.g.spezNegHobby1 = v; },
    'f-spezNegFrei':  v => { S.g.spezNegFrei = v; },
  };
  for (const [id, fn] of Object.entries(textBindings)) {
    const inp = el.querySelector('#' + id);
    if (inp) inp.addEventListener('input', () => { fn(inp.value); onStateChange(); });
  }

  // Berufskategorie select: triggers attribute reset + full re-render of this tab
  el.querySelector('#f-berufskategorie').addEventListener('change', e => {
    S.g.berufskategorie = e.target.value;
    applyBerufskategorieAttrMin();
    onStateChange();
    renderTabCharakter(); // rebuild to show beruf info box
  });

  // Hobby talent selects
  const selBindings = {
    'f-hobby1Talent': v => { S.g.hobby1Talent = v; },
    'f-hobby2Talent': v => { S.g.hobby2Talent = v; },
  };
  for (const [id, fn] of Object.entries(selBindings)) {
    const sel = el.querySelector('#' + id);
    if (sel) sel.addEventListener('change', () => { fn(sel.value); onStateChange(); });
  }

  // Radios
  el.querySelectorAll('input[name="geschlecht"]').forEach(r =>
    r.addEventListener('change', () => { S.g.geschlecht = r.value; onStateChange(); })
  );
}

function renderBerufInfo(key) {
  const kat = BERUFSKAT[key];
  if (!kat) return '';

  const attrRows = Object.entries(kat.attrMin)
    .map(([k, v]) => `<span class="beruf-attr"><b>${k}</b> → ${v}</span>`)
    .join('');

  const talentRows = Object.entries(kat.talentPts)
    .map(([cat, pts]) => `<span class="beruf-talent"><b>${pts}P</b> ${TALENT_CATS[cat]?.label ?? cat}</span>`)
    .join('');

  return `<div class="beruf-info-card">
    <div class="beruf-info-row">
      <span class="beruf-info-lbl">Attribut-Mindestwerte:</span>
      <div class="beruf-info-vals">${attrRows}</div>
    </div>
    <div class="beruf-info-row">
      <span class="beruf-info-lbl">Talentpunkte:</span>
      <div class="beruf-info-vals">${talentRows}<span class="beruf-attr"><b>${VARIABLE_PTS}P</b> variabel</span></div>
    </div>
  </div>`;
}

// ── TAB: ATTRIBUTE ────────────────────────────────────────────────────────────

function renderTabAttribute() {
  const spent  = poolSpent();
  const left   = poolLeft();
  const pct    = Math.min(100, (spent / ATTR_FREE) * 100);
  const barCls = left < 0 ? 'over' : left === 0 ? 'full' : '';

  const hasKat = !!S.g.berufskategorie;

  let h = `<div class="pane-inner">
    ${!hasKat ? `<div class="info-box info-warn">Wähle zuerst eine <strong>Berufskategorie</strong> im Charakter-Tab — sie setzt die Attribut-Mindestwerte.</div>` : ''}
    <div class="info-box">
      Alle Attribute starten mindestens bei <strong>${ATTR_BASE}</strong>, Beruf setzt bestimmte Mindestwerte (grau markiert).<br>
      Verteile <strong>${ATTR_FREE} freie Punkte</strong> darüber hinaus. Maximum: <strong>${ATTR_MAX}</strong><br>
      Werte 15–17 kosten je <span class="col-warn">2P</span> &nbsp;·&nbsp; Werte 18–19 kosten je <span class="col-err">3P</span>
    </div>
    <div class="attr-budget">
      <div class="budget-row">
        <span class="budget-lbl">Freie Attributpunkte</span>
        <span class="budget-val ${left < 0 ? 'col-err' : left === 0 ? 'col-ok' : ''}">${
          left < 0
            ? `ÜBERZOGEN um ${Math.abs(left)}P`
            : `${spent} / ${ATTR_FREE} vergeben — ${left} verbleibend`
        }</span>
      </div>
      <div class="budget-track">
        <div class="budget-fill ${barCls}" style="width:${pct}%"></div>
      </div>
    </div>
    <div class="attr-grid">`;

  for (const k of ATTR_KEYS) {
    const v     = S.attr[k];
    const jobMin = attrJobMin(k);
    const freePts = v - jobMin;
    const next  = v < ATTR_MAX ? stepCost(v) : null;
    const canUp = v < ATTR_MAX && left >= stepCost(v);
    const canDn = v > jobMin;
    const tier  = v >= 18 ? 'tier-3' : v >= 15 ? 'tier-2' : '';
    const isJobMin = jobMin > ATTR_BASE;

    h += `<div class="attr-card${isJobMin ? ' job-boosted' : ''}">
      <div class="attr-head">
        <span class="attr-name">${ATTR_NAMES[k]}</span>
        <span class="attr-abbr">${k}</span>
      </div>
      ${isJobMin ? `<div class="attr-job-min">Beruf-Min: <b>${jobMin}</b></div>` : ''}
      <div class="attr-controls">
        <button class="spin-btn" data-attr="${k}" data-dir="-1" ${canDn ? '' : 'disabled'}>−</button>
        <div class="attr-val ${tier}">${v}</div>
        <button class="spin-btn" data-attr="${k}" data-dir="1" ${canUp ? '' : 'disabled'}>+</button>
      </div>
      <div class="attr-meta">
        <span class="attr-cost">+${freePts}P frei</span>
        <span class="attr-next">${next
          ? `Nächster: <b class="${tier || 'col-ok'}">${next}P</b>`
          : '<span class="col-muted">MAX</span>'
        }</span>
      </div>
    </div>`;
  }

  h += `</div>

    <h2 class="section-title">Abgeleitete Werte <span class="section-note">automatisch berechnet</span></h2>
    <div class="derived-grid-large">
      ${[
        ['LE',  'Lebensenergie',       calcLE(),  '(KK×2 + AU) × 3'],
        ['GG',  'Geist. Gesundheit',   calcGG(),  '(AU + IN + MB×2) × 3'],
        ['ATN', 'Att. Nahkampf',       calcATN(), '(KK×2 + GE) / 3'],
        ['PA',  'Parade',              calcPA(),  '(KK + AU + GE) / 3'],
        ['ATD', 'Att. Distanz',        calcATD(), '(GE×2 + AU) / 3'],
        ['INI', 'Initiative',          calcINI(), '(KK + 5) − (GE / 2)'],
      ].map(([abbr, lbl, val, formula]) => `
        <div class="derived-card">
          <div class="derived-lbl">${lbl}</div>
          <div class="derived-abbr">${abbr}</div>
          <div class="derived-val">${val}</div>
          <div class="derived-formula">${formula}</div>
        </div>`
      ).join('')}
    </div>
  </div>`;

  const el = document.getElementById('tab-attribute');
  el.innerHTML = h;

  el.querySelectorAll('.spin-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const attr  = btn.dataset.attr;
      const delta = Number(btn.dataset.dir);
      const cur   = S.attr[attr];
      const min   = attrJobMin(attr);
      const nxt   = cur + delta;
      if (nxt < min || nxt > ATTR_MAX) return;
      if (delta > 0 && poolLeft() < stepCost(cur)) return;
      S.attr[attr] = nxt;
      onStateChange();
      renderTabAttribute();
    })
  );
}

// ── TAB: TALENTE ──────────────────────────────────────────────────────────────

function renderTabTalente() {
  const hasKat = !!S.g.berufskategorie;
  let h = `<div class="pane-inner">`;

  if (!hasKat) {
    h += `<div class="info-box info-warn">Wähle zuerst eine <strong>Berufskategorie</strong> — sie bestimmt, wie viele Talentpunkte du pro Kategorie erhältst.</div>`;
  }

  for (const cat of TALENT_CAT_KEYS) {
    const data    = TALENT_CATS[cat];
    const avail   = talentAvail(cat);
    const spent   = talentSpent(cat);
    const left    = avail - spent;
    const pct     = avail > 0 ? Math.min(100, (spent / avail) * 100) : 0;
    const lCls    = left < 0 ? 'col-err' : left === 0 && spent > 0 ? 'col-ok' : '';
    const barCls  = left < 0 ? 'over' : left === 0 && spent > 0 ? 'full' : '';
    const isKampf = cat === 'kampf';
    const jobPts  = talentJobPts(cat);

    h += `<div class="talent-cat" id="cat-${cat}">
      <div class="cat-header">
        <div class="cat-title">${data.label}</div>
        <div class="cat-budget">
          ${jobPts > 0
            ? `<span class="cat-stat">Beruf: <b>${jobPts}P</b></span><span class="cat-sep">·</span>`
            : ''
          }
          <span class="cat-stat">verfügbar <b>${avail}</b></span>
          <span class="cat-sep">·</span>
          <span class="cat-stat">ausgegeben <b>${spent}</b></span>
          <span class="cat-sep">·</span>
          <span class="cat-stat ${lCls}">rest <b>${left}</b></span>
        </div>
        <div class="cat-bar-track">
          <div class="cat-bar-fill ${barCls}" style="width:${pct}%"></div>
        </div>
      </div>
      ${isKampf ? `<div class="cat-note">Kampf-Talente kosten je <strong class="col-warn">2 Punkte</strong> aus dem Pool.</div>` : ''}
      <div class="talent-list">`;

    const g = S.g;
    for (const t of data.talents) {
      const v     = S.talente[cat][t.n];
      const isH1  = g.hobby1Talent === t.n;
      const isH2  = g.hobby2Talent === t.n;
      const costPP = isKampf ? 2 : 1;
      const canUp  = left >= costPP;
      const canDn  = v > 0;
      const hi     = isH1 || isH2;
      const { label: lvlLabel, cls: lvlCls } = talentLevel(v);

      let badges = '';
      if (isH1) badges += `<span class="badge badge-h1">● H1 +5</span>`;
      if (isH2) badges += `<span class="badge badge-h2">● H2 +3</span>`;

      h += `<div class="talent-row${hi ? ' talent-hi' : ''}">
        <div class="t-name">${esc(t.n)}</div>
        ${t.a ? `<div class="t-attrs">${t.a}</div>` : '<div class="t-attrs"></div>'}
        <div class="t-level ${lvlCls}">${v > 0 ? lvlLabel : ''}</div>
        <div class="t-badges">${badges}</div>
        <div class="t-ctrl">
          <button class="t-btn" data-cat="${cat}" data-name="${esc(t.n)}" data-dir="-1" ${canDn ? '' : 'disabled'}>−</button>
          <div class="t-val${v > 0 ? ' active' : ''}">${v}</div>
          <button class="t-btn" data-cat="${cat}" data-name="${esc(t.n)}" data-dir="1" ${canUp ? '' : 'disabled'}>+</button>
        </div>
        ${isKampf ? `<div class="t-cost">${v > 0 ? v * 2 + 'P' : ''}</div>` : ''}
      </div>`;
    }

    h += `</div></div>`;
  }

  // Führerscheine section
  const vLeft   = varPtsLeft();
  const vSpent  = varPtsSpent();
  const vPct    = Math.min(100, (vSpent / VARIABLE_PTS) * 100);
  const vBarCls = vLeft < 0 ? 'over' : vLeft === 0 && vSpent > 0 ? 'full' : '';

  h += `<div class="talent-cat" id="cat-fuehrerscheine">
    <div class="cat-header">
      <div class="cat-title">Führerscheine &amp; Sonderfähigkeiten</div>
      <div class="cat-budget">
        <span class="cat-stat">variabel <b>${VARIABLE_PTS}P</b></span>
        <span class="cat-sep">·</span>
        <span class="cat-stat">ausgegeben <b>${vSpent}</b></span>
        <span class="cat-sep">·</span>
        <span class="cat-stat ${vLeft < 0 ? 'col-err' : vLeft === 0 && vSpent > 0 ? 'col-ok' : ''}">rest <b>${vLeft}</b></span>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill ${vBarCls}" style="width:${vPct}%"></div>
      </div>
    </div>
    <div class="cat-note">Bezahlt mit den <strong>${VARIABLE_PTS} variablen Punkten</strong> der Berufskategorie.</div>
    <div class="talent-list">
      ${FUEHRERSCHEINE.map(f => {
        const has = S.fuehrerscheine.includes(f.n);
        const canAdd = !has && vLeft >= f.cost;
        return `<div class="talent-row fuehrerschein-row${has ? ' fs-active' : ''}">
          <div class="t-name">${esc(f.n)}</div>
          <div class="t-attrs"></div>
          <div class="t-level"></div>
          <div class="t-badges"></div>
          <div class="t-ctrl">
            <button class="fs-btn${has ? ' fs-remove' : ''}" data-fs="${esc(f.n)}" ${!has && !canAdd ? 'disabled' : ''}>
              ${has ? '✕ entfernen' : `+ ${f.cost}P`}
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;

  h += '</div>';

  const elTab = document.getElementById('tab-talente');
  elTab.innerHTML = h;

  elTab.querySelectorAll('.t-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const cat   = btn.dataset.cat;
      const name  = btn.dataset.name;
      const delta = Number(btn.dataset.dir);
      const cur   = S.talente[cat][name];
      const cost  = cat === 'kampf' ? 2 : 1;
      if (delta > 0 && talentLeft(cat) < cost) return;
      if (delta < 0 && cur <= 0) return;
      S.talente[cat][name] = cur + delta;
      onStateChange();
      renderTabTalente();
    })
  );

  elTab.querySelectorAll('.fs-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      const name = btn.dataset.fs;
      const idx  = S.fuehrerscheine.indexOf(name);
      if (idx >= 0) {
        S.fuehrerscheine.splice(idx, 1);
      } else {
        const f = FUEHRERSCHEINE.find(x => x.n === name);
        if (f && varPtsLeft() >= f.cost) S.fuehrerscheine.push(name);
      }
      onStateChange();
      renderTabTalente();
    })
  );
}

// ── TAB: WAFFEN ───────────────────────────────────────────────────────────────

function renderTabWaffen() {
  const el = document.getElementById('tab-waffen');
  let h = `<div class="pane-inner">
    <h2 class="section-title">Waffen &amp; Ausrüstung</h2>
    <div class="waffe-table">
      <div class="waffe-row waffe-header">
        <span>Waffe</span><span>Art</span><span>Attacke</span><span>Parade</span><span>Schaden</span><span></span>
      </div>`;

  S.waffen.forEach((w, i) => {
    h += `<div class="waffe-row">
      <input type="text" data-wi="${i}" data-wf="name"    value="${esc(w.name)}"    placeholder="Name">
      <input type="text" data-wi="${i}" data-wf="art"     value="${esc(w.art)}"     placeholder="Art">
      <input type="text" data-wi="${i}" data-wf="attacke" value="${esc(w.attacke)}" placeholder="ATK">
      <input type="text" data-wi="${i}" data-wf="parade"  value="${esc(w.parade)}"  placeholder="PA">
      <input type="text" data-wi="${i}" data-wf="schaden" value="${esc(w.schaden)}" placeholder="1W6+2">
      <button class="waffe-del" data-idx="${i}" title="Entfernen">✕</button>
    </div>`;
  });

  h += `</div>
    <button id="waffe-add" class="btn-ghost-green">+ Waffe hinzufügen</button>
  </div>`;

  el.innerHTML = h;

  el.querySelectorAll('input[data-wi]').forEach(inp =>
    inp.addEventListener('input', () => {
      S.waffen[Number(inp.dataset.wi)][inp.dataset.wf] = inp.value;
      onStateChange();
    })
  );
  el.querySelectorAll('.waffe-del').forEach(btn =>
    btn.addEventListener('click', () => {
      S.waffen.splice(Number(btn.dataset.idx), 1);
      onStateChange();
      renderTabWaffen();
    })
  );
  el.querySelector('#waffe-add').addEventListener('click', () => {
    S.waffen.push({ name: '', art: '', attacke: '', parade: '', schaden: '' });
    onStateChange();
    renderTabWaffen();
  });
}

// ── TAB: NOTIZEN ──────────────────────────────────────────────────────────────

function renderTabNotizen() {
  const el = document.getElementById('tab-notizen');
  el.innerHTML = `<div class="pane-inner">
    <h2 class="section-title">Notizen</h2>
    <div class="fg">
      <textarea id="f-notizen" rows="22">${esc(S.notizen)}</textarea>
    </div>
  </div>`;

  const ta = el.querySelector('#f-notizen');
  ta.addEventListener('input', () => { S.notizen = ta.value; onStateChange(); });
}

// ── PRINT SHEET ───────────────────────────────────────────────────────────────

function renderPrintSheet() {
  const g   = S.g;
  const a   = S.attr;
  const kat = BERUFSKAT[g.berufskategorie];

  let h = `
    <div class="ps-heading">
      <div class="ps-game">T.E.A.R.S.</div>
      <div class="ps-title">CHARAKTERBOGEN</div>
    </div>

    <div class="ps-section">
      <div class="ps-sh">GRUNDDATEN</div>
      <div class="ps-fields">
        <div class="ps-field"><div class="ps-fl">Name</div><div class="ps-fv">${esc(g.name) || '—'}</div></div>
        <div class="ps-field"><div class="ps-fl">Geschlecht</div><div class="ps-fv">${esc(g.geschlecht)}</div></div>
        <div class="ps-field"><div class="ps-fl">Beruf</div><div class="ps-fv">${esc(g.beruf) || '—'}</div></div>
        <div class="ps-field"><div class="ps-fl">Berufskategorie</div><div class="ps-fv">${esc(kat?.label ?? '—')}</div></div>
        <div class="ps-field"><div class="ps-fl">Alter / Größe</div><div class="ps-fv">${esc(g.alter) || '—'} / ${esc(g.groesse) || '—'} m</div></div>
        <div class="ps-field"><div class="ps-fl">Hobby 1 / 2</div><div class="ps-fv">${esc(g.hobby1) || '—'} / ${esc(g.hobby2) || '—'}</div></div>
      </div>
    </div>

    <div class="ps-section">
      <div class="ps-sh">ATTRIBUTE &amp; KAMPFWERTE</div>
      <div class="ps-attr-grid">
        ${ATTR_KEYS.map(k => `
          <div class="ps-attr">
            <div class="ps-attr-name">${ATTR_NAMES[k]}</div>
            <div class="ps-attr-abbr">${k}</div>
            <div class="ps-attr-val">${a[k]}</div>
          </div>`).join('')}
        ${[
          ['LE',  'Lebensenergie',     calcLE()],
          ['GG',  'Geist. Gesundheit', calcGG()],
          ['ATN', 'Att. Nahkampf',     calcATN()],
          ['PA',  'Parade',            calcPA()],
          ['ATD', 'Att. Distanz',      calcATD()],
          ['INI', 'Initiative',        calcINI()],
        ].map(([abbr, lbl, val]) => `
          <div class="ps-attr derived">
            <div class="ps-attr-name">${lbl}</div>
            <div class="ps-attr-abbr">${abbr}</div>
            <div class="ps-attr-val">${val}</div>
          </div>`).join('')}
      </div>
    </div>`;

  for (const [cat, data] of Object.entries(TALENT_CATS)) {
    h += `<div class="ps-section">
      <div class="ps-sh">${data.label.toUpperCase()}</div>
      <div class="ps-talent-grid">
        ${data.talents.map(t => {
          const v = S.talente[cat][t.n];
          return `<div class="ps-talent${v > 0 ? ' set' : ''}">
            <span class="ps-tname">${esc(t.n)}</span>
            ${t.a ? `<span class="ps-tattrs">${t.a}</span>` : ''}
            <span class="ps-tval">${v > 0 ? v : ''}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  h += `<div class="ps-section">
    <div class="ps-sh">WAFFEN</div>
    <table class="ps-waffe-tbl">
      <thead><tr><th>Waffe</th><th>Art</th><th>Attacke</th><th>Parade</th><th>Schaden</th></tr></thead>
      <tbody>${S.waffen.length
        ? S.waffen.map(w =>
            `<tr><td>${esc(w.name)}</td><td>${esc(w.art)}</td><td>${esc(w.attacke)}</td><td>${esc(w.parade)}</td><td>${esc(w.schaden)}</td></tr>`
          ).join('')
        : '<tr><td colspan="5">&nbsp;</td></tr><tr><td colspan="5">&nbsp;</td></tr>'
      }</tbody>
    </table>
  </div>

  <div class="ps-section ps-two-col">
    <div>
      <div class="ps-sh">SPEZIFIKA</div>
      <div class="ps-spez">
        ${g.spezPos       ? `<div class="ps-spez-item ps-pos"><b>+</b> ${esc(g.spezPos)}</div>` : ''}
        ${g.spezNegBeruf  ? `<div class="ps-spez-item ps-neg"><b>−</b> ${esc(g.spezNegBeruf)} <em>(Beruf)</em></div>` : ''}
        ${g.spezNegHobby1 ? `<div class="ps-spez-item ps-neg"><b>−</b> ${esc(g.spezNegHobby1)} <em>(Hobby 1)</em></div>` : ''}
        ${g.spezNegFrei   ? `<div class="ps-spez-item ps-neg"><b>−</b> ${esc(g.spezNegFrei)}</div>` : ''}
        ${!g.spezPos && !g.spezNegBeruf && !g.spezNegHobby1 && !g.spezNegFrei ? '<em>—</em>' : ''}
      </div>
    </div>
    <div>
      <div class="ps-sh">FÜHRERSCHEINE</div>
      <div class="ps-spez">
        ${S.fuehrerscheine.length
          ? S.fuehrerscheine.map(n => `<div class="ps-spez-item">✓ ${esc(n)}</div>`).join('')
          : '<em>—</em>'
        }
      </div>
    </div>
  </div>`;

  if (S.notizen.trim()) {
    h += `<div class="ps-section">
      <div class="ps-sh">NOTIZEN</div>
      <div class="ps-notizen">${esc(S.notizen)}</div>
    </div>`;
  }

  document.getElementById('print-sheet').innerHTML = h;
}
