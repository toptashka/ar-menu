window.menuData = {};
window.currentDishId = 'burger';
window.isCutMode = false;

document.addEventListener("DOMContentLoaded", async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const dishFromUrl = urlParams.get('dish');

  try {
    const apiRes = await fetch('/api/dishes', { cache: 'no-store' });
    if (!apiRes.ok) throw new Error('API недоступен');
    window.menuData = await apiRes.json();
  } catch (err) {
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

  if (dishFromUrl && window.menuData[dishFromUrl]) {
    window.currentDishId = dishFromUrl;
    document.getElementById('dish-selector').style.display = 'none';
  } else {
    window.currentDishId = dishKeys.includes('burger') ? 'burger' : dishKeys[0];
    renderDishSelector(dishKeys);
  }

  selectDish(window.currentDishId);
  initSwipeGesture();
  initARFallback();
});

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

window.selectDish = function(dishId, btnElement = null) {
  const dish = window.menuData[dishId];
  if (!dish) return;

  window.currentDishId = dishId;
  window.isCutMode = false;
  updateCutButtonUI();

  const viewer = document.getElementById('dish-viewer');
  const modelPath = dish.model_whole || dish.model;
  viewer.setAttribute('src', modelPath);

  if (btnElement) {
    document.querySelectorAll('.dish-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
  }

  document.getElementById('dish-title').innerText = dish.name;
  document.getElementById('val-cal').innerText = dish.calories;
  document.getElementById('val-pro').innerText = dish.protein + ' г';
  document.getElementById('val-fat').innerText = dish.fat + ' г';
  document.getElementById('val-carb').innerText = dish.carbs + ' г';
  document.getElementById('dish-composition').innerText =
    dish.composition || 'Натуральные ингредиенты по фирменной рецептуре заведения.';

  const cutBtn = document.getElementById('btn-cut');
  cutBtn.style.display = (dish.model_cut || dish.model_whole || dish.model) ? 'flex' : 'none';
};

window.toggleCutView = function() {
  const dish = window.menuData[window.currentDishId];
  if (!dish) return;

  const viewer = document.getElementById('dish-viewer');
  window.isCutMode = !window.isCutMode;

  const targetSrc = window.isCutMode
    ? (dish.model_cut || dish.model_whole || dish.model)
    : (dish.model_whole || dish.model);
  viewer.setAttribute('src', targetSrc);

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

window.toggleSheet = function(forceState = null) {
  const sheet = document.getElementById('bottom-sheet');
  const hint = document.getElementById('sheet-toggle-hint');
  const isExpanded = forceState !== null ? forceState : !sheet.classList.contains('expanded');

  if (isExpanded) {
    sheet.classList.add('expanded');
    hint.innerText = 'Скрыть';
  } else {
    sheet.classList.remove('expanded');
    hint.innerText = 'Состав';
  }
};

function initSwipeGesture() {
  const sheet = document.getElementById('bottom-sheet');
  let startY = 0;

  sheet.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY;
  }, { passive: true });

  sheet.addEventListener('touchend', e => {
    const deltaY = startY - e.changedTouches[0].clientY;
    if (deltaY > 35) toggleSheet(true);
    else if (deltaY < -35) toggleSheet(false);
  }, { passive: true });
}

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
    alert('Для проекции блюда на стол в масштабе 1:1 откройте страницу на смартфоне с поддержкой ARCore (Android) или ARKit (iOS) по HTTPS.');
  }
};