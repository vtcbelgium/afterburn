import './style.css';
import { Afterburn } from './scene.js';
import { Soundtrack } from './audio.js';

const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
const bolt = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m13 2-9 12h7l-1 8 10-13h-8l1-7Z"/></svg>';
const speaker = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path class="sound-waves" d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/><path class="sound-slash" d="m16 9 5 6m0-6-5 6"/></svg>';
const pauseIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M8 5v14M16 5v14"/></svg>';
const expandIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/></svg>';

document.querySelector('#app').innerHTML = `
  <div class="site-shell">
    <header class="header">
      <a class="wordmark" href="./" aria-label="Afterburn home"><span class="brand-symbol">${bolt}</span>AFTERBURN<span class="trademark">™</span></a>
      <nav aria-label="Main navigation"><span class="nav-active"><i></i>THE GAME</span><button id="manual-open">FLIGHT MANUAL <span>↗</span></button></nav>
      <div class="header-right"><span class="live-status"><i></i> SYSTEM ONLINE</span><button class="icon-button sound-button" id="sound" aria-label="Turn sound on" aria-pressed="false">${speaker}</button></div>
    </header>

    <main>
      <div class="page-heading"><div><span class="eyebrow">INDEPENDENT ARCADE SERIES</span><span class="heading-divider">/</span><span class="edition">VOL. 001</span></div><span class="page-heading-right">BUILT FOR THE NEED FOR SPEED <span>↙</span></span></div>

      <section class="game-frame" id="game-frame" aria-label="Afterburn 3D racing game">
        <div id="scene" aria-hidden="true"></div>
        <div class="scene-vignette"></div><div class="scanlines"></div><div class="damage-flash" id="damage-flash"></div>

        <div class="scene-topline"><span><i class="tiny-cross">+</i> NEO TOKYO <span class="dim">//</span> AFTER HOURS</span><span class="scene-coordinates">35°40′ N &nbsp; 139°42′ E</span></div>

        <div id="intro" class="intro">
          <div class="intro-tag"><span></span> THE STREETS ARE YOURS.</div>
          <h1>CHASE<br>THE <span>LIMIT.</span></h1>
          <p>One ship. No brakes. An endless neon city.<br>How far can you push it?</p>
          <button class="primary-button" id="start">LET’S RIDE <span>${arrow}</span></button>
          <div class="start-caption"><span class="key small-key">↵</span> OR PRESS ENTER TO START</div>
          <div class="intro-record"><span class="record-icon">♜</span><div><span class="micro-label">YOUR PERSONAL BEST</span><strong id="intro-best">000000</strong></div><span class="record-unit">PTS</span></div>
        </div>

        <div class="world-label" id="world-label"><span class="world-label-line"></span><span>MK–IV INTERCEPTOR<small>ANTI-GRAVITY / CLASS A</small></span><span class="world-label-plus">+</span></div>
        <div class="vertical-label">NO ROADS. NO RULES. JUST REFLEXES.</div>

        <div class="hud hidden" id="hud">
          <div class="hud-left"><span class="micro-label">RUN SCORE</span><strong id="score">000000</strong><span class="hud-sector" id="sector">SECTOR 01</span></div>
          <div class="hud-right"><span class="micro-label">HULL INTEGRITY</span><div class="hull" id="hull"><i></i><i></i><i></i></div><button id="pause" class="icon-button" aria-label="Pause game">${pauseIcon}</button></div>
          <div class="speed-readout"><strong id="speed">306</strong><span>KM/H</span></div>
          <div class="boost-readout"><div><span>${bolt} AFTERBURN</span><span id="energy-label">100%</span></div><div class="boost-track"><i id="energy-bar"></i></div><span class="boost-help">HOLD <kbd>SPACE</kbd> TO BOOST</span></div>
          <div class="combo-readout" id="combo"></div>
        </div>

        <div class="countdown hidden" id="countdown" aria-live="assertive"></div>
        <div class="toast hidden" id="toast" role="status"></div>

        <div class="result-overlay hidden" id="result-overlay">
          <div class="result-card">
            <span class="eyebrow" id="result-eyebrow">TRANSMISSION LOST</span>
            <h2 id="result-title">WHAT A<br><span>RIDE.</span></h2>
            <p id="result-description">The city always wins. Until it doesn’t.</p>
            <div class="result-stats" id="result-stats"><div><span>RUN SCORE</span><strong id="final-score">0</strong></div><div><span>DISTANCE</span><strong id="final-distance">0 <small>M</small></strong></div><div><span>ENERGY COLLECTED</span><strong id="final-shards">0</strong></div></div>
            <button class="primary-button" id="restart">ONE MORE RUN <span>${arrow}</span></button>
            <button class="text-button" id="back-home">BACK TO GARAGE ${arrow}</button>
          </div>
        </div>

        <div class="scene-bottomline"><span id="scene-status"><i></i> READY WHEN YOU ARE</span><span class="engine-label">REAL-TIME 3D <span>·</span> THREE.JS</span><button class="icon-button" id="fullscreen" aria-label="Enter fullscreen">${expandIcon}</button></div>

        <div class="touch-controls hidden" id="touch-controls"><button id="touch-left" aria-label="Steer left">←</button><button id="touch-boost" aria-label="Hold to boost">${bolt} BOOST</button><button id="touch-right" aria-label="Steer right">→</button></div>
        <div class="loading" id="loading"><div class="loading-mark">${bolt}</div><span>WAKING UP THE CITY</span></div>
      </section>

      <section class="control-strip" aria-label="Game controls">
        <div class="control-item"><span class="control-number">01</span><div><span class="control-name">MAKE YOUR MOVE</span><div class="control-detail"><span class="key">←</span><span class="key">→</span><span class="or-label">/</span><span class="key">A</span><span class="key">D</span><span class="control-action">STEER</span></div></div></div>
        <div class="control-item"><span class="control-number">02</span><div><span class="control-name">FEEL THE RUSH</span><div class="control-detail"><span class="key space-key">SPACE</span><span class="control-action">HOLD TO BOOST</span></div></div></div>
        <div class="control-item"><span class="control-number">03</span><div><span class="control-name">STAY IN THE GAME</span><div class="control-detail"><span class="energy-diamond"></span><span class="control-action">COLLECT ENERGY. DODGE EVERYTHING ELSE.</span></div></div></div>
        <button id="strip-manual" aria-label="Open flight manual">${arrow}</button>
      </section>
    </main>

    <footer><span>A LITTLE DANGER. A LOT OF VELOCITY.</span><span>NO DOWNLOADS. JUST DRIVE. <i>↗</i></span></footer>
  </div>

  <dialog id="manual" aria-labelledby="manual-title"><button class="dialog-close icon-button" id="manual-close" aria-label="Close flight manual">✕</button><span class="eyebrow">BEFORE YOU BURN</span><h2 id="manual-title">FLIGHT<br><span>MANUAL.</span></h2><p>The city is endless. Your hull isn’t.</p><div class="manual-row"><span>01</span><div><h3>Find your line.</h3><p>Use ← → or A / D to switch lanes. On touchscreens, use the buttons or swipe left and right.</p></div></div><div class="manual-row"><span>02</span><div><h3>Leave a light trail.</h3><p>Hold Space or the boost button for extra speed. Collect cyan energy to refill your boost and earn points.</p></div></div><div class="manual-row"><span>03</span><div><h3>Cut it close.</h3><p>Orange barriers cost one of your three hull segments. Pass close beside them for a near-miss multiplier, up to 8×.</p></div></div><div class="manual-note"><kbd>P</kbd> / <kbd>ESC</kbd> PAUSE <span>·</span> <kbd>M</kbd> SOUND <span>·</span> <kbd>F</kbd> FULLSCREEN</div><button class="primary-button" id="manual-ready">GOT IT. LET’S GO. <span>${arrow}</span></button></dialog>
`;

