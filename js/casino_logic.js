// casino_logic.js — слот-машина + ставка (интеграция с currency.js API)
// Требует: в page уже загружен currency.js и есть #balance-amount, #balance-currency

// ===== СИМВОЛЫ И ЗВУКИ =====
const symbols = ["🍒", "🍋", "💎", "💰", "7️⃣"];

const sounds = {
  lever: new Audio("sounds/lever.wav"),
  rolling: new Audio("sounds/rolling.wav"),
  stop: new Audio("sounds/stop.wav"),
  win: new Audio("sounds/win.wav"),
  lose: new Audio("sounds/lose.wav"),
};

// настройка звука
for (let k in sounds) { try { sounds[k].volume = 0.45; sounds[k].preload = "auto"; } catch(e){} }

document.addEventListener("DOMContentLoaded", () => {
  const casinoTab = document.getElementById("casinoTab");
  const site = document.getElementById("site");

  casinoTab.addEventListener("click", (e) => {
    e.preventDefault();
    if (document.getElementById("casinoScreen")) return;

    casinoTab.classList.remove("active");
    casinoTab.style.background = "#222";
    casinoTab.style.color = "#fff";

    const mainContent = document.querySelector("main.content");
    if (mainContent) {
      mainContent.style.transition = "opacity 1s ease";
      mainContent.style.opacity = "0";
      setTimeout(() => (mainContent.style.display = "none"), 1000);
    }

    const casinoScreen = document.createElement("div");
    casinoScreen.id = "casinoScreen";
    casinoScreen.innerHTML = `
      <div class="casino-content">
        <h1>🎰 СЛОТ МАШИНА 🎰</h1>
        <div class="slot-machine" id="slotMachine">
          <div class="slots">
            <div class="slot"><div class="reel"></div></div>
            <div class="slot"><div class="reel"></div></div>
            <div class="slot"><div class="reel"></div></div>
          </div>

          <!-- панель ставок -->
          <div class="bet-panel" id="betPanel">
            <button id="decrease-bet" class="bet-btn">−</button>
            <input type="number" id="bet-input" value="10" min="1" step="0.01" />
            <button id="increase-bet" class="bet-btn">+</button>
          </div>

          <div class="lever" id="lever">
            <div class="lever-ball"></div>
          </div>
        </div>
      </div>
      <div class="currency-layer" id="casinoCurrencyLayer"></div>
    `;
    site.appendChild(casinoScreen);

    // Плавное появление
    setTimeout(() => {
      casinoScreen.style.opacity = "1";
      const layer = document.getElementById("casinoCurrencyLayer");
      setInterval(() => spawnCurrencies(layer, 8, 0.12, 1.5), 1200);
    }, 200);

    // Инициализация слот-машины (и панели ставок)
    initSlotMachine();
  });
});

