'use strict';

function onStateChange() {
  markDirty();
  renderProgress();
}

// ── INIT ──────────────────────────────────────────────────────────────────────
try {
  const raw = localStorage.getItem('tears_v3');
  if (raw) {
    S = mergeState(freshState(), JSON.parse(raw));
    markSaved();
  }
} catch (_) {}

renderProgress();
renderTab('charakter');

// ── TAB NAVIGATION ────────────────────────────────────────────────────────────
document.getElementById('tabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (btn && btn.dataset.tab) renderTab(btn.dataset.tab);
});

// ── HEADER ACTIONS ────────────────────────────────────────────────────────────
document.getElementById('btn-save').addEventListener('click', saveChar);
document.getElementById('btn-load').addEventListener('click', loadChar);
document.getElementById('btn-reset').addEventListener('click', resetChar);
document.getElementById('btn-export').addEventListener('click', exportChar);

document.getElementById('btn-import').addEventListener('click', () =>
  document.getElementById('import-file').click()
);
document.getElementById('import-file').addEventListener('change', e => {
  importChar(e.target.files[0]);
  e.target.value = '';
});

document.getElementById('btn-print').addEventListener('click', () => {
  renderPrintSheet();
  window.print();
});

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveChar();
  }
});

// ── AUTO-SAVE ─────────────────────────────────────────────────────────────────
setInterval(() => { if (dirty) saveChar(); }, 60_000);