const $ = id => document.getElementById(id);
const sound = new Soundtrack();
let best = 0;
try { best = Math.max(0, Number(localStorage.getItem('afterburn-best')) || 0); } catch { /* Private browsing may disable storage. */ }
$('intro-best').textContent = String(best).padStart(6, '0');
let lastScore = -1;
let toastTimeout;
let game;

function showToast(message) {
  $('toast').textContent = message;
  $('toast').classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('toast').classList.add('hidden'), 1600);
}

function setMode(mode) {
  const playing = mode === 'playing' || mode === 'countdown';
  $('game-frame').dataset.mode = mode;
  $('intro').classList.toggle('hidden', mode !== 'menu');
  $('world-label').classList.toggle('hidden', mode !== 'menu');
  $('hud').classList.toggle('hidden', !playing);
  $('result-overlay').classList.toggle('hidden', mode !== 'over' && mode !== 'paused');
  $('touch-controls').classList.toggle('hidden', !playing || mode === 'countdown');
  $('scene-status').innerHTML = `<i></i> ${mode === 'menu' ? 'READY WHEN YOU ARE' : mode === 'paused' ? 'SYSTEM ON STANDBY' : mode === 'over' ? 'SIGNAL LOST // TRY AGAIN' : 'YOU ARE THE FASTEST THING HERE'}`;
  $('countdown').classList.toggle('hidden', mode !== 'countdown');
  if (mode === 'paused') {
    $('result-eyebrow').textContent = 'TAKE A BREATHER';
    $('result-title').innerHTML = 'HOLD<br><span>THAT THOUGHT.</span>';
    $('result-description').textContent = 'Your next close call can wait.';
    $('result-stats').classList.add('hidden');
    $('restart').innerHTML = `KEEP RIDING <span>${arrow}</span>`;
  }
  if (mode === 'over') {
    const run = game.state;
    const record = run.score > best;
    if (record) {
      best = run.score;
      try { localStorage.setItem('afterburn-best', String(best)); } catch { /* Storage is optional. */ }
      $('intro-best').textContent = String(best).padStart(6, '0');
    }
    $('result-eyebrow').textContent = record ? 'NEW PERSONAL BEST' : 'TRANSMISSION LOST';
    $('result-title').innerHTML = record ? 'YOU JUST<br><span>RAISED THE BAR.</span>' : 'WHAT A<br><span>RIDE.</span>';
    $('result-description').textContent = record ? 'A new record. A new reason to go again.' : 'The city always wins. Until it doesn’t.';
    $('result-stats').classList.remove('hidden');
    $('final-score').textContent = run.score.toLocaleString();
    $('final-distance').innerHTML = `${Math.floor(run.distance).toLocaleString()} <small>M</small>`;
    $('final-shards').textContent = run.collected;
    $('restart').innerHTML = `ONE MORE RUN <span>${arrow}</span>`;
  }
}

