const Audio = (() => {
  const musicEl = document.getElementById('audio-music');
  const sfxEl   = document.getElementById('audio-sfx');
  let musicVol = 0.6;
  let sfxVol   = 0.8;

  const tracks = {
    story1_ambient: 'assests/audio/story 1.mp3',
    story2_ambient: 'assests/audio/story 2.mp3',
    bg_ambient:     'assests/audio/Bg_audio.mp3',
  };

  const sfxFiles = {
    click:          'assests/audio/button_click.wav',
    hover:          'assests/audio/button_hover.wav',
    echo_activate:  'assests/audio/Echo_slight.wav',
    clue_found:     'assests/audio/clue_collected.wav',
    dialogue_pop:   'assests/audio/dialogue_pop.wav',
    notebook_open:  'assests/audio/notebook_open.wav',
    notebook_close: 'assests/audio/notebook_close.wav',
    string_connect: 'assests/audio/clue_collected.wav',
    case_solved:    'assests/audio/solved.wav',
  };

  function playMusic(key) {
    const src = tracks[key];
    if (!src) return;
    if (musicEl.getAttribute('src') === src && !musicEl.paused) return;
    musicEl.src = src;
    musicEl.volume = musicVol;
    musicEl.loop = true;
    musicEl.play().catch(() => {});
  }

  function stopMusic(fadeOut = false) {
    if (fadeOut) {
      let v = musicEl.volume;
      const iv = setInterval(() => {
        v -= 0.05;
        if (v <= 0) { musicEl.pause(); musicEl.currentTime = 0; clearInterval(iv); }
        else musicEl.volume = v;
      }, 50);
    } else {
      musicEl.pause();
      musicEl.currentTime = 0;
    }
  }

  function playSFX(key) {
    const src = sfxFiles[key];
    if (!src) return;
    const a = new window.Audio(src);
    a.volume = sfxVol;
    a.play().catch(() => {});
  }

  function setMusicVol(v) { musicVol = v; musicEl.volume = v; }
  function setSFXVol(v)   { sfxVol = v; }

  document.addEventListener('mouseover', e => {
    if (e.target.matches('.menu-btn, .story-card.available, .level-node.available, .back-btn')) {
      playSFX('hover');
    }
  });

  return { playMusic, stopMusic, playSFX, setMusicVol, setSFXVol };
})();