// ===============================
// ЛОГИКА СТАВОК: helpers
// ===============================
function safeNumber(v) {
  const n = Number(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

// Получить ссылку на currency API (если есть)
function currencyAPI() {
  return window.__casinoBalance || null;
}

// Возвращает текущий баланс (в отображаемой валюте)
function getDisplayedBalance() {
  const api = currencyAPI();
  if (api) return api.getDisplayedBalance();
  // fallback: читаем из DOM
  const el = document.getElementById('balance-amount');
  if (!el) return 0;
  return safeNumber(el.textContent);
}

// Возвращает текущую валюта (код)
function getCurrentCurrency() {
  const api = currencyAPI();
  if (api) return api.getCurrency();
  const el = document.getElementById('balance-currency');
  return el ? el.textContent : 'VM';
}

// Конвертирует сумму из текущей отображаемой валюты -> VM
function convertDisplayedToVM(amount) {
  const api = currencyAPI();
  if (api) {
    return api.convertToVM(api.getCurrency(), amount);
  }
  // fallback: assume 1:1
  return amount;
}

// Конвертирует vm -> displayed currency
function convertVMToDisplayed(vmAmount) {
  const api = currencyAPI();
  if (api) {
    return api.convertVMto(api.getCurrency(), vmAmount);
  }
  return vmAmount;
}

// Устанавливает новый baseVM (через API)
function changeBaseVMBy(deltaVM) {
  const api = currencyAPI();
  if (api && typeof api.getBaseVM === 'function' && typeof api.setBaseVM === 'function') {
    const newVM = api.getBaseVM() + deltaVM;
    api.setBaseVM(newVM, { animate: true });
  } else {
    // fallback: обновляем DOM amount напрямую (не корректно сохраняет внутренний baseVM)
    const amountEl = document.getElementById('balance-amount');
    const curr = getCurrentCurrency();
    const cur = safeNumber(amountEl.textContent);
    amountEl.textContent = (cur + convertVMtoFallback(curr, deltaVM)).toFixed(2);
  }
}

// Fallback convert for case API absent (very naive; assumes 1:1)
function convertVMtoFallback(currency, vmAmount) {
  return vmAmount;
}

// ===============================
// ЛОГИКА СЛОТ МАШИНЫ + СТАВКИ
// ===============================
function initSlotMachine() {
  const slotMachine = document.getElementById("slotMachine");
  const reels = slotMachine.querySelectorAll(".reel");
  const lever = document.getElementById("lever");

  // bet controls
  const betInput = document.getElementById('bet-input');
  const decBtn = document.getElementById('decrease-bet');
  const incBtn = document.getElementById('increase-bet');

  // если элементы не найдены — выходим
  if (!betInput || !decBtn || !incBtn) {
    console.warn('bet panel elements not found');
  }

  // Инициализация стартовой ставки: 1% от баланса (в отобр. валюте), минимум 1
  function initBetDefault() {
    const dispBal = getDisplayedBalance();
    const defaultBet = Math.max(1, Math.round(dispBal * 0.01 * 100) / 100);
    betInput.value = defaultBet;
  }
  initBetDefault();

  // Обновляет ограничение ставки (чтобы не больше баланса и >=1)
  function clampBet() {
    const max = getDisplayedBalance();
    let bet = safeNumber(betInput.value);
    if (bet < 1) bet = 1;
    if (bet > max) bet = max;
    // округлим до 2 знаков
    betInput.value = Math.round(bet * 100) / 100;
    return bet;
  }

  // при клике уменьшить на 10%
  decBtn.addEventListener('click', () => {
    let bet = safeNumber(betInput.value);
    bet = Math.max(1, bet * 0.9);
    betInput.value = Math.round(bet * 100) / 100;
  });

  // при клике увеличить на 10% (но не больше баланса)
  incBtn.addEventListener('click', () => {
    let bet = safeNumber(betInput.value);
    const max = getDisplayedBalance();
    bet = Math.min(max, bet * 1.1 || 1);
    betInput.value = Math.round(bet * 100) / 100;
  });

  // при смене валюты — автоматически конвертируем текущую ставку из старой в новую
  document.addEventListener('currencyChanged', (e) => {
    const api = currencyAPI();
    if (!api) return;
    // преобразуем текущую ставку (которая была в старой валюте) в VM, затем в новую валюту
    const oldCurrency = e.detail && e.detail.oldCurrency ? e.detail.oldCurrency : null;
    // if API available, easier: take current bet value (in old displayed currency), convert to VM, then to new display
    const betDisplayed = safeNumber(betInput.value);
    const vm = api.convertToVM(api.getCurrency(), betDisplayed); // note: api.getCurrency() already updated by currency.js earlier
    // but event is dispatched after currency change; to be safe: just set to 1% of new balance
    const dispBal = api.getDisplayedBalance();
    const defaultBet = Math.max(1, Math.round(dispBal * 0.01 * 100) / 100);
    betInput.value = defaultBet;
  });

  // spinning control
  let spinning = false;

  // helper to build reel DOM with finalSymbol near end
  function buildReelDOM(reel, finalSymbol, itemsCount) {
    reel.innerHTML = "";
    const finalIndex = Math.max(3, itemsCount - 3);
    for (let k = 0; k < itemsCount; k++) {
      const div = document.createElement("div");
      div.className = "symbol";
      div.textContent = (k === finalIndex) ? finalSymbol : symbols[Math.floor(Math.random() * symbols.length)];
      reel.appendChild(div);
    }
    return finalIndex;
  }

  // основной обработчик рычага
  lever.addEventListener("click", async () => {
    if (spinning) return;
    spinning = true;

    // validate bet
    const betDisplayed = clampBet();
    const displayedBal = getDisplayedBalance();
    if (betDisplayed > displayedBal) {
      // shake input to show error
      betInput.animate([{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 300 });
      spinning = false;
      return;
    }

    // play lever sound
    try { sounds.lever.currentTime = 0; sounds.lever.play(); } catch(e){}

    // animate lever visually
    lever.classList.add("active");
    setTimeout(() => lever.classList.remove("active"), 500);

    // play rolling sound (loopable)
    try {
      sounds.rolling.currentTime = 0;
      sounds.rolling.loop = true;
      sounds.rolling.play();
    } catch (e) {}

    slotMachine.classList.remove("win", "lose");

    // результат заранее: 35% выигрыш
    const isWin = Math.random() < 0.35;
    let result = [];
    if (isWin) {
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      result = [sym, sym, sym];
    } else {
      // случайные, но исключаем случайный трип
      result = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)]
      ];
      if (result[0] === result[1] && result[1] === result[2]) {
        result[2] = symbols[(symbols.indexOf(result[2]) + 1) % symbols.length];
      }
    }

    // символ высота
    const symH = (() => {
      let sample = reels[0].querySelector(".symbol");
      if (!sample) {
        const tmp = document.createElement("div");
        tmp.className = "symbol";
        tmp.style.visibility = "hidden";
        tmp.textContent = symbols[0];
        reels[0].appendChild(tmp);
        const h = tmp.offsetHeight || 150;
        reels[0].removeChild(tmp);
        return h;
      }
      return sample.offsetHeight || 150;
    })();

    // строим потоки с финальным символом внутри
    const itemsCountBase = 20;
    const finalIndexes = [];

    reels.forEach((reel, i) => {
      const finalSymbol = result[i];
      const itemsCount = itemsCountBase + i * 5;
      const finalIndex = buildReelDOM(reel, finalSymbol, itemsCount);
      finalIndexes.push(finalIndex);
      reel.style.transition = "none";
      reel.style.transform = `translateY(0px)`;
    });

    // анимируем каждый reel
    reels.forEach((reel, i) => {
      const finalIndex = finalIndexes[i];
      const targetTranslate = -finalIndex * symH;
      const duration = 2200 + i * 600;
      const delay = i * 180;

      setTimeout(() => {
        reel.style.transition = `transform ${duration}ms cubic-bezier(.1,.9,.2,1)`;
        reel.style.transform = `translateY(${targetTranslate}px)`;
      }, delay);

      // проиграть stop sound чуть раньше
      setTimeout(() => {
        try { sounds.stop.currentTime = 0; sounds.stop.play(); } catch (e) {}
      }, duration + delay - 300);

      // фиксация DOM после остановки (оставляем тройку prev/final/next для красоты)
      setTimeout(() => {
        const children = Array.from(reel.children);
        const finalEl = children[finalIndex];
        const prev = children[finalIndex - 1] ? children[finalIndex - 1].cloneNode(true) : null;
        const next = children[finalIndex + 1] ? children[finalIndex + 1].cloneNode(true) : null;
        setTimeout(() => {
          reel.style.transition = "none";
          reel.innerHTML = "";
          if (prev) reel.appendChild(prev);
          reel.appendChild(finalEl.cloneNode(true));
          if (next) reel.appendChild(next);
          reel.style.transform = `translateY(-${symH}px)`;
        }, 40);
      }, duration + delay + 40);
    });

    // Финальная проверка и расчёт выплат
    const overallWait = 2200 + (reels.length - 1) * 600 + 800;
    setTimeout(() => {
      spinning = false;
      try { sounds.rolling.pause(); } catch(e) {}

      // вычислим изменение в VM
      const betDisp = clampBet(); // displayed currency amount
      const betVM = convertDisplayedToVM(betDisp);

      if (isWin) {
        // выигрыш — выплата 2x ставки: чистая прибыль = ставка (т.е. добавляем betVM)
        changeBaseVMBy(+betVM);
        slotMachine.classList.add("win");
        try { sounds.win.currentTime = 0; sounds.win.play(); } catch(e){}
      } else {
        // проигрыш — снимаем ставку
        changeBaseVMBy(-betVM);
        slotMachine.classList.add("lose");
        try { sounds.lose.currentTime = 0; sounds.lose.play(); } catch(e){}
      }

      // небольшая подсветка, затем убрать
      setTimeout(() => slotMachine.classList.remove("win", "lose"), 1800);
    }, overallWait + 200);
  });
}
