// ===== MAIN GAME CONTROLLER =====
const Game = (() => {

  // ── State ─────────────────────────────────────────────────────────────────
  let currentStory   = null;
  let currentLevel   = 1;
  let progress       = { ocean: { levelsCompleted: [] }, garden: { levelsCompleted: [] } };
  let collectedClues = [];
  let totalClues     = 0;
  let echoCooldown   = 0;
  let echoActive     = false;

  const canvas = document.getElementById('game-canvas');
  const ctx    = canvas.getContext('2d');
  let bgImage  = null;
  let lastTime = 0;
  let animId   = null;
  let gameRunning = false;

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  function init() {
    loadProgress();
    setupIntroScreen();
    setupHomeScreen();
    // Story/level screens still exist but Start Game now skips straight to ocean level 1
    setupStoryScreen();
    setupLevelScreen();
    setupGameplayControls();
    setupCluePanelToggle();
  }

  // ── Persistence ───────────────────────────────────────────────────────────
  function saveProgress() {
    try { localStorage.setItem('eoe_save', JSON.stringify(progress)); } catch(_) {}
  }
  function loadProgress() {
    try {
      const s = localStorage.getItem('eoe_save');
      if (s) progress = JSON.parse(s);
    } catch(_) {}
  }

  // ── INTRO — plays intro.mp4 as background, then shows home ──────────────
  function setupIntroScreen() {
    // Intro screen is now just the Home screen with video background
    // We go straight to home
    Transitions.showScreen('screen-home');
  }

  // ── HOME ──────────────────────────────────────────────────────────────────
  function setupHomeScreen() {
    // Start looping intro video background
    const vid = document.getElementById('home-bg-video');
    if (vid) { vid.play().catch(() => {}); }

    document.getElementById('btn-start').addEventListener('click', () => {
      Audio.playSFX('click');
      playStoryVideo('ocean', 1);
    });
    document.getElementById('btn-settings').addEventListener('click', () => {
      Audio.playSFX('click');
      document.getElementById('modal-settings').classList.remove('hidden');
    });
    document.getElementById('btn-quit').addEventListener('click', () => { window.close(); });
    document.getElementById('btn-settings-close').addEventListener('click', () => {
      Audio.playSFX('click');
      document.getElementById('modal-settings').classList.add('hidden');
    });
  }

  // ── STORY VIDEO → TITLE CARD → GAME ──────────────────────────────────────
  function playStoryVideo(story, level) {
    const screen   = document.getElementById('screen-story-video');
    const videoEl  = document.getElementById('story-video');
    const titleEl  = document.getElementById('story-video-title');
    const skipBtn  = document.getElementById('btn-skip-video');
    const storyData = GameData.stories[story];

    // Choose correct video file per story
    const videoSrc = story === 'garden'
      ? 'assests/video/story_2.mp4'
      : 'assests/video/story_1.mp4';

    Transitions.goTo('screen-story-video', { fadeDuration: 500 }).then(() => {
      videoEl.src = videoSrc;
      videoEl.currentTime = 0;
      titleEl.classList.remove('visible');

      let proceeded = false;

      function proceed() {
        if (proceeded) return;
        proceeded = true;
        videoEl.removeEventListener('ended', proceed);
        skipBtn.removeEventListener('click', skipHandler);
        videoEl.pause();
        titleEl.textContent = storyData.introTitle;
        titleEl.classList.add('visible');
        setTimeout(() => { titleEl.classList.remove('visible'); }, 3000);
        setTimeout(() => {
          prepareLevel(story, level);
        }, 3800);
      }

      function skipHandler() {
        proceed();
      }

      videoEl.addEventListener('ended', proceed);
      videoEl.addEventListener('error', proceed);
      skipBtn.addEventListener('click', skipHandler);
      videoEl.play().catch(proceed);
    });
  }

  // ── STORY SELECTION ────────────────────────────────────────────────────────
  function setupStoryScreen() {
    document.querySelectorAll('.story-card.available').forEach(card => {
      card.addEventListener('click', () => {
        const story = card.dataset.story;
        if (!story) return;
        Audio.playSFX('click');
        currentStory = story;
        buildLevelScreen(story);
        Transitions.slideScreen('screen-level');
      });
    });
    document.getElementById('btn-story-back').addEventListener('click', () => {
      Audio.playSFX('click');
      Transitions.goTo('screen-home');
    });
  }

  // ── LEVEL SELECTION ────────────────────────────────────────────────────────
  function buildLevelScreen(story) {
    const data   = GameData.stories[story];
    const titleEl = document.getElementById('level-screen-title');
    const pathEl  = document.getElementById('level-path');
    titleEl.textContent = data.title + ' — Select Level';
    pathEl.innerHTML    = '';

    for (let i = 1; i <= data.levels; i++) {
      const done  = progress[story].levelsCompleted.includes(i);
      const avail = i === 1 || progress[story].levelsCompleted.includes(i - 1);
      const node  = document.createElement('div');
      node.className = `level-node ${done ? 'completed' : avail ? 'available' : 'locked'}`;
      node.innerHTML = `<div class="level-num">${done ? '✓' : i}</div><div>Case ${i}</div>`;
      if (avail || done) {
        node.addEventListener('click', () => {
          Audio.playSFX('click');
          currentLevel = i;
          prepareLevel(story, i);
        });
      }
      pathEl.appendChild(node);
    }
  }

  function setupLevelScreen() {
    document.getElementById('btn-level-back').addEventListener('click', () => {
      Audio.playSFX('click');
      Transitions.slideScreen('screen-story', 'right');
    });
  }

  // ── LEVEL PREP ────────────────────────────────────────────────────────────
  function prepareLevel(story, level) {
    currentStory = story;
    currentLevel = level;
    const sd = GameData.stories[story];

    collectedClues = [];
    UI.clearAll();
    UI.showGoInvestigation(false);

    // Hide objective panel for both stories — top-left bar not needed
    const objPanel = document.getElementById('objective-panel');
    objPanel.classList.add('hidden');

    // Apply themed dialogue box style
    const dlgBox = document.getElementById('dialogue-box');
    const cluePanel = document.getElementById('clue-panel');
    const hint = document.getElementById('interaction-hint');
    if (story === 'garden') {
      dlgBox.classList.add('garden-theme');
      cluePanel.classList.add('garden-theme');
      hint.classList.add('garden-theme');
    } else {
      dlgBox.classList.remove('garden-theme');
      cluePanel.classList.remove('garden-theme');
      hint.classList.remove('garden-theme');
    }

    bgImage = new Image();
    bgImage.src = sd.background;

    NPCManager.init(GameData.npcs[story]);
    ObjectManager.init(GameData.objects[story]);

    totalClues = GameData.npcs[story].length + GameData.objects[story].length;
    UI.setClueCount(0, totalClues);
    UI.setObjective(`Explore ${sd.location}. Collect all ${totalClues} clues.`);

    Audio.stopMusic(true);
    setTimeout(() => Audio.playMusic(sd.ambient), 800);

    // Go directly to gameplay
    Transitions.goTo('screen-gameplay', {
      fadeDuration: 600,
      onMidpoint: () => {
        resizeCanvas();
        Player.setPosition(canvas.width * 0.18, canvas.height * 0.72);
      },
    }).then(() => {
      startGameLoop();
      // Show Hassel's opening thought for Story 2 (garden)
      if (story === 'garden') {
        setTimeout(() => showHasselOpeningThought(), 1200);
      }
    });
  }

  // ── HASSEL OPENING THOUGHTS ───────────────────────────────────────────────
  function showHasselOpeningThought() {
    if (Dialogue.isActive()) return;
    const openingLines = [
      { side:'thought', speaker:'Hassel', hassleExpr:'lookaround',
        text: "This city was abandoned in a single day. Thousands of people left everything behind. They thought they would return in three days. They never came back." },
      { side:'thought', speaker:'Hassel', hassleExpr:'sad',
        text: "Now the garden has gone silent. And I need to understand why." },
    ];
    Player.setState('lookaround');
    Dialogue.open('', '', openingLines, () => {
      Player.setState('idle');
    });
  }

  // ── GAMEPLAY CONTROLS ─────────────────────────────────────────────────────
  function setupGameplayControls() {
    document.addEventListener('keydown', e => {
      if (!gameRunning) return;

      if (e.code === 'Escape') {
        if (Dialogue.isActive()) return;
        UI.isPaused() ? UI.closePause() : UI.openPause();
        return;
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        if (UI.isPaused() || Dialogue.isActive()) return;
        UI.isNotebookOpen() ? UI.closeNotebook() : UI.openNotebook();
        return;
      }
      if (e.code === 'KeyE') {
        e.preventDefault();
        if (UI.isPaused() || UI.isNotebookOpen()) return;
        if (Dialogue.isActive()) { Dialogue.showNext(); return; }
        tryInteract();
        return;
      }
      // Space also advances dialogue
      if (e.code === 'Space') {
        if (Dialogue.isActive()) { e.preventDefault(); Dialogue.showNext(); return; }
      }
      if (e.code === 'Enter') {
        if (collectedClues.length >= totalClues) goToInvestigation();
      }
    });

    document.getElementById('go-investigation').addEventListener('click', goToInvestigation);
    document.getElementById('btn-return-story').addEventListener('click', () => {
      Audio.playSFX('click');
      Audio.stopMusic(true);
      Transitions.goTo('screen-home');
    });
    document.getElementById('btn-next-story').addEventListener('click', () => {
      Audio.playSFX('click');
      Audio.stopMusic(true);
      playStoryVideo('garden', 1);
    });
  }

  function setupCluePanelToggle() {
    const header = document.getElementById('clue-panel-header');
    const panel  = document.getElementById('clue-panel');
    header.addEventListener('click', () => {
      panel.classList.toggle('collapsed');
      document.getElementById('clue-panel-toggle').textContent =
        panel.classList.contains('collapsed') ? '▶' : '▼';
    });
  }

  // ── INTERACT ──────────────────────────────────────────────────────────────
  function tryInteract() {
    if (echoActive) return;
    const { x, y } = Player.getPosition();
    const npc = NPCManager.checkProximity(x, y);
    if (npc && !npc.interacted) { interactWithNPC(npc); return; }
    const obj = ObjectManager.checkProximity(x, y);
    if (obj && !obj.interacted) { interactWithObject(obj); }
  }

  function interactWithNPC(npc) {
    if (echoCooldown > 0) return;
    // Reset any stale state before starting
    echoActive = false;
    Player.setState('think');
    UI.activateEcho();
    echoActive = true;
    NPCManager.setGlow(npc.id, true);
    Audio.playSFX('echo_activate');

    setTimeout(() => {
      Player.setState('echo');
      const npcSrc = npc.imgStatic?.src || npc.sheet?.static?.src || '';
      Dialogue.open(npc.name, npcSrc, npc.dialogue, () => {
        collectClue(npc);
        Player.setExpression(npc.expression || 'happy', 3000);
        Player.setState('write');
        setTimeout(() => {
          UI.deactivateEcho();
          echoActive = false;
          echoCooldown = 2000;
          Player.setState('idle');
          NPCManager.setGlow(npc.id, false);
          NPCManager.markInteracted(npc.id);
          Audio.playSFX('clue_found');
          UI.flashCluePanel();
        }, 1600);
      });
    }, 400);
  }

  function interactWithObject(obj) {
    if (echoCooldown > 0) return;
    // Reset any stale state before starting
    echoActive = false;
    Player.setState('think');
    if (!obj.thoughtOnly) UI.activateEcho();
    echoActive = true;
    Audio.playSFX('echo_activate');

    setTimeout(() => {
      Player.setState('echo');
      Dialogue.open(obj.name, '', obj.dialogue, () => {
        collectClue(obj);
        Player.setExpression('determined', 3000);
        Player.setState('write');
        setTimeout(() => {
          UI.deactivateEcho();
          echoActive = false;
          echoCooldown = 2000;
          Player.setState('idle');
          ObjectManager.markInteracted(obj.id);
          Audio.playSFX('clue_found');
          UI.flashCluePanel();
        }, 1600);
      });
    }, 400);
  }

  function collectClue(entity) {
    if (collectedClues.find(c => c.id === entity.id)) return;
    collectedClues.push({ id: entity.id, clue: entity.clue });
    UI.addEntry(entity.clue.title, entity.clue.text);
    UI.setClueCount(collectedClues.length, totalClues);
    if (collectedClues.length >= totalClues) {
      UI.setObjective('All clues found! Go to the Investigation Room.');
      UI.showGoInvestigation(true);
    } else {
      UI.setObjective(`${collectedClues.length}/${totalClues} clues collected. Keep exploring.`);
    }
  }

  // ── INVESTIGATION ─────────────────────────────────────────────────────────
  function goToInvestigation() {
    if (collectedClues.length < totalClues) return;
    UI.showGoInvestigation(false);
    stopGameLoop();
    Transitions.goTo('screen-investigation', {
      fadeDuration: 800,
      onMidpoint: () => {
        const sd = GameData.stories[currentStory];
        Investigation.init(collectedClues, GameData.connections[currentStory], sd.caseName, onCaseSolved);
      },
    });
  }

  function onCaseSolved() {
    if (!progress[currentStory].levelsCompleted.includes(currentLevel)) {
      progress[currentStory].levelsCompleted.push(currentLevel);
      saveProgress();
    }
    const sd = GameData.stories[currentStory];
    const isGarden = currentStory === 'garden';

    Transitions.goTo('screen-solved', {
      fadeDuration: 800,
      onMidpoint: () => {
        document.getElementById('solved-title').textContent = `${sd.caseName} — Solved!`;
        document.getElementById('solved-summary').textContent = sd.summary;
        document.getElementById('solved-final-words').textContent = sd.finalWords;

        const nextBtn    = document.getElementById('btn-next-story');
        const returnBtn  = document.getElementById('btn-return-story');

        if (isGarden) {
          // Garden: hide "next story", relabel "Return" to lead into outro
          nextBtn.classList.add('hidden');
          returnBtn.textContent = 'Continue →';
          returnBtn.onclick = (e) => {
            e.stopImmediatePropagation();
            returnBtn.textContent = 'Return to Story Selection'; // reset for next time
            returnBtn.onclick = null;
            playOutro();
          };
        } else {
          nextBtn.classList.remove('hidden');
          returnBtn.textContent = 'Return to Story Selection';
          returnBtn.onclick = null;
        }
      },
    });
  }

  // ── OUTRO (Story 2 ending) ────────────────────────────────────────────────
  function playOutro() {
    const videoEl    = document.getElementById('outro-video');
    const comingSoon = document.getElementById('outro-coming-soon');

    Audio.stopMusic(true);

    // Reset state
    comingSoon.classList.remove('visible');
    comingSoon.style.opacity = '0';
    videoEl.style.opacity    = '1';
    videoEl.style.transition = '';

    Transitions.goTo('screen-outro', { fadeDuration: 700 }).then(() => {
      videoEl.src = 'assests/video/outro.mp4';
      videoEl.currentTime = 0;

      function onVideoDone() {
        // Fade out the video over 0.9s, revealing pure black bg underneath
        videoEl.style.transition = 'opacity 0.9s ease';
        videoEl.style.opacity    = '0';

        setTimeout(() => {
          // Now on pure black — animate in the Coming Soon text
          comingSoon.classList.add('visible');

          // After 5s return to home screen
          setTimeout(() => {
            Transitions.goTo('screen-home', { fadeDuration: 1000 }).then(() => {
              videoEl.src = '';
              videoEl.style.opacity = '1';
              videoEl.style.transition = '';
              comingSoon.classList.remove('visible');
              comingSoon.style.opacity = '0';
            });
          }, 5000);
        }, 950);
      }

      videoEl.addEventListener('ended', onVideoDone, { once: true });
      videoEl.addEventListener('error', onVideoDone, { once: true });
      videoEl.play().catch(onVideoDone);
    });
  }

  // ── GAME LOOP ─────────────────────────────────────────────────────────────
  function startGameLoop() {
    gameRunning = true;
    lastTime    = performance.now();
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
  }

  function stopGameLoop() {
    gameRunning = false;
    if (animId) { cancelAnimationFrame(animId); animId = null; }
  }

  function loop(ts) {
    if (!gameRunning) return;
    const dt = Math.min(ts - lastTime, 50); // cap dt to avoid spiral of death
    lastTime  = ts;
    update(dt);
    render();
    animId = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (UI.isPaused() || Dialogue.isActive()) return;
    if (echoCooldown > 0) echoCooldown -= dt;
    Player.update(dt, canvas.width, canvas.height);
    NPCManager.update(dt, canvas.width, canvas.height);
    const { x, y } = Player.getPosition();
    ObjectManager.update(x, y, canvas.width, canvas.height);

    // ── Collision resolution ──────────────────────────────────────────────
    const PLAYER_RADIUS = 20;
    const npcPush = NPCManager.resolveCollision(x, y, PLAYER_RADIUS);
    if (npcPush) Player.nudge(npcPush.dx, npcPush.dy);
    const objPush = ObjectManager.resolveCollision(x, y, PLAYER_RADIUS);
    if (objPush) Player.nudge(objPush.dx, objPush.dy);

    const npc = NPCManager.checkProximity(x, y);
    const obj = ObjectManager.checkProximity(x, y);
    const near = (npc && !npc.interacted) || (obj && !obj.interacted);
    UI.showHint(near && !Dialogue.isActive() && !echoActive);
  }

  function render() {
    resizeCanvas();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
      drawFallbackBG();
    }

    ObjectManager.draw(ctx, canvas.width, canvas.height);
    NPCManager.draw(ctx);
    Player.draw(ctx);
  }

  function resizeCanvas() {
    const W = canvas.parentElement?.offsetWidth  || window.innerWidth;
    const H = canvas.parentElement?.offsetHeight || window.innerHeight;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width  = W;
      canvas.height = H;
    }
  }

  function drawFallbackBG() {
    const isOcean = currentStory === 'ocean';
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    if (isOcean) {
      g.addColorStop(0, '#081830'); g.addColorStop(0.6, '#183860'); g.addColorStop(1, '#0a2040');
    } else {
      g.addColorStop(0, '#101a08'); g.addColorStop(0.5, '#1e3010'); g.addColorStop(1, '#101a08');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = 'italic 13px Georgia';
    ctx.textAlign = 'right';
    ctx.fillText(isOcean ? 'Hashima Island, Japan — 2157' : 'Pripyat, Ukraine — 2157', canvas.width - 14, canvas.height - 14);
    ctx.textAlign = 'left';
  }

  return { init };
})();

// ── Start ─────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => Game.init());
