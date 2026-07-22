const Player = (() => {
  const SPEED      = 3.2;
  const RUN_SPEED  = 6.0;
  const RENDER_H   = 170;
  const IDLE_TIME  = 3000;

  const WALK_Y_MIN_FRAC = 0.08;
  const WALK_Y_MAX_FRAC = 0.92;

  let x = 400, y = 450;
  let facing    = 'down';
  let state     = 'idle';
  let expression = '';
  let exprTimer  = 0;

  let idleTimer     = 0;
  let lookingAround = false;

  let frame     = 0;
  let frameTimer = 0;

  const keys = {};
  document.addEventListener('keydown', e => { keys[e.code] = true; });
  document.addEventListener('keyup',   e => { keys[e.code] = false; });

  const imgs = {};
  const defs = GameData.hassel.sheets;
  Object.entries(defs).forEach(([key, def]) => {
    const img = new Image();
    img.src = def.src;
    imgs[key] = img;
  });

  function getSheet() {
    if (expression && exprTimer > 0) {
      const expMap = {
        happy:'happy', sad:'sad', worried:'worried', determined:'determined',
        shock:'shock', smile:'smile',
      };
      if (expMap[expression]) return expMap[expression];
    }
    if (state === 'echo')  return 'echo';
    if (state === 'think') return 'thinking';
    if (state === 'write') return (Math.floor(Date.now()/500)%2 === 0) ? 'write_sit' : 'write_stand';
    if (state === 'run')   return 'run';
    if (state === 'walk')  return 'walk';
    if (lookingAround)          return 'lookaround';
    if (facing === 'up')        return 'idle_back';
    if (facing === 'down')      return 'idle_front';
    return 'idle_side';
  }

  function isMoving() {
    return keys['KeyW']||keys['KeyS']||keys['KeyA']||keys['KeyD']||
           keys['ArrowUp']||keys['ArrowDown']||keys['ArrowLeft']||keys['ArrowRight'];
  }

  function isRunning() {
    return (keys['ShiftLeft']||keys['ShiftRight']) && isMoving();
  }

  function update(dt, cW, cH) {
    if (state === 'echo') return;
    if (state === 'think' || state === 'write' || state === 'interact') {
      if (isMoving()) {
        state = 'idle';
        expression = '';
        exprTimer  = 0;
      } else {
        return;
      }
    }

    let vx = 0, vy = 0;
    const spd = isRunning() ? RUN_SPEED : SPEED;

    if (keys['KeyW']||keys['ArrowUp'])    { vy = -spd; facing = 'up'; }
    if (keys['KeyS']||keys['ArrowDown'])  { vy =  spd; facing = 'down'; }
    if (keys['KeyA']||keys['ArrowLeft'])  { vx = -spd; facing = 'left'; }
    if (keys['KeyD']||keys['ArrowRight']) { vx =  spd; facing = 'right'; }

    if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

    const margin = 30;
    const yMin   = cH * WALK_Y_MIN_FRAC;
    const yMax   = cH * WALK_Y_MAX_FRAC;
    x = Math.max(margin, Math.min(cW - margin, x + vx));
    y = Math.max(yMin,   Math.min(yMax, y + vy));

    if (isMoving()) {
      state         = isRunning() ? 'run' : 'walk';
      idleTimer     = 0;
      lookingAround = false;
    } else {
      state = 'idle';
      idleTimer += dt;
      if (idleTimer > IDLE_TIME) lookingAround = true;
    }

    if (exprTimer > 0) {
      exprTimer -= dt;
      if (exprTimer <= 0) expression = '';
    }

    const sheetKey = getSheet();
    const def = defs[sheetKey];
    if (def && def.frames > 1) {
      frameTimer += dt;
      const interval = 1000 / def.fps;
      if (frameTimer >= interval) {
        frameTimer -= interval;
        frame = (frame + 1) % def.frames;
      }
    } else {
      frame = 0;
      frameTimer = 0;
    }
  }

  function draw(ctx) {
    const sheetKey = getSheet();
    const def      = defs[sheetKey];
    const img      = imgs[sheetKey];
    if (!def) return;

    const scale = RENDER_H / def.h;
    const rw    = Math.round(def.w * scale);
    const rh    = RENDER_H;

    ctx.save();

    if (facing === 'left') {
      ctx.translate(x * 2, 0);
      ctx.scale(-1, 1);
    }

    if (img && img.complete && img.naturalWidth > 0) {
      const srcX = frame * def.w;
      ctx.drawImage(img, srcX, 0, def.w, def.h, x - rw/2, y - rh + 10, rw, rh);
    } else {
      ctx.fillStyle = '#e8dcc8';
      ctx.beginPath();
      ctx.ellipse(x, y - 20, 14, 20, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#2a5a2a';
      ctx.beginPath();
      ctx.moveTo(x-16, y); ctx.lineTo(x+16, y); ctx.lineTo(x+12, y+24); ctx.lineTo(x-12, y+24);
      ctx.closePath(); ctx.fill();
    }

    ctx.restore();
  }

  function setPosition(nx, ny)  { x = nx; y = ny; }
  function getPosition()        { return { x, y }; }
  function nudge(dx, dy)        { x += dx; y += dy; }
  function setState(s)          { state = s; if (s !== 'walk' && s !== 'run') { frame = 0; frameTimer = 0; } }
  function getState()           { return state; }
  function setExpression(e, ms) { expression = e; exprTimer = ms || 3000; }
  function getFacing()          { return facing; }
  function getRect()            {
    const rh = RENDER_H, rw = 48;
    return { x: x - rw/2, y: y - rh + 10, w: rw, h: rh };
  }

  return { update, draw, setPosition, getPosition, nudge, setState, getState, setExpression, getFacing, getRect, keys };
})();
