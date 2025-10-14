// ===== КАЗИНО ЛОГИКА =====

// Символы слотов
const symbols = ["🍒", "🍋", "💎", "💰", "7️⃣"];

// Звуки
const sounds = {
  lever: new Audio("sounds/lever.wav"),
  rolling: new Audio("sounds/rolling.wav"),
  stop: new Audio("sounds/stop.wav"),
  win: new Audio("sounds/win.wav"),
  lose: new Audio("sounds/lose.wav"),
};

// Настройка звука
for (let key in sounds) {
  sounds[key].volume = 0.45;
  sounds[key].preload = "auto";
}

document.addEventListener("DOMContentLoaded", () => {
  const casinoTab = document.getElementById("casinoTab");

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

    // Инициализация слот-машины
    initSlotMachine();
  });
});

// ===============================
// ЛОГИКА СЛОТ МАШИНЫ
// ===============================
function initSlotMachine() {
  const slotMachine = document.getElementById("slotMachine");
  const reels = slotMachine.querySelectorAll(".reel");
  const lever = document.getElementById("lever");
  let spinning = false;

  // helper: build reel DOM with finalSymbol placed near the end
  function buildReelDOM(reel, finalSymbol, itemsCount) {
    reel.innerHTML = "";
    const finalIndex = Math.max(3, itemsCount - 3);
    for (let k = 0; k < itemsCount; k++) {
      const div = document.createElement("div");
      div.className = "symbol";
      div.textContent =
        k === finalIndex
          ? finalSymbol
          : symbols[Math.floor(Math.random() * symbols.length)];
      reel.appendChild(div);
    }
    return finalIndex;
  }

  lever.addEventListener("click", () => {
    if (spinning) return;
    spinning = true;

    // 🎵 Звук рычага
    try {
      sounds.lever.currentTime = 0;
      sounds.lever.play();
    } catch (e) {}

    // Анимация рычага
    lever.classList.add("active");
    setTimeout(() => lever.classList.remove("active"), 500);

    slotMachine.classList.remove("win", "lose");

    // 🎵 Запускаем звук вращения барабанов
    try {
      sounds.rolling.currentTime = 0;
      sounds.rolling.play();
    } catch (e) {}

    // Определяем результат (35% шанс выигрыша)
    const isWin = Math.random() < 0.35;
    let result = [];

    if (isWin) {
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      result = [sym, sym, sym];
    } else {
      result = [
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
        symbols[Math.floor(Math.random() * symbols.length)],
      ];
      if (result[0] === result[1] && result[1] === result[2]) {
        result[2] = symbols[(symbols.indexOf(result[2]) + 1) % symbols.length];
      }
    }

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

    reels.forEach((reel, i) => {
      const finalIndex = finalIndexes[i];
      const targetTranslate = -finalIndex * symH;
      const duration = 2200 + i * 600;
      const delay = i * 180;

      // Анимация вращения
      setTimeout(() => {
        reel.style.transition = `transform ${duration}ms cubic-bezier(.1,.9,.2,1)`;
        reel.style.transform = `translateY(${targetTranslate}px)`;
      }, delay);

      // 🎵 Звук остановки — чуть раньше, чем реальное окончание
      setTimeout(() => {
        try {
          sounds.stop.currentTime = 0;
          sounds.stop.play();
        } catch (e) {}
      }, duration + delay - 400);

      // Финальная фиксация символа
      setTimeout(() => {
        const children = Array.from(reel.children);
        const finalEl = children[finalIndex];
        const prev = children[finalIndex - 1]
          ? children[finalIndex - 1].cloneNode(true)
          : null;
        const next = children[finalIndex + 1]
          ? children[finalIndex + 1].cloneNode(true)
          : null;
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

    const overallWait = 2200 + (reels.length - 1) * 600 + 800;
    setTimeout(() => {
      spinning = false;
      sounds.rolling.pause();
      if (isWin) {
        slotMachine.classList.add("win");
        try {
          sounds.win.currentTime = 0;
          sounds.win.play();
        } catch (e) {}
      } else {
        slotMachine.classList.add("lose");
        try {
          sounds.lose.currentTime = 0;
          sounds.lose.play();
        } catch (e) {}
      }
      setTimeout(() => slotMachine.classList.remove("win", "lose"), 1800);
    }, overallWait + 200);
  });
}