function updateHUD(state) {
  if (state.score === lastScore) return;
  lastScore = state.score;
  $('score').textContent = String(state.score).padStart(6, '0');
  $('speed').textContent = Math.round(state.speed * 9);
  $('sector').textContent = `SECTOR ${String(state.sector).padStart(2, '0')} / ${Math.floor(state.distance).toLocaleString()} M`;
  $('energy-label').textContent = `${Math.ceil(state.energy)}%`;
  $('energy-bar').style.width = `${state.energy}%`;
  $('game-frame').classList.toggle('is-boosting', state.boosting);
  [...$('hull').children].forEach((segment, i) => segment.classList.toggle('lost', i >= state.hull));
  $('combo').innerHTML = state.combo > 1 ? `<strong>${state.combo}×</strong> CLOSE CALL MULTIPLIER` : '';
}

function start() {
  if (!game || $('manual').open) return;
  if (game.mode === 'playing' || game.mode === 'countdown') return;
  lastScore = -1;
  clearTimeout(toastTimeout);
  $('toast').classList.add('hidden');
  game.start();
  sound.start();
}

async function toggleSound() {
  try {
    const enabled = await sound.setEnabled(!sound.enabled);
    $('sound').classList.toggle('sound-on', enabled);
    $('sound').setAttribute('aria-pressed', String(enabled));
    $('sound').setAttribute('aria-label', enabled ? 'Turn sound off' : 'Turn sound on');
  } catch { showToast('Audio is unavailable in this browser.'); }
}

