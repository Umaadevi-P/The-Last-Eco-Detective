const Dialogue = (() => {
  const box       = document.getElementById('dialogue-box');
  const textEl    = document.getElementById('dialogue-text');
  const contBtn   = document.getElementById('dialogue-continue');
  const speakerEl = document.getElementById('dlg-speaker-name');

  const leftImg   = document.getElementById('dlg-img-left');
  const leftName  = document.getElementById('dlg-name-left');
  const rightImg  = document.getElementById('dlg-img-right');
  const rightName = document.getElementById('dlg-name-right');

  const HASSEL_SPRITES = {
    idle:       'assests/Hazzel/idle_front.png',
    happy:      'assests/Hazzel/happy.png',
    sad:        'assests/Hazzel/sad.png',
    worried:    'assests/Hazzel/worried.png',
    determined: 'assests/Hazzel/determined.png',
    shock:      'assests/Hazzel/shock.png',
    smile:      'assests/Hazzel/smile.png',
    thinking:   'assests/Hazzel/thinking.png',
    writing:    'assests/Hazzel/write_standing.png',
  };

  let lines      = [];
  let index      = 0;
  let typing     = false;
  let typeTimer  = null;
  let onComplete = null;
  let isOpen     = false;
  let npcSrc     = '';
  let npcLabel   = '';

  function typeText(str) {
    textEl.textContent = '';
    typing = true;
    let i = 0;
    clearInterval(typeTimer);
    typeTimer = setInterval(() => {
      textEl.textContent += str[i];
      i++;
      if (i >= str.length) { clearInterval(typeTimer); typing = false; }
    }, 20);
  }

  function updatePortraits(line) {
    const side       = line.side || 'npc';
    const hasNPC     = !!npcSrc;
    const hassSprite = HASSEL_SPRITES[line.hassleExpr || 'idle'] || HASSEL_SPRITES.idle;

    if (hasNPC) {
      setImgSafe(leftImg, npcSrc);
      leftName.textContent = npcLabel;
      leftImg.classList.toggle('inactive', side !== 'npc');
    } else {
      leftImg.src = '';
      leftImg.classList.add('inactive');
      leftName.textContent = '';
    }

    setImgSafe(rightImg, hassSprite);
    rightImg.classList.toggle('inactive', side === 'npc');
    rightName.textContent = 'Hassel';

    if (side === 'thought') {
      speakerEl.innerHTML = `<svg viewBox="0 0 20 14" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="11" style="vertical-align:middle;margin-right:5px"><ellipse cx="10" cy="7" rx="8" ry="5" stroke="#90b880" stroke-width="1.4"/><circle cx="3.5" cy="12" r="1.2" fill="#90b880" opacity="0.6"/><circle cx="1.5" cy="14" r="0.8" fill="#90b880" opacity="0.35"/></svg><span>Hassel's Thought</span>`;
      speakerEl.style.color = '';
      speakerEl.dataset.role = 'thought';
      box.classList.add('thought');
    } else if (side === 'hassel') {
      speakerEl.textContent = line.speaker || 'Hassel';
      speakerEl.style.color = '';
      speakerEl.dataset.role = 'hassel';
      box.classList.remove('thought');
    } else {
      speakerEl.textContent = line.speaker || npcLabel;
      speakerEl.style.color = '';
      speakerEl.dataset.role = 'npc';
      box.classList.remove('thought');
    }
  }

  function setImgSafe(imgEl, src) {
    if (!src) { imgEl.src = ''; return; }
    const norm = src.replace(/^.*?(assests\/)/, 'assests/');
    const cur  = imgEl.src.replace(/^.*?(assests\/)/, 'assests/');
    if (norm !== cur) imgEl.src = src;
  }

  function showNext() {
    if (typing) {
      clearInterval(typeTimer);
      textEl.textContent = lines[index - 1]?.text || '';
      typing = false;
      return;
    }
    if (index >= lines.length) {
      close();
      if (onComplete) onComplete();
      return;
    }
    const line = lines[index];
    index++;
    updatePortraits(line);
    typeText(line.text);
    Audio.playSFX('dialogue_pop');
  }

  function open(npcName, npcStaticSrc, dialogueLines, callback) {
    lines      = dialogueLines;
    index      = 0;
    onComplete = callback || null;
    isOpen     = true;
    npcSrc     = npcStaticSrc || '';
    npcLabel   = npcName || '';

    if (npcSrc) {
      leftImg.src          = npcSrc;
      leftName.textContent = npcLabel;
      leftImg.classList.remove('inactive');
    } else {
      leftImg.src = '';
      leftImg.classList.add('inactive');
      leftName.textContent = '';
    }

    rightImg.src          = HASSEL_SPRITES.idle;
    rightName.textContent = 'Hassel';
    rightImg.classList.remove('inactive');

    box.classList.remove('hidden', 'thought');
    Audio.playSFX('dialogue_pop');
    showNext();
  }

  function close() {
    box.classList.add('hidden');
    box.classList.remove('thought');
    isOpen = false;
    clearInterval(typeTimer);
    typing = false;
  }

  function isActive() { return isOpen; }

  box.addEventListener('click', () => { if (isOpen) showNext(); });

  return { open, close, isActive, showNext };
})();
