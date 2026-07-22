const Transitions = (() => {
  const overlay = document.createElement('div');
  overlay.id = 'fade-overlay';
  document.body.appendChild(overlay);

  function fadeToBlack(duration = 600) {
    return new Promise(resolve => {
      overlay.style.transition = `opacity ${duration}ms ease`;
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'all';
      setTimeout(resolve, duration);
    });
  }

  function fadeFromBlack(duration = 600) {
    return new Promise(resolve => {
      overlay.style.transition = `opacity ${duration}ms ease`;
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      setTimeout(resolve, duration);
    });
  }

  function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
      s.style.display = 'none';
      s.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
      target.style.display = 'flex';
      target.classList.add('active');
    }
  }

  async function goTo(screenId, options = {}) {
    const { fadeDuration = 600, onMidpoint } = options;
    await fadeToBlack(fadeDuration);
    showScreen(screenId);
    if (onMidpoint) onMidpoint();
    await fadeFromBlack(fadeDuration);
  }

  function slideScreen(screenId, direction = 'left') {
    const target = document.getElementById(screenId);
    document.querySelectorAll('.screen').forEach(s => {
      s.style.display = 'none';
      s.classList.remove('active');
    });
    target.style.display = 'flex';
    target.classList.add('active');
    target.style.transform = direction === 'left' ? 'translateX(100%)' : 'translateX(-100%)';
    target.style.transition = 'transform 0.45s ease';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.style.transform = 'translateX(0)';
      });
    });
    setTimeout(() => { target.style.transition = ''; }, 500);
  }

  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.background = '#000';
  overlay.style.opacity = '0';
  overlay.style.pointerEvents = 'none';
  overlay.style.zIndex = '999';

  return { fadeToBlack, fadeFromBlack, showScreen, goTo, slideScreen };
})();
