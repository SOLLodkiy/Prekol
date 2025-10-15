// currency.js — улучшенный: выбор валюты, обновление UI, сохранение в localStorage

(function () {
  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  onReady(() => {
    let baseVM = parseFloat(localStorage.getItem("casino_baseVM")) || 1000;
    let currentCurrency = localStorage.getItem("casino_currency") || "VM";

    const exchangeRates = {
      VM: 1,
      USD: 0.1,
      EUR: 0.085,
      KZT: 54.8,
      RUB: 9.5,
      JPY: 16.0,
      GBP: 0.075,
      CNY: 0.70
    };

    const amountEl = document.getElementById("balance-amount");
    const currencyEl = document.getElementById("balance-currency");
    const dropdown = document.getElementById("currency-dropdown");
    const balanceDisplay = document.getElementById("balance-display");

    if (!amountEl || !currencyEl || !dropdown || !balanceDisplay) {
      console.warn("currency.js: UI элементы не найдены. Проверь HTML: balance-amount, balance-currency, currency-dropdown, balance-display.");
      return;
    }

    // форматирование числа
    function formatNumber(value) {
      return Number(value).toLocaleString("ru-RU", {
        maximumFractionDigits: value % 1 === 0 ? 0 : 2
      });
    }

    function convertVMto(currency, vmAmount) {
      const rate = exchangeRates[currency];
      return rate ? vmAmount * rate : vmAmount;
    }

    function convertToVM(currency, amount) {
      const rate = exchangeRates[currency];
      return rate ? amount / rate : amount;
    }

    function persist() {
      localStorage.setItem("casino_baseVM", String(baseVM));
      localStorage.setItem("casino_currency", currentCurrency);
    }

    function updateBalanceDisplay(animated = true) {
      const toVal = convertVMto(currentCurrency, baseVM);
      if (!animated) {
        amountEl.textContent = formatNumber(toVal);
      } else {
        const fromVal = parseFloat(amountEl.textContent.replace(/\s/g, "").replace(",", ".")) || toVal;
        const start = performance.now();
        const duration = 350;
        function step(now) {
          const p = Math.min((now - start) / duration, 1);
          const cur = fromVal + (toVal - fromVal) * p;
          amountEl.textContent = formatNumber(cur);
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
      currencyEl.textContent = currentCurrency;
    }

    // ========== Новый блок: интерфейс выбора валюты ==========
    balanceDisplay.addEventListener("click", () => {
      dropdown.classList.toggle("visible");
    });

    dropdown.innerHTML = Object.keys(exchangeRates)
      .map(
        (cur) =>
          `<div class="currency-option" data-currency="${cur}">${cur}</div>`
      )
      .join("");

    dropdown.querySelectorAll(".currency-option").forEach((el) => {
      el.addEventListener("click", () => {
        const newCurrency = el.dataset.currency;
        if (newCurrency !== currentCurrency) {
          currentCurrency = newCurrency;
          persist();
          updateBalanceDisplay(true);
          document.dispatchEvent(
            new CustomEvent("currencyChanged", { detail: { currency: currentCurrency } })
          );
        }
        dropdown.classList.remove("visible");
      });
    });

    document.addEventListener("click", (e) => {
      if (!balanceDisplay.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("visible");
      }
    });

    // ========== Публичное API ==========
    window.__casinoBalance = {
      getBaseVM() {
        return baseVM;
      },
      setBaseVM(newVM, { animate = true } = {}) {
        baseVM = Math.max(0, Number(newVM) || 0);
        persist();
        updateBalanceDisplay(animate);
      },
      getCurrency() {
        return currentCurrency;
      },
      setCurrency(newCurrency) {
        if (!exchangeRates[newCurrency]) {
          console.warn("currency: unknown currency", newCurrency);
          return;
        }
        currentCurrency = newCurrency;
        persist();
        updateBalanceDisplay(true);
        document.dispatchEvent(
          new CustomEvent("currencyChanged", { detail: { currency: currentCurrency } })
        );
      },
      getExchangeRates() {
        return { ...exchangeRates };
      },
      convertVMto,
      convertToVM,
      getDisplayedBalance() {
        return convertVMto(currentCurrency, baseVM);
      },
      refreshDisplay() {
        updateBalanceDisplay(true);
      }
    };

    updateBalanceDisplay(false);
    console.info("currency.js: ready — baseVM =", baseVM, "currency =", currentCurrency);
  });
})();
