// ===== INVESTIGATION ROOM =====
const Investigation = (() => {
  const board      = document.getElementById('inv-clues');
  const solveBtn   = document.getElementById('btn-solve');
  const stringCvs  = document.getElementById('string-canvas');
  const sCtx       = stringCvs.getContext('2d');
  const titleEl    = document.getElementById('inv-title');
  const instrEl    = document.getElementById('inv-instructions');

  let clues            = [];
  let validConnections = [];
  let madeConnections  = new Set();   // "idA|idB"
  let wrongAttempts    = new Map();   // "idA|idB" → count
  let totalWrongs      = 0;           // global wrong attempt counter
  let hintIndex        = 0;           // which remaining connection to hint next
  let dragging         = null;
  let cardEls          = {};
  let onSolvedCallback = null;
  let selectedClue     = null;
  let mousePos         = { x: 0, y: 0 };
  let hintsUsed        = 0;

  // ── Card grid layout ──────────────────────────────────────────────────────
  function getCardPositions(count) {
    const COLS = Math.min(count, 5);
    const ROWS = Math.ceil(count / COLS);

    const TOP_MARGIN    = 18;
    const BOTTOM_MARGIN = 10;
    const LEFT_MARGIN   = 5;
    const RIGHT_MARGIN  = 5;

    const usableW = 100 - LEFT_MARGIN - RIGHT_MARGIN;
    const usableH = 100 - TOP_MARGIN  - BOTTOM_MARGIN;
    const colStep = usableW / COLS;
    const rowStep = usableH / ROWS;

    const jitter = [
      [ 0.6,-1.0],[-0.8, 0.9],[ 1.0, 0.4],[-0.5,-0.8],[ 0.7, 1.1],
      [-0.9, 0.4],[ 0.3,-1.2],[ 1.3, 0.7],[-0.4, 1.0],[ 0.6,-0.5],
    ];

    return Array.from({ length: count }, (_, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      return {
        left: LEFT_MARGIN + colStep * (col + 0.5) + jitter[i % jitter.length][0] * 2.5,
        top:  TOP_MARGIN  + rowStep * (row + 0.5) + jitter[i % jitter.length][1] * 2.5,
      };
    });
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  function init(collectedClues, connectionsData, storyTitle, onSolved) {
    clues            = collectedClues;
    validConnections = connectionsData;
    madeConnections  = new Set();
    wrongAttempts    = new Map();
    totalWrongs      = 0;
    hintIndex        = 0;
    onSolvedCallback = onSolved;
    cardEls          = {};
    selectedClue     = null;
    hintsUsed        = 0;

    titleEl.innerHTML = `<svg viewBox="0 0 22 12" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="12" style="vertical-align:middle;margin-right:8px"><path d="M1 6 C3 3,6 3,8 6 S13 9,15 6 S20 3,21 6" stroke="#d4aa60" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>${storyTitle} — Investigation Board`;
    board.innerHTML     = '';
    solveBtn.classList.add('hidden');

    // Update instructions
    instrEl.textContent = 'Click a clue card to select it, then click another to connect them.';

    // Add hint button if not already present
    let hintBtn = document.getElementById('inv-hint-btn');
    if (!hintBtn) {
      hintBtn = document.createElement('button');
      hintBtn.id        = 'inv-hint-btn';
      hintBtn.className = 'hint-btn';
      hintBtn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="14" height="14" style="vertical-align:middle;margin-right:5px"><circle cx="10" cy="10" r="8" stroke="#e8dcc8" stroke-width="1.5"/><line x1="10" y1="9" x2="10" y2="14" stroke="#e8dcc8" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.5" r="1" fill="#e8dcc8"/></svg>Hint`;
      document.getElementById('inv-board').appendChild(hintBtn);
    }
    hintBtn.onclick = giveHint;

    // Progress counter
    let progEl = document.getElementById('inv-progress');
    if (!progEl) {
      progEl = document.createElement('div');
      progEl.id = 'inv-progress';
      progEl.className = 'inv-progress';
      document.getElementById('inv-board').appendChild(progEl);
    }
    updateProgress();

    resizeCanvas();

    const positions = getCardPositions(clues.length);
    const tilts     = [-2, 1.5, -1, 2.5, -1.8, 1, -2.5, 2, -0.5, 1.2];

    clues.forEach((c, i) => {
      const card  = document.createElement('div');
      const tilt  = tilts[i % tilts.length];
      card.className  = 'clue-card';
      card.dataset.id = c.id;
      card.style.left      = `${positions[i].left}%`;
      card.style.top       = `${positions[i].top}%`;
      card.style.transform = `translate(-50%, -50%) rotate(${tilt}deg)`;
      card.dataset.tilt    = tilt;

      card.innerHTML = `
        <div class="card-pin">🪸</div>
        <div class="card-title">${c.clue.title}</div>
        <div class="card-body">${c.clue.text}</div>
      `;

      // ── Drag ──────────────────────────────────────────────────────────
      let isDragging = false, startMX, startMY, startL, startT;

      card.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        isDragging = false;
        startMX = e.clientX; startMY = e.clientY;
        startL  = parseFloat(card.style.left);
        startT  = parseFloat(card.style.top);
        dragging = { card, setDrag: v => { isDragging = v; }, startMX, startMY, startL, startT };
        card.style.zIndex     = 100;
        card.style.transition = 'none';
        e.preventDefault();
        e.stopPropagation();
      });

      // ── Click-to-connect ───────────────────────────────────────────────
      card.addEventListener('click', () => {
        if (isDragging) { isDragging = false; return; }
        handleClueClick(c.id);
      });

      // ── Hover preview (live string while a card is selected) ───────────
      card.addEventListener('mouseenter', () => {
        if (selectedClue && selectedClue !== c.id) {
          card.classList.add('hovered-target');
        }
      });
      card.addEventListener('mouseleave', () => {
        card.classList.remove('hovered-target');
      });

      board.appendChild(card);
      cardEls[c.id] = card;
    });

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
    drawStrings();
  }

  // ── Click logic ───────────────────────────────────────────────────────────
  function handleClueClick(id) {
    // Deselect if clicking the already-selected card
    if (selectedClue === id) {
      deselect();
      return;
    }

    // No card selected yet — select this one
    if (!selectedClue) {
      selectedClue = id;
      cardEls[id].classList.add('selected');
      // Show "now click another card" pulse on all other cards
      Object.entries(cardEls).forEach(([cid, el]) => {
        if (cid !== id && !el.classList.contains('connected-done')) {
          el.classList.add('connectable');
        }
      });
      drawStrings(); // draw live string from here to mouse
      return;
    }

    // Second card clicked — try to connect
    const fromId  = selectedClue;
    const toId    = id;
    const key1    = `${fromId}|${toId}`;
    const key2    = `${toId}|${fromId}`;

    // Already connected
    if (madeConnections.has(key1) || madeConnections.has(key2)) {
      flashCard(cardEls[toId], 'already');
      deselect();
      return;
    }

    const isValid = validConnections.some(([a, b]) =>
      (a === fromId && b === toId) || (a === toId && b === fromId)
    );

    if (isValid) {
      // ✅ Correct connection
      madeConnections.add(key1);
      cardEls[fromId].classList.add('connected-done');
      cardEls[toId].classList.add('connected-done');
      flashCard(cardEls[fromId], 'correct');
      flashCard(cardEls[toId],   'correct');
      Audio.playSFX('string_connect');
      deselect();
      drawStrings();
      updateProgress();
      checkSolved();
    } else {
      // ❌ Wrong connection — shake, increment counters
      const wrongKey = key1 < key2 ? key1 : key2;
      wrongAttempts.set(wrongKey, (wrongAttempts.get(wrongKey) || 0) + 1);
      totalWrongs++;
      flashCard(cardEls[fromId], 'wrong');
      flashCard(cardEls[toId],   'wrong');

      // After 2 wrong attempts on the exact same pair → "no link" tooltip
      if ((wrongAttempts.get(wrongKey) || 0) >= 2) {
        showPairHint(fromId, toId);
      }

      // Every 3 total wrong attempts → show a Hassel detective hint toast
      if (totalWrongs % 3 === 0) {
        showHintToast();
      }

      deselect();
    }
  }

  function deselect() {
    if (selectedClue) {
      cardEls[selectedClue]?.classList.remove('selected');
    }
    selectedClue = null;
    Object.values(cardEls).forEach(el => el.classList.remove('connectable', 'hovered-target'));
    drawStrings();
  }

  // ── Card flash feedback ───────────────────────────────────────────────────
  function flashCard(el, type) {
    if (!el) return;
    const cls = type === 'correct' ? 'flash-correct'
              : type === 'wrong'   ? 'flash-wrong'
              :                      'flash-already';
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), 700);
  }

  // ── "These two don't connect" hint after repeated wrong attempts ──────────
  function showPairHint(aId, bId) {
    // Show a brief tooltip on both cards saying they don't connect
    [aId, bId].forEach(id => {
      const el = cardEls[id];
      if (!el) return;
      let tip = el.querySelector('.card-no-link');
      if (!tip) {
        tip = document.createElement('div');
        tip.className = 'card-no-link';
        tip.textContent = '✗ no link';
        el.appendChild(tip);
      }
      tip.style.opacity = '1';
      setTimeout(() => { tip.style.opacity = '0'; }, 2500);
    });
  }

  // ── Detective hint toast (triggers every 3 total wrong attempts) ─────────
  function showHintToast() {
    // Find a remaining unconnected pair that has a hint text
    const remaining = validConnections.filter(([a, b]) =>
      !madeConnections.has(`${a}|${b}`) && !madeConnections.has(`${b}|${a}`)
    );
    if (!remaining.length) return;

    // Cycle through remaining hints
    const entry   = remaining[hintIndex % remaining.length];
    hintIndex++;

    const [aId, bId, hintText] = entry;
    if (!hintText) return;

    // Titles for the two cards
    const aClue = clues.find(c => c.id === aId);
    const bClue = clues.find(c => c.id === bId);
    if (!aClue || !bClue) return;

    const titleA = aClue.clue.title;
    const titleB = bClue.clue.title;

    // Build or reuse the toast element
    let toast = document.getElementById('inv-hint-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'inv-hint-toast';
      toast.className = 'hint-toast';
      document.getElementById('inv-board').appendChild(toast);
    }

    toast.innerHTML = `
      <div class="hint-toast-header">
        <span class="hint-toast-icon">
          <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
            <rect x="3" y="2" width="14" height="16" rx="2" stroke="#d4aa60" stroke-width="1.5"/>
            <line x1="6" y1="7" x2="14" y2="7" stroke="#d4aa60" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="6" y1="10.5" x2="14" y2="10.5" stroke="#d4aa60" stroke-width="1.2" stroke-linecap="round"/>
            <line x1="6" y1="14" x2="10" y2="14" stroke="#d4aa60" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </span>
        <span>Hassel's Note</span>
        <button class="hint-toast-close" onclick="this.parentElement.parentElement.classList.remove('visible')">✕</button>
      </div>
      <div class="hint-toast-pair">
        <span class="hint-card-tag">${titleA}</span>
        <span class="hint-link-arrow">↔</span>
        <span class="hint-card-tag">${titleB}</span>
      </div>
      <div class="hint-toast-text">${hintText}</div>
    `;

    // Glow the two cards too
    const aEl = cardEls[aId];
    const bEl = cardEls[bId];
    if (aEl) { aEl.classList.add('hint-glow'); setTimeout(() => aEl.classList.remove('hint-glow'), 3000); }
    if (bEl) { bEl.classList.add('hint-glow'); setTimeout(() => bEl.classList.remove('hint-glow'), 3000); }

    // Show with animation, auto-dismiss after 9 seconds
    clearTimeout(toast._dismissTimer);
    toast.classList.remove('visible');
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('visible')));
    toast._dismissTimer = setTimeout(() => toast.classList.remove('visible'), 9000);
  }

  // ── Hint button: show a hint toast for the next unconnected pair ─────────
  function giveHint() {
    showHintToast();
  }

  // ── Progress counter ──────────────────────────────────────────────────────
  function updateProgress() {
    const el = document.getElementById('inv-progress');
    if (!el) return;
    const done  = madeConnections.size;
    const total = validConnections.length;
    el.innerHTML = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="13" height="13" style="vertical-align:middle;margin-right:4px"><circle cx="5" cy="10" r="3" stroke="#d4aa60" stroke-width="1.4"/><circle cx="15" cy="10" r="3" stroke="#d4aa60" stroke-width="1.4"/><line x1="8" y1="10" x2="12" y2="10" stroke="#d4aa60" stroke-width="1.4"/></svg>${done} / ${total} connections`;
  }

  // ── Drag ──────────────────────────────────────────────────────────────────
  function onMouseMove(e) {
    mousePos = { x: e.clientX, y: e.clientY };

    if (dragging) {
      const { card, setDrag, startMX, startMY, startL, startT } = dragging;
      const dx = e.clientX - startMX;
      const dy = e.clientY - startMY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) setDrag(true);
      card.style.left = `${Math.max(2, Math.min(98, startL + (dx / board.offsetWidth)  * 100))}%`;
      card.style.top  = `${Math.max(2, Math.min(98, startT + (dy / board.offsetHeight) * 100))}%`;
    }

    // Redraw strings + live preview line
    drawStrings();
  }

  function onMouseUp() {
    if (dragging) {
      dragging.card.style.zIndex    = 4;
      dragging.card.style.transition = '';
      dragging = null;
    }
  }

  // ── Canvas ────────────────────────────────────────────────────────────────
  function resizeCanvas() {
    const screen      = document.getElementById('screen-investigation');
    stringCvs.width   = screen.offsetWidth  || window.innerWidth;
    stringCvs.height  = screen.offsetHeight || window.innerHeight;
  }

  function drawStrings() {
    sCtx.clearRect(0, 0, stringCvs.width, stringCvs.height);

    // Draw all confirmed connections
    madeConnections.forEach(key => {
      const [aId, bId] = key.split('|');
      drawLine(cardEls[aId], cardEls[bId], '#cc2222', 2.5, [6, 3], 0.9, true);
    });

    // Draw live preview line from selected card to mouse cursor
    if (selectedClue && cardEls[selectedClue]) {
      const el = cardEls[selectedClue];
      const r  = el.getBoundingClientRect();
      const cx = r.left + r.width  / 2;
      const cy = r.top  + r.height / 2;

      sCtx.save();
      sCtx.strokeStyle = 'rgba(255,200,80,0.65)';
      sCtx.lineWidth   = 2;
      sCtx.setLineDash([8, 5]);
      sCtx.beginPath();
      sCtx.moveTo(cx, cy);
      sCtx.lineTo(mousePos.x, mousePos.y);
      sCtx.stroke();
      sCtx.restore();
    }
  }

  function drawLine(aEl, bEl, color, width, dash, alpha, dot) {
    if (!aEl || !bEl) return;
    const ar = aEl.getBoundingClientRect();
    const br = bEl.getBoundingClientRect();
    const ax = ar.left + ar.width  / 2, ay = ar.top + ar.height / 2;
    const bx = br.left + br.width  / 2, by = br.top + br.height / 2;

    sCtx.save();
    sCtx.strokeStyle  = color;
    sCtx.lineWidth    = width;
    sCtx.setLineDash(dash);
    sCtx.globalAlpha  = alpha;
    sCtx.beginPath();
    sCtx.moveTo(ax, ay);
    sCtx.lineTo(bx, by);
    sCtx.stroke();

    if (dot) {
      sCtx.setLineDash([]);
      sCtx.globalAlpha = 1;
      sCtx.fillStyle   = color;
      sCtx.beginPath();
      sCtx.arc((ax + bx) / 2, (ay + by) / 2, 4, 0, Math.PI * 2);
      sCtx.fill();
    }
    sCtx.restore();
  }

  // ── Solve check ───────────────────────────────────────────────────────────
  function checkSolved() {
    const allMade = validConnections.every(([a, b]) =>
      madeConnections.has(`${a}|${b}`) || madeConnections.has(`${b}|${a}`)
    );
    if (allMade) {
      solveBtn.classList.remove('hidden');
      Audio.playSFX('case_solved');
    }
  }

  function cleanup() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);
  }

  solveBtn.addEventListener('click', () => {
    Audio.playSFX('case_solved');
    cleanup();
    if (onSolvedCallback) onSolvedCallback();
  });

  window.addEventListener('resize', () => {
    if (document.getElementById('screen-investigation').classList.contains('active')) {
      resizeCanvas();
      drawStrings();
    }
  });

  return { init, cleanup, drawStrings };
})();
