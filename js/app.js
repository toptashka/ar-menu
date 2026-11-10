window.menuData = {};
window.currentDishId = 'burger';
window.isCutMode = false;

// 1. Инициализация при загрузке страницы: гибридный запрос (SQL API -> fallback на data/menu.json)
document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const dishFromUrl = urlParams.get('dish');

  try {
    // Сначала пробуем получить данные с FastAPI бэкенда (SQL БД)
    const apiRes = await fetch('/api/dishes', { cache: 'no-store' });
    if (!apiRes.ok) throw new Error('API недоступен, переход на резервный JSON');
    window.menuData = await apiRes.json();
  } catch (err) {
    // Если запущено автономно на GitHub Pages — читаем локальный data/menu.json
    try {
      const jsonRes = await fetch('./data/menu.json', { cache: 'no-store' });
      window.menuData = await jsonRes.json();
    } catch (jsonErr) {
      console.error("Ошибка загрузки данных меню:", jsonErr);
      return;
    }
  }

  const dishKeys = Object.keys(window.menuData);
  if (dishKeys.length === 0) return;

  // Определяем стартовое блюдо из ?dish=... или берем первое
  if (dishFromUrl && window.menuData[dishFromUrl]) {
    window.currentDishId = dishFromUrl;
    // Если открыто по целевому QR-коду блюда, скрываем верхний переключатель (или оставляем по желанию)
    document.getElementById('dish-selector').style.display = 'none';
  } else {
    window.currentDishId = dishKeys.includes('burger') ? 'burger' : dishKeys[0];
    renderDishSelector(dishKeys);
  }

  selectDish(window.currentDishId);
  initSwipeGesture();
  initARFallback();
});

// 2. Рендер верхних кнопок выбора блюда (для общего режима витрины)
function renderDishSelector(keys) {
  const container = document.getElementById('dish-selector');
  container.innerHTML = '';
  keys.forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'dish-btn' + (key === window.currentDishId ? ' active' : '');
    btn.innerText = window.menuData[key].name;
    btn.onclick = () => selectDish(key, btn);
    container.appendChild(btn);
  });
}

// 3. Выбор блюда и обновление 3D-модели и КБЖУ
window.selectDish = function(dishId, btnElement = null) {
  const dish = window.menuData[dishId];
  if (!dish) return;

  window.currentDishId = dishId;
  window.isCutMode = false;
  updateCutButtonUI();

  // Обновляем 3D-модель в <model-viewer>
  const viewer = document.getElementById('dish-viewer');
  const modelPath = dish.model_whole || dish.model;
  viewer.setAttribute('src', modelPath);

  // Обновляем подсветку кнопок в селекторе
  if (btnElement) {
    document.querySelectorAll('.dish-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
  }

  // Заполняем КБЖУ и Состав
  document.getElementById('dish-title').innerText = dish.name;
  document.getElementById('val-cal').innerText = dish.calories;
  document.getElementById('val-pro').innerText = dish.protein + ' г';
  document.getElementById('val-fat').innerText = dish.fat + ' г';
  document.getElementById('val-carb').innerText = dish.carbs + ' г';
  document.getElementById('dish-composition').innerText =
    dish.composition || 'Натуральные ингредиенты по фирменной рецептуре заведения.';

  // Покажем кнопку "В разрезе", если задана модель разреза
  const cutBtn = document.getElementById('btn-cut');
  cutBtn.style.display = (dish.model_cut || dish.model_whole || dish.model) ? 'flex' : 'none';
};

// 4. Переключение режима "Целая модель / В разрезе"
window.toggleCutView = function() {
  const dish = window.menuData[window.currentDishId];
  if (!dish) return;

  const viewer = document.getElementById('dish-viewer');
  window.isCutMode = !window.isCutMode;

  if (window.isCutMode) {
    const cutSrc = dish.model_cut || dish.model_whole || dish.model;
    viewer.setAttribute('src', cutSrc);
  } else {
    const wholeSrc = dish.model_whole || dish.model;
    viewer.setAttribute('src', wholeSrc);
  }

  updateCutButtonUI();
};

function updateCutButtonUI() {
  const cutBtn = document.getElementById('btn-cut');
  const cutText = document.getElementById('btn-cut-text');
  if (window.isCutMode) {
    cutBtn.classList.add('active');
    cutText.innerText = 'Целиком';
  } else {
    cutBtn.classList.remove('active');
    cutText.innerText = 'В разрезе';
  }
}

// 5. Раскрытие / закрытие нижней шторки с составом (клик и свайп вверх-вниз)
window.toggleSheet = function(forceState = null) {
  const sheet = document.getElementById('bottom-sheet');
  const hint = document.getElementById('sheet-toggle-hint');
  const isExpanded = forceState !== null ? forceState : !sheet.classList.contains('expanded');

  if (isExpanded) {
    sheet.classList.add('expanded');
    hint.innerText = 'Скрыть ▼';
  } else {
    sheet.classList.remove('expanded');
    hint.innerText = 'Состав ▲';
  }
};

function initSwipeGesture() {
  const sheet = document.getElementById('bottom-sheet');
  let startY = 0;

  sheet.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  sheet.addEventListener('touchend', e => {
    const endY = e.changedTouches[0].clientY;
    const deltaY = startY - endY;
    if (deltaY > 35) {
      toggleSheet(true);  // Свайп вверх -> показать полный состав
    } else if (deltaY < -35) {
      toggleSheet(false); // Свайп вниз -> свернуть состав
    }
  }, { passive: true });
}

// 6. Явный запуск SLAM AR-режима ("Поставить на стол 1:1")
function initARFallback() {
  const viewer = document.getElementById('dish-viewer');
  const fallbackBtn = document.getElementById('ar-fallback-btn');

  viewer.addEventListener('load', () => {
    if (!viewer.canActivateAR) {
      fallbackBtn.style.display = 'block';
    }
  });
}

window.triggerAR = function() {
  const viewer = document.getElementById('dish-viewer');
  if (viewer.canActivateAR) {
    viewer.activateAR();
  } else {
    alert('Для проекции блюда на стол в масштабе 1:1 откройте страницу на смартфоне с поддержкой ARCore (Android) или ARKit (iOS) по защищенному HTTPS-соединению.');
  }
};