async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $('game-frame').requestFullscreen();
  } catch { showToast('Fullscreen is unavailable. Try a larger browser window.'); }
}

function openManual() {
  if (game?.mode === 'playing' || game?.mode === 'countdown') game.pause();
  $('manual').showModal();
}

$('start').addEventListener('click', start);
$('restart').addEventListener('click', () => game.mode === 'paused' ? game.resume() : start());
$('back-home').addEventListener('click', () => { game.home(); });
$('pause').addEventListener('click', () => game.pause());
$('sound').addEventListener('click', toggleSound);
$('fullscreen').addEventListener('click', fullscreen);
$('manual-open').addEventListener('click', openManual);
$('strip-manual').addEventListener('click', openManual);
$('manual-close').addEventListener('click', () => $('manual').close());
$('manual-ready').addEventListener('click', () => $('manual').close());
$('manual').addEventListener('click', e => { if (e.target === $('manual')) { const r = $('manual').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) $('manual').close(); } });

window.addEventListener('keydown', e => {
  if (e.code === 'Tab') return;
  const target = e.target;
  const buttonFocused = target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement;
  if ($('manual').open) return;
  if (['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code) && !buttonFocused) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Enter' && !buttonFocused && game && ['menu', 'over'].includes(game.mode)) start();
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (game?.mode === 'paused') game.resume();
    else if (['playing', 'countdown'].includes(game?.mode)) game.pause();
  }
  if (e.code === 'KeyM') toggleSound();
  if (e.code === 'KeyF') fullscreen();
});

try {
  game = new Afterburn($('scene'), {
    onMode: setMode,
    onTick: state => { updateHUD(state); if (game.mode === 'playing') sound.tick(state.time, state.boosting); },
    onCountdown: n => { $('countdown').textContent = n; sound.tone(n === 'GO' ? 660 : 330, 0.18, 'triangle', 0.3); },
    onPickup: () => sound.pickup(),
    onNearMiss: () => { sound.nearMiss(); showToast('CLOSE CALL // MULTIPLIER UP'); },
    onSector: n => showToast(`SECTOR ${String(n).padStart(2, '0')} // KEEP PUSHING`),
    onHit: () => { sound.hit(); $('damage-flash').classList.remove('flash'); void $('damage-flash').offsetWidth; $('damage-flash').classList.add('flash'); },
  });
  $('loading').classList.add('hidden');
  setMode('menu');
  game.attachTouch($('touch-left'), $('touch-right'), $('touch-boost'), $('scene'));
  // A small read-only snapshot makes performance and playability checks repeatable.
  window.afterburn = { get snapshot() { return { mode: game.mode, lane: game.targetLane, x: game.ship.position.x, score: game.state.score, distance: game.state.distance, energy: game.state.energy, hull: game.state.hull, boosting: game.state.boosting, sector: game.state.sector, objects: game.obstacles.length, fps: game.fps }; } };
} catch (error) {
  console.error('Afterburn could not initialize:', error);
  $('loading').innerHTML = `<span class="eyebrow">ENGINE OFFLINE</span><h2>THE CITY NEEDS WEBGL.</h2><p>Enable hardware acceleration or try a browser with WebGL 2 support.</p><button class="primary-button" id="reload">TRY AGAIN ${arrow}</button>`;
  $('reload').addEventListener('click', () => location.reload());
}
