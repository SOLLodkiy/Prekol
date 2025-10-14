// currency.js — надёжный вариант: ждёт DOM, ищет элементы гибко, наружный клик и Esc поддерживаются

(function () {
    // Инициализация когда DOM готов (работает и если скрипт подключён в head)
    function onReady(fn) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fn);
      } else {
        fn();
      }
    }
  
    onReady(() => {
      // базовые данные
      const baseVM = 1000;
      let currentCurrency = 'VM';
  
      // Курсы относительно VM
      const exchangeRates = {
        VM: 1,
        USD: 0.1,   // 1000 VM = 100 $
        EUR: 0.09,
        KZT: 46.5,
        RUB: 9.2,
        JPY: 15.0,
        GBP: 0.08,
        CNY: 0.75
      };
  
      // Гибкий поиск элементов (если ID/структура немного отличается)
      const balanceDisplay =
        document.getElementById('balance-display') ||
        document.querySelector('#balance-widget #balance-display') ||
        document.querySelector('.balance-display');
  
      const amountEl =
        document.getElementById('balance-amount') ||
        (balanceDisplay && balanceDisplay.querySelector('#balance-amount')) ||
        document.querySelector('.balance-amount');
  
      const currencyEl =
        document.getElementById('balance-currency') ||
        (balanceDisplay && balanceDisplay.querySelector('#balance-currency')) ||
        document.querySelector('.balance-currency');
  
      const dropdown =
        document.getElementById('currency-dropdown') ||
        document.querySelector('#balance-widget #currency-dropdown') ||
        document.querySelector('.currency-dropdown');
  
      if (!balanceDisplay || !amountEl || !currencyEl || !dropdown) {
        console.error('currency.js: Не найдены элементы баланса. Проверь HTML (ids: balance-display, balance-amount, balance-currency, currency-dropdown).',
          { balanceDisplay, amountEl, currencyEl, dropdown });
        return;
      }
  
      // Преобразование числа в форматированную строку
      function formatNumber(value) {
        // Показываем без лишних нулей, но с 2 знаками если есть дробная часть
        const opts = value % 1 === 0 ? { maximumFractionDigits: 0 } : { maximumFractionDigits: 2 };
        return Number(value).toLocaleString('ru-RU', opts);
      }
  
      // Плавная анимация числа (простая)
      function animateValue(from, to, duration = 350) {
        const start = performance.now();
        function step(now) {
          const progress = Math.min((now - start) / duration, 1);
          const cur = from + (to - from) * progress;
          amountEl.textContent = formatNumber(cur);
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
  
      // Обновить отображение баланса
      function updateBalanceDisplay() {
        const newValue = baseVM * (exchangeRates[currentCurrency] ?? 1);
        // текущий value из DOM (разбор)
        const curText = amountEl.textContent.replace(/\s/g, '').replace(',', '.');
        const curNum = parseFloat(curText) || baseVM; // fallback
        animateValue(curNum, newValue);
        currencyEl.textContent = currentCurrency;
      }
  
      // Показываем/скрываем меню
      function toggleDropdown(forceState) {
        const willBeVisible = typeof forceState === 'boolean' ? forceState : !dropdown.classList.contains('visible');
        if (willBeVisible) {
          dropdown.classList.add('visible');
          balanceDisplay.classList.add('open');
        } else {
          dropdown.classList.remove('visible');
          balanceDisplay.classList.remove('open');
        }
      }
  
      // Закрыть по клику вне
      function onDocClick(e) {
        if (!dropdown.classList.contains('visible')) return;
        // если клик вне виджета — закрыть
        if (!balanceDisplay.contains(e.target) && !dropdown.contains(e.target)) {
          toggleDropdown(false);
        }
      }
  
      // Закрыть по Escape
      function onKeyDown(e) {
        if (e.key === 'Escape' && dropdown.classList.contains('visible')) toggleDropdown(false);
      }
  
      // Навешиваем обработчик на основной блок
      balanceDisplay.addEventListener('click', (ev) => {
        ev.stopPropagation();
        toggleDropdown();
      });
  
      // Вешаем обработчики на опции (делегирование если опций много)
      dropdown.addEventListener('click', (ev) => {
        const opt = ev.target.closest('.currency-option');
        if (!opt) return;
        const chosen = opt.dataset.currency;
        if (!chosen) return;
        if (chosen !== currentCurrency) {
          currentCurrency = chosen;
          updateBalanceDisplay();
        }
        toggleDropdown(false);
      });
  
      // Глобальные слушатели для закрытия
      document.addEventListener('click', onDocClick);
      document.addEventListener('keydown', onKeyDown);
  
      // Инициализируем текст сразу
      amountEl.textContent = formatNumber(baseVM);
      currencyEl.textContent = 'VM';
  
      // Защита: если dropdown содержит scrollbar, убедимся что pointer-events включены (вдруг CSS конфликт)
      dropdown.style.pointerEvents = dropdown.classList.contains('visible') ? 'auto' : '';
  
      // expose for debug (опционально)
      window.__casinoBalance = {
        baseVM,
        get currentCurrency() { return currentCurrency; },
        setCurrency: (c) => {
          if (exchangeRates[c] !== undefined) {
            currentCurrency = c;
            updateBalanceDisplay();
          } else console.warn('Unknown currency', c);
        }
      };
  
      // Лёгкий лог успешной инициализации
      console.info('currency.js: инициализировано, текущая валюта =', currentCurrency);
    });
  })();
  