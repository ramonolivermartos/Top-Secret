(function () {
  const TYPE_KEY = 'nsg_music_type_v1';
  let activePlayer = null;
  let playback = null;
  let cancelRetry = () => {};
  let leavingPage = false;
  let playRequest = 0;

  function getMusicType() {
    const data = window.NSG_MUSIC;
    let stored;
    try { stored = localStorage.getItem(TYPE_KEY); } catch (err) { /* Use the default. */ }
    return Object.prototype.hasOwnProperty.call(data.types, stored) ? stored : data.defaultType;
  }

  function setMusicType(type) {
    if (!Object.prototype.hasOwnProperty.call(window.NSG_MUSIC.types, type)) return;
    const previous = getMusicType();
    localStorage.setItem(TYPE_KEY, type);
    if (previous !== type && playback) playMusic(playback);
  }

  function buildUrl(basePath, folder, filename) {
    return `${basePath}music/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`;
  }

  function tryPlay(audio) {
    if (leavingPage || activePlayer !== audio) return;
    cancelRetry();
    const request = ++playRequest;
    const resumeOnInteraction = () => {
      cancelRetry();
      if (!leavingPage && activePlayer === audio) audio.play().catch(() => {});
    };
    cancelRetry = () => {
      document.removeEventListener('pointerdown', resumeOnInteraction);
      document.removeEventListener('keydown', resumeOnInteraction);
    };
    audio.play().catch(() => {
      if (leavingPage || activePlayer !== audio || request !== playRequest) return;
      // Los navegadores bloquean el autoplay con sonido hasta que haya una
      // interacción del usuario. En cuanto el jugador haga clic o pulse
      // cualquier tecla, lo intentamos de nuevo una sola vez.
      document.addEventListener('pointerdown', resumeOnInteraction, { once: true });
      document.addEventListener('keydown', resumeOnInteraction, { once: true });
    });
  }

  function createPlayer(url, volume, startAt) {
    const audio = new Audio(url);
    audio.loop = true;
    audio.volume = volume;
    if (startAt > 0) {
      audio.addEventListener('loadedmetadata', () => {
        try { audio.currentTime = startAt; } catch (err) { /* Empieza desde el principio. */ }
      }, { once: true });
    }
    audio.setAttribute('data-nsg-audio', 'true');
    activePlayer = audio;
    tryPlay(audio);
    return audio;
  }

  // Durante una «Secuencia millonaria» la misma pista suena en los cinco
  // minijuegos: se guarda cuál es y por dónde iba al salir de cada página.
  function sequenceState() {
    const nsg = window.NSG;
    return nsg && typeof nsg.getSequence === 'function' ? nsg.getSequence() : null;
  }

  function rememberSequenceMusic(audio) {
    const sequence = sequenceState();
    if (!sequence || !sequence.music || !playback || playback.menu) return;
    window.NSG.updateSequence({ music: Object.assign({}, sequence.music, { time: audio.currentTime || 0 }) });
  }

  // pagehide cubre la salida de la página sin interferir con la caché de
  // navegación. Cancelamos también los reintentos de autoplay pendientes.
  window.addEventListener('pagehide', (event) => {
    leavingPage = true;
    playRequest += 1;
    cancelRetry();
    if (!activePlayer) return;
    rememberSequenceMusic(activePlayer);
    activePlayer.pause();
    if (!event.persisted) {
      activePlayer.removeAttribute('src');
      activePlayer.load();
      activePlayer = null;
    }
  });

  // Atrás/adelante puede restaurar la misma página: conserva tema y posición.
  window.addEventListener('pageshow', () => {
    if (!leavingPage) return;
    leavingPage = false;
    if (activePlayer) tryPlay(activePlayer);
  });

  function playMusic(context) {
    playback = context;
    cancelRetry();
    if (activePlayer) activePlayer.pause();
    const category = window.NSG_MUSIC.types[getMusicType()];
    const sequence = context.menu ? null : sequenceState();
    const saved = sequence && sequence.music;
    const reuse = saved && saved.type === getMusicType() && category.gameTracks.includes(saved.track);
    const track = context.menu ? category.menuTrack
      : reuse ? saved.track
        : category.gameTracks[Math.floor(Math.random() * category.gameTracks.length)];
    if (sequence && !reuse) window.NSG.updateSequence({ music: { type: getMusicType(), track, time: 0 } });
    return createPlayer(buildUrl(context.basePath, category.folder, track), context.volume, reuse ? saved.time : 0);
  }

  // Pista fija del menú principal (siempre la misma, elegida una vez).
  function initMenuMusic(basePath, volume) {
    return playMusic({ menu: true, basePath: basePath || '', volume: volume === undefined ? 0.35 : volume });
  }

  // Pista aleatoria para un minijuego: cambia cada vez que se entra a jugar,
  // y suena en bucle sin pararse mientras no se recargue la página (es
  // decir, hasta volver al menú principal).
  function initGameMusic(basePath, volume) {
    return playMusic({ menu: false, basePath: basePath || '', volume: volume === undefined ? 0.3 : volume });
  }

  window.NSG_AUDIO = { initMenuMusic, initGameMusic, getMusicType, setMusicType };
})();
