// ===== NPC MANAGER =====
const NPCManager = (() => {
  let npcs = [];
  const INTERACT_DIST = 120;
  const imgCache = {};

  const TARGET_H = {
    clownfish:  110, sea_turtle: 120, octopus: 150,
    coral: 80, whale: 170,
    butterfly: 48, daisy: 80, mushroom: 70, oak_tree: 280, robin: 72,
  };

  // Animation fps per NPC
  const ANIM_FPS = {
    clownfish: 10, sea_turtle: 4, octopus: 4,
    coral: 2, whale: 6,
    butterfly: 9, daisy: 3, mushroom: 3, oak_tree: 2, robin: 8,
  };

  // Per-NPC horizontal inset (px) to trim from each side of the source frame
  // — eliminates frame-bleed from sprite sheet gaps
  const FRAME_INSET = {
    sea_turtle: 40,   // each turtle frame has ~40px of padding on each side
  };

  function loadImg(src) {
    if (!imgCache[src]) { const i = new Image(); i.src = src; imgCache[src] = i; }
    return imgCache[src];
  }

  function init(npcDataList) {
    // NOTE: we do NOT resolve pixel positions here — canvas may not be sized yet.
    // All pixel positions are resolved every frame in update() using live cW/cH.
    npcs = npcDataList.map(d => {
      const sheet = GameData.npcSheets[d.sheetKey];
      const tH    = TARGET_H[d.id] || 100;
      const srcH  = d.useStaticSprite ? sheet.static.h : sheet.mov.fh;
      const rH    = tH;
      const srcW  = d.useStaticSprite ? sheet.static.w : sheet.mov.fw;
      const rW    = Math.round(srcW * (tH / srcH));

      return {
        ...d,
        sheet, rW, rH,
        imgMov:    loadImg(sheet.mov.src),
        imgStatic: loadImg(sheet.static.src),
        // World x/y — set properly on first update
        x: -9999, y: -9999,
        movFrame: 0, movTimer: 0,
        flipX: false,
        interacted: false, nearPlayer: false, glowing: false,
        _inited: false,   // flag: first-frame position init done
        // loop state
        _lx: null, _ly: null,  // live loop x/y
        // wander state
        _angle: Math.random() * Math.PI * 2,
        _angSpeed: d.id === 'octopus'
          ? (0.0008 + Math.random() * 0.0006)
          : d.id === 'daisy' || d.id === 'mushroom'
            ? (0.0006 + Math.random() * 0.0004)   // very slow gentle sway
            : (0.002  + Math.random() * 0.002),
      };
    });
  }

  function update(dt, cW, cH) {
    // Use real canvas dimensions every frame
    if (!cW || !cH || cW < 100 || cH < 100) return;

    // Seafloor = ~82% of canvas height (matches the bg art)
    const FLOOR = cH * 0.82;

    npcs.forEach(n => {

      // ── First-frame position init (canvas is now properly sized) ──────────
      if (!n._inited) {
        n._inited = true;

        if (n.movType === 'loop') {
          const dir = n.loopDir || 1;
          n._lx = dir > 0 ? -n.rW : cW + n.rW;
          n._ly = cH * n.yMin + Math.random() * cH * (n.yMax - n.yMin);
          // Clownfish bounce direction — starts matching loop direction
          if (n.id === 'clownfish') n._bounceDir = dir;
          // Butterfly / robin zigzag: track phase separately
          if (n.zigzag) {
            n._zigPhase = Math.random() * Math.PI * 2;
          }

        } else if (n.movType === 'wander') {
          // Octopus → bottom-left reef floor
          if (n.id === 'octopus') {
            n._cx = cW * 0.22;
            n._cy = FLOOR;
          // Garden wander NPCs — use xFrac/yFrac if provided
          } else if (n.xFrac != null) {
            n._cx = n.xFrac * cW;
            n._cy = n.yFrac != null ? n.yFrac * cH : FLOOR;
          } else {
            n._cx = n.x > 0 ? n.x : cW * 0.5;
            n._cy = n.y > 0 ? n.y : FLOOR;
          }

        } else if (n.movType === 'static') {
          if (n.fixedReefPlacement) {
            // Coral sits on the reef rocks — shifted up slightly
            n.x = cW * 0.10 + Math.random() * cW * 0.06;
            n.y = cH * 0.58 + Math.random() * cH * 0.03;
          } else if (n.xFrac != null) {
            // Garden NPCs with fractional positions
            n.x = n.xFrac * cW;
            n.y = n.yFrac != null ? n.yFrac * cH : FLOOR;
          } else {
            n.x = n.x > 0 ? n.x : cW * 0.5;
            n.y = n.y > 0 ? n.y : FLOOR;
          }
        }
      }

      // ── Movement ──────────────────────────────────────────────────────────
      if (n.movType === 'loop') {
        const dir  = n.loopDir || 1;
        const yMin = cH * n.yMin;
        const yMax = cH * n.yMax;
        if (n.id === 'clownfish' && n.interacted) {
          n._lx += n.speed * n._bounceDir * (dt / 16);
          // Bounce off left/right margins
          const margin = n.rW * 0.6;
          if (n._lx > cW - margin) { n._lx = cW - margin; n._bounceDir = -1; n.flipX = true; }
          if (n._lx < margin)       { n._lx = margin;       n._bounceDir =  1; n.flipX = false; }
          // Gentle vertical drift
          n._ly += Math.sin(Date.now() * 0.0004 + n._lx * 0.003) * 0.3;
          n._ly  = Math.max(yMin, Math.min(yMax, n._ly));
          n.x = n._lx;
          n.y = n._ly;
        } else {
          n._lx += n.speed * dir * (dt / 16);

          if (n.zigzag) {
            // Zigzag: vertical position driven by a sine wave keyed to horizontal travel
            n._zigPhase += n.zigzagSpeed * (dt / 16);
            const mid  = cH * ((n.yMin + n.yMax) / 2);
            const amp  = cH * (n.yMax - n.yMin) / 2;
            n._ly = mid + Math.sin(n._zigPhase) * amp;
          } else {
            // Gentle vertical sine — tiny amplitude so creatures stay in band
            n._ly += Math.sin(Date.now() * 0.0005 + n._lx * 0.004) * 0.4;
          }
          n._ly  = Math.max(cH * n.yMin, Math.min(cH * n.yMax, n._ly));

          // Wrap at screen edges
          if (dir > 0 && n._lx >  cW + n.rW * 1.5) {
            n._lx = -n.rW * 1.5;
            n._ly = yMin + Math.random() * (yMax - yMin);
          }
          if (dir < 0 && n._lx < -n.rW * 1.5) {
            n._lx = cW + n.rW * 1.5;
            n._ly = yMin + Math.random() * (yMax - yMin);
          }

          n.x     = n._lx;
          n.y     = n._ly;
          n.flipX = dir < 0;
        }

      } else if (n.movType === 'wander') {
        n._angle += n._angSpeed * (dt / 16);
        n.x = n._cx + Math.cos(n._angle) * n.patrolRadius;
        n.y = n._cy + Math.sin(n._angle) * n.patrolRadius * 0.3;
        n.flipX = Math.cos(n._angle) < 0;
      }

      // ── Sprite animation ──────────────────────────────────────────────────
      if (!n.useStaticSprite) {
        n.movTimer += dt;
        const fps = ANIM_FPS[n.id] || 8;
        if (n.movTimer >= 1000 / fps) {
          n.movTimer -= 1000 / fps;
          n.movFrame  = (n.movFrame + 1) % n.sheet.mov.frames;
        }
      }
    });
  }

  function draw(ctx) {
    // Whale drawn first (furthest back)
    const sorted = [...npcs].sort((a, b) =>
      a.id === 'whale' ? -1 : b.id === 'whale' ? 1 : 0
    );

    sorted.forEach(n => {
      if (n.x === -9999) return; // not inited yet
      const rw = n.rW, rh = n.rH;

      // Echo glow
      if (n.glowing) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        const gr = ctx.createRadialGradient(n.x, n.y - rh/2, 6, n.x, n.y - rh/2, rw);
        gr.addColorStop(0, '#ffe060'); gr.addColorStop(1, 'transparent');
        ctx.fillStyle = gr;
        ctx.beginPath(); ctx.arc(n.x, n.y - rh/2, rw, 0, Math.PI*2); ctx.fill();
        ctx.restore();
      }

      ctx.save();
      if (n.flipX) { ctx.translate(n.x * 2, 0); ctx.scale(-1, 1); }

      // Clownfish always uses animated movement sprite
      const useStatic = n.useStaticSprite && n.id !== 'clownfish';
      if (useStatic) {
        const img = n.imgStatic, st = n.sheet.static;
        const sw  = Math.round(st.w * (rh / st.h));
        if (img?.complete && img.naturalWidth > 0)
          ctx.drawImage(img, 0, 0, st.w, st.h, n.x - sw/2, n.y - rh, sw, rh);
      } else {
        const mov = n.sheet.mov;
        const img = n.imgMov;
        if (img?.complete && img.naturalWidth > 0) {
          // Derive true frame width from actual image if not yet cached
          if (!n._realFW) n._realFW = Math.floor(img.naturalWidth / mov.frames);
          const fw      = n._realFW;
          const inset   = FRAME_INSET[n.id] || 0;
          const srcX    = n.movFrame * fw + inset;
          const srcW    = Math.max(1, fw - inset * 2);
          const renderW = Math.round(srcW * (rh / mov.fh));
          const destX   = n.x - renderW / 2;

          // Clip strictly to destination rect — prevents any bleed from adjacent frames
          ctx.beginPath();
          ctx.rect(destX, n.y - rh, renderW, rh);
          ctx.clip();

          ctx.drawImage(img, srcX, 0, srcW, mov.fh, destX, n.y - rh, renderW, rh);
        } else {
          const si = n.imgStatic, st = n.sheet.static;
          const sw = Math.round(st.w * (rh / st.h));
          if (si?.complete && si.naturalWidth > 0)
            ctx.drawImage(si, 0, 0, st.w, st.h, n.x - sw/2, n.y - rh, sw, rh);
        }
      }
      ctx.restore();

      // Interaction tag
      if (n.nearPlayer && !n.interacted)
        drawTag(ctx, n.x, n.y - rh - 10, `[E] ${n.name}`, n.glowing ? '#ffe060' : '#a8d4f8');

      // Collected indicator — small checkmark badge (skip for clownfish, it stays animated)
      if (n.interacted && n.id !== 'clownfish') {
        ctx.save();
        ctx.font = 'bold 18px serif'; ctx.fillStyle = '#4caf50'; ctx.textAlign = 'center';
        ctx.fillText('✓', n.x + rw * 0.4, n.y - rh - 2);
        ctx.restore();
      }
    });
  }

  function drawTag(ctx, cx, ty, text, color) {
    ctx.save();
    ctx.font = '12px Georgia';
    const tw = ctx.measureText(text).width + 18, th = 22, r = 5;
    const tx = cx - tw / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(tx+r,ty); ctx.lineTo(tx+tw-r,ty); ctx.arcTo(tx+tw,ty,tx+tw,ty+th,r);
    ctx.lineTo(tx+tw,ty+th-r); ctx.arcTo(tx+tw,ty+th,tx+tw-r,ty+th,r);
    ctx.lineTo(tx+r,ty+th); ctx.arcTo(tx,ty+th,tx,ty+th-r,r);
    ctx.lineTo(tx,ty+r); ctx.arcTo(tx,ty,tx+r,ty,r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, ty + th/2);
    ctx.restore();
  }

  function resolveCollision(px, py, pr) {
    for (const n of npcs) {
      if (!n.solid || n.x === -9999) continue;
      const hw = n.rW * 0.35, hh = n.rH * 0.25;
      const nx = n.x, ny = n.y - n.rH * 0.4;
      const dx = px - nx, dy = py - ny;
      const tw = pr + hw, th2 = pr + hh;
      if (Math.abs(dx) < tw && Math.abs(dy) < th2) {
        const px2 = tw - Math.abs(dx), py2 = th2 - Math.abs(dy);
        return px2 < py2
          ? { dx: px2 * Math.sign(dx), dy: 0 }
          : { dx: 0, dy: py2 * Math.sign(dy) };
      }
    }
    return null;
  }

  function checkProximity(px, py) {
    let closest = null, minD = Infinity;
    npcs.forEach(n => {
      const d = Math.hypot(n.x - px, n.y - py);
      n.nearPlayer = d < INTERACT_DIST;
      if (d < INTERACT_DIST && d < minD) { minD = d; closest = n; }
    });
    return closest;
  }

  function setGlow(id, v)    { const n = npcs.find(n=>n.id===id); if(n) n.glowing=v; }
  function markInteracted(id){ const n = npcs.find(n=>n.id===id); if(n) n.interacted=true; }
  function getAll()          { return npcs; }

  return { init, update, draw, checkProximity, resolveCollision, setGlow, markInteracted, getAll };
})();
