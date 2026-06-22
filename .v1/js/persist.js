'use strict';

const STORAGE_KEY = 'tears_v4';
let dirty = false;

function markDirty() {
  dirty = true;
  const el = document.getElementById('save-state');
  if (el) { el.textContent = '● ungespeichert'; el.className = 'save-state dirty'; }
}

function markSaved() {
  dirty = false;
  const el = document.getElementById('save-state');
  if (el) { el.textContent = '✓ gespeichert'; el.className = 'save-state saved'; }
}

function saveChar() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
    markSaved();
    toast('Charakter gespeichert!', 'ok');
  } catch (e) {
    toast('Speichern fehlgeschlagen: ' + e.message, 'err');
  }
}

function loadChar() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { toast('Kein gespeicherter Charakter gefunden.', 'warn'); return; }
    S = mergeState(freshState(), JSON.parse(raw));
    renderTab(activeTab);
    renderProgress();
    markSaved();
    toast('Charakter geladen!', 'ok');
  } catch (e) {
    toast('Laden fehlgeschlagen: ' + e.message, 'err');
  }
}

function resetChar() {
  if (!confirm('Wirklich zurücksetzen? Alle Eingaben gehen verloren.')) return;
  S = freshState();
  renderTab(activeTab);
  renderProgress();
  markDirty();
  toast('Charakter zurückgesetzt.', 'warn');
}

function exportChar() {
  const name = (S.g.name.trim() || 'charakter').replace(/\s+/g, '_').toLowerCase();
  const blob  = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a     = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `tears_${name}.json`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Export erfolgreich!', 'ok');
}

function importChar(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      S = mergeState(freshState(), JSON.parse(e.target.result));
      renderTab(activeTab);
      renderProgress();
      markSaved();
      toast(`Importiert: ${S.g.name || 'Unbekannt'}`, 'ok');
    } catch (err) {
      toast('Import fehlgeschlagen: ' + err.message, 'err');
    }
  };
  reader.readAsText(file);
}
