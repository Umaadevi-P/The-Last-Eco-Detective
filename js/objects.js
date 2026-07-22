const ObjectManager = (() => {
  let objects = [];
  const INTERACT_DIST = 100;
  const imgCache = {};

  function loadImg(src) {
    if (!imgCache[src]) { const i = new Image(); i.src = src; imgCache[src] = i; }
    return imgCache[src];
  }

  function init(dataList) {
    objects = dataList.map(d => ({
      ...d,
      img:        loadImg(d.src),
      interacted: false,
      nearPlayer: false,
      bobOffset:  Math.random() * Math.PI * 2,
      _inited:    false,
      x: -9999, y: -9999,
    }));
  }

  function update(playerX, playerY, cW, cH) {
    if (!cW || !cH || cW < 100) return;
    const FLOOR = cH * 0.84;

    objects.forEach(o => {
      if (!o._inited) {
        o._inited = true;
        o.x = (o.xFrac != null ? o.xFrac * cW : o.xPx || cW * 0.5);
        o.y = (o.yFrac != null ? o.yFrac * cH : (o.yPx || FLOOR));
      }
      const dist = o.yFrac != null && o.yFrac < 0.5
        ? Math.abs(o.x - playerX)
        : Math.hypot(o.x - playerX, o.y - playerY);
      o.nearPlayer = dist < INTERACT_DIST;
    });
  }

  function draw(ctx, cW, cH) {
    const t = Date.now() / 1000;
    objects.forEach(o => {
      if (o.x === -9999) return;

      const scale = (cH || 720) / 720;
      const dw = Math.round(o.w * scale);
      const dh = Math.round(o.h * scale);

      ctx.save();
      if (o.interacted) ctx.globalAlpha = 0.45;

      const bob = (o.interacted || o.static) ? 0 : Math.sin(t * 1.3 + o.bobOffset) * 3;
      const dy  = o.y + bob;

      if (o.isFinal && !o.interacted) {
        ctx.globalAlpha = (o.interacted ? 0.45 : 1) * (0.3 + 0.15 * Math.sin(t * 2));
        const grd = ctx.createRadialGradient(o.x, dy - dh/2, 4, o.x, dy - dh/2, 55);
        grd.addColorStop(0, '#ffd700'); grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(o.x, dy - dh/2, 55, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = o.interacted ? 0.45 : 1;
      }

      const img = o.img;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, o.x - dw/2, dy - dh, dw, dh);
      } else {
        ctx.fillStyle = o.isFinal ? '#ffd700' : '#5588aa';
        ctx.beginPath(); ctx.arc(o.x, dy - dh/2, 24, 0, Math.PI*2); ctx.fill();
      }

      ctx.restore();

      if (o.nearPlayer && !o.interacted) {
        drawTag(ctx, o.x, dy - dh - 8, `[E] ${o.name}`, o.isFinal ? '#ffd700' : '#7dd4f8');
      }

      if (o.interacted) {
        ctx.save();
        ctx.font = `bold ${Math.round(16*scale)}px serif`;
        ctx.fillStyle = '#4caf50'; ctx.textAlign = 'center';
        ctx.fillText('✓', o.x + dw * 0.4, dy - dh + 4);
        ctx.restore();
      }
    });
  }

  function drawTag(ctx, cx, ty, text, color) {
    ctx.save();
    ctx.font = '12px Georgia';
    const tw = ctx.measureText(text).width + 18, th = 22, r = 5;
    const tx = cx - tw/2;
    ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.strokeStyle = color; ctx.lineWidth = 1.5;
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

  function checkProximity(px, py) {
    let closest = null, minD = Infinity;
    objects.forEach(o => {
      if (o.interacted || o.x === -9999) return;
      const d = Math.hypot(o.x - px, o.y - py);
      if (d < INTERACT_DIST && d < minD) { minD = d; closest = o; }
    });
    return closest;
  }

  function resolveCollision(px, py, pr) {
    for (const o of objects) {
      if (!o.solid || o.x === -9999) continue;
      const hw = o.w * 0.38, hh = o.h * 0.22;
      const ox = o.x, oy = o.y - o.h * 0.32;
      const dx = px - ox, dy = py - oy;
      const tw = pr + hw, th2 = pr + hh;
      if (Math.abs(dx) < tw && Math.abs(dy) < th2) {
        const px2 = tw - Math.abs(dx), py2 = th2 - Math.abs(dy);
        return px2 < py2 ? { dx: px2*Math.sign(dx), dy:0 } : { dx:0, dy: py2*Math.sign(dy) };
      }
    }
    return null;
  }

  function markInteracted(id) {
    const o = objects.find(o => o.id === id);
    if (o) o.interacted = true;
  }

  function getAll() { return objects; }

  return { init, update, draw, checkProximity, resolveCollision, markInteracted, getAll };
})();
