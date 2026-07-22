const UI = (() => {
  const notebookPanel = document.getElementById('notebook-panel');
  const notebookList  = document.getElementById('notebook-entries');
  const notebookClose = document.getElementById('notebook-close');
  const objectiveText = document.getElementById('objective-text');
  const clueCountEl   = document.getElementById('clue-count');
  const clueTotalEl   = document.getElementById('clue-total');
  const hintEl        = document.getElementById('interaction-hint');
  const goInvEl       = document.getElementById('go-investigation');
  const echoOverlay   = document.getElementById('echo-overlay');
  const pauseMenu     = document.getElementById('pause-menu');
  const cluePanel     = document.getElementById('clue-panel');
  const clueList      = document.getElementById('clue-list');

  let notebookOpen = false;
  let paused       = false;
  let entries      = [];

  document.getElementById('music-vol').addEventListener('input', e => {
    Audio.setMusicVol(parseFloat(e.target.value));
  });
  document.getElementById('sfx-vol').addEventListener('input', e => {
    Audio.setSFXVol(parseFloat(e.target.value));
  });
  document.getElementById('fullscreen-toggle').addEventListener('change', e => {
    if (e.target.checked) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });

  const CLUE_ICON_SVG = `<svg class="clue-svg-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="11" cy="12" rx="6" ry="4" fill="#f87c3d" stroke="#ff6b1a" stroke-width="0.8"/>
    <path d="M17 12 L22 8 L22 16 Z" fill="#f87c3d" stroke="#ff6b1a" stroke-width="0.8"/>
    <line x1="9.5" y1="8.2" x2="9.5" y2="15.8" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>
    <line x1="12.5" y1="8.5" x2="12.5" y2="15.5" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round" opacity="0.85"/>
    <circle cx="7" cy="11.5" r="1.1" fill="#1a1a1a"/>
    <circle cx="6.65" cy="11.15" r="0.4" fill="#ffffff"/>
    <path d="M9 8.2 Q11 5.5 13.5 8.5" stroke="#ff6b1a" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <path d="M10 12.5 Q8.5 15 10.5 15.5" stroke="#ff6b1a" stroke-width="1" fill="none" stroke-linecap="round"/>
  </svg>`;

  const NOTE_ICON_SVG = `<svg class="entry-svg-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="2" width="14" height="16" rx="2" stroke="#d4aa60" stroke-width="1.5"/>
    <line x1="6" y1="7"    x2="14" y2="7"    stroke="#d4aa60" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="6" y1="10.5" x2="14" y2="10.5" stroke="#d4aa60" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="6" y1="14"   x2="10" y2="14"   stroke="#d4aa60" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;

  function addEntry(title, text) {
    entries.push({ title, text });
    refreshNotebook();
    addClueToPanel(title, text);
  }

  function refreshNotebook() {
    notebookList.innerHTML = '';
    entries.forEach(e => {
      const div = document.createElement('div');
      div.className = 'notebook-entry';
      div.innerHTML = `<div class="entry-title">${NOTE_ICON_SVG}<span>${e.title}</span></div><div>${e.text}</div>`;
      notebookList.appendChild(div);
    });
  }

  function openNotebook() {
    notebookOpen = true;
    refreshNotebook();
    notebookPanel.classList.remove('hidden');
    Audio.playSFX('notebook_open');
  }

  function closeNotebook() {
    notebookOpen = false;
    notebookPanel.classList.add('hidden');
    Audio.playSFX('notebook_close');
  }

  function isNotebookOpen() { return notebookOpen; }
  notebookClose.addEventListener('click', closeNotebook);

  function addClueToPanel(title, text) {
    const item = document.createElement('div');
    item.className = 'clue-item new-clue';
    item.innerHTML = `<span class="clue-pin">${CLUE_ICON_SVG}</span><div><strong>${title}</strong><br><small>${text}</small></div>`;
    clueList.appendChild(item);
    cluePanel.classList.remove('hidden');
    clueList.scrollTop = clueList.scrollHeight;
    setTimeout(() => item.classList.remove('new-clue'), 600);
  }

  function openPause()  { paused = true;  pauseMenu.classList.remove('hidden'); }
  function closePause() { paused = false; pauseMenu.classList.add('hidden'); }
  function isPaused()   { return paused; }

  document.getElementById('btn-resume').addEventListener('click', () => {
    closePause(); Audio.playSFX('click');
  });
  document.getElementById('btn-pause-settings').addEventListener('click', () => {
    document.getElementById('modal-settings').classList.remove('hidden');
    Audio.playSFX('click');
  });
  document.getElementById('btn-pause-home').addEventListener('click', () => {
    closePause(); Audio.stopMusic(true);
    Transitions.goTo('screen-home'); Audio.playSFX('click');
  });
  document.getElementById('btn-pause-quit').addEventListener('click', () => { window.close(); });

  function activateEcho()   { echoOverlay.classList.add('active'); }
  function deactivateEcho() { echoOverlay.classList.remove('active'); }

  function setObjective(text)     { objectiveText.textContent = text; }
  function setClueCount(n, total) {
    clueCountEl.textContent = n;
    clueTotalEl.textContent = total;
    const badge = document.getElementById('clue-panel-badge');
    if (badge) {
      badge.textContent = `${n} / ${total}`;
      badge.classList.toggle('complete', n >= total && total > 0);
    }
  }
  function showHint(show)            { hintEl.classList.toggle('hidden', !show); }
  function showGoInvestigation(show) { goInvEl.classList.toggle('hidden', !show); }

  function clearAll() {
    entries = [];
    notebookList.innerHTML = '';
    clueList.innerHTML = '';
    cluePanel.classList.add('hidden');
  }

  function flashCluePanel() {
    cluePanel.classList.add('flash');
    setTimeout(() => cluePanel.classList.remove('flash'), 700);
  }

  return {
    addEntry, openNotebook, closeNotebook, isNotebookOpen,
    openPause, closePause, isPaused,
    activateEcho, deactivateEcho,
    setObjective, setClueCount, showHint, showGoInvestigation,
    clearAll, flashCluePanel,
  };
})();
