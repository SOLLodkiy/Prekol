const intro = document.getElementById('intro');
const subtitles = document.getElementById('subtitles');
const currencyLayer = document.getElementById('currencyLayer');
const bgCurrencyLayer = document.getElementById('bgCurrencyLayer');
const site = document.getElementById('site');
const casinoTab = document.getElementById('casinoTab');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');

let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}
function playPop(freq = 750, duration = 0.25) {
  ensureAudio();
  const ctx = audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.05);
}

const phrases = ["ВСЁ", "ЧТО ТЫ", "МОЖЕШЬ ДЕЛАТЬ", "ЭТО ДЕПАТЬ", "В КАЗИК"];
const sleep = ms => new Promise(res => setTimeout(res, ms));

function createLine(text) {
  const span = document.createElement('span');
  span.className = 'line';
  span.textContent = text;
  return span;
}

const currencySymbols = ['$', '€', '₽', '£', '¥', '₸'];
function spawnCurrencies(layer, count = 12, opacity = 0.9, speed = 1) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'currency';
    el.textContent = currencySymbols[Math.floor(Math.random() * currencySymbols.length)];
    el.style.left = Math.random() * 100 + '%';
    el.style.fontSize = (20 + Math.random() * 50) + 'px';
    el.style.color = `rgba(255,255,255,${opacity})`;
    const dur = (5000 + Math.random() * 5000) * speed;
    el.style.animationDuration = dur + 'ms';
    el.style.animationDelay = Math.random() * 1000 + 'ms';
    layer.appendChild(el);
    setTimeout(() => el.remove(), dur + 1500);
  }
}

let bgInterval = null;
function startBgCurrencyLoop() {
  if (bgInterval) return;
  bgInterval = setInterval(() => {
    spawnCurrencies(bgCurrencyLayer, 6, 0.25, 1.5);
  }, 1200);
}

async function runSequence() {
  subtitles.innerHTML = "";
  intro.style.display = "flex";
  startScreen.style.opacity = "0";
  setTimeout(() => startScreen.style.display = "none", 800);

  for (let i = 0; i < phrases.length; i++) {
    const el = createLine(phrases[i]);
    subtitles.appendChild(el);
    await sleep(50);
    el.classList.add('show');
    playPop(600 + i * 80, 0.25);
    await sleep(1000);
    if (i < phrases.length - 1) {
      el.classList.remove('show');
      await sleep(200);
      el.remove();
    }
  }

  spawnCurrencies(currencyLayer, 20, 0.9);
  for (let j = 1; j <= 4; j++) setTimeout(() => spawnCurrencies(currencyLayer, 10, 0.8), j * 600);

  await sleep(3000);
  intro.style.transition = 'opacity 1.2s ease';
  intro.style.opacity = '0';
  await sleep(1200);
  intro.style.display = 'none';
  site.classList.add('visible');
  startBgCurrencyLoop();
}

startBtn.addEventListener('click', () => {
  runSequence();
});

document.addEventListener("DOMContentLoaded", () => {
  if (typeof initCasino === "function") initCasino();
});