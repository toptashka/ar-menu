window.isDetached = false;

// 1. Компонент вращения свайпом (работает только пока блюдо на маркере)
AFRAME.registerComponent('drag-rotate', {
  init: function () {
    let isDragging = false, prevX = 0;
    window.addEventListener('touchstart', e => { 
      if (window.isDetached) return;
      if (!e.target.closest('#bottom-sheet') && !e.target.closest('.btn')) { 
        isDragging = true; 
        prevX = e.touches[0].clientX; 
      }
    });
    window.addEventListener('touchmove', e => {
      if (!isDragging || window.isDetached) return;
      let delta = e.touches[0].clientX - prevX;
      prevX = e.touches[0].clientX;
      let rot = this.el.getAttribute('rotation');
      this.el.setAttribute('rotation', {x: rot.x, y: rot.y + delta * 0.5, z: rot.z});
    });
    window.addEventListener('touchend', () => isDragging = false);
  }
});

// 2. Компонент отслеживания маркера для ручной отвязки
AFRAME.registerComponent('manual-detach', {
  init: function () {
    const marker = this.el;
    
    marker.addEventListener('targetFound', () => {
      if (!window.isDetached) {
        document.getElementById('action-buttons').style.display = 'flex';
        const hint = document.getElementById('hint');
        hint.style.opacity = '1';
        hint.innerText = "Блюдо найдено! Нажми 'Забрать блюдо', чтобы зафиксировать его.";
      }
    });

    marker.addEventListener('targetLost', () => {
      if (!window.isDetached) {
        document.getElementById('action-buttons').style.display = 'none';
        const hint = document.getElementById('hint');
        hint.style.opacity = '1';
        hint.innerText = "Наведи камеру на маркер на столе";
      }
    });
  }
});

// 3. Отвязка блюда (переход в свободный режим поверх камеры)
window.detachDish = function() {
  window.isDetached = true;
  document.body.classList.add('detached-mode');
  
  // Прячем модель на маркере, но оставляем саму камеру работать на фоне
  document.getElementById('marker-dish').setAttribute('visible', 'false');
  
  // Показываем 3D-плеер поверх камеры
  document.getElementById('viewer-container').style.display = 'block';
  
  // Переключаем кнопки
  document.getElementById('action-buttons').style.display = 'flex';
  document.getElementById('btn-detach').style.display = 'none';
  document.getElementById('btn-info').style.display = 'block';
  document.getElementById('btn-reset').style.display = 'block';
  
  // Обновляем подсказку
  const hint = document.getElementById('hint');
  hint.style.opacity = '1';
  hint.innerText = "Крути блюдо пальцем и приближай двумя пальцами!";
  setTimeout(() => { 
    if (window.isDetached) hint.style.opacity = '0'; 
  }, 3000);
};

// 4. Возврат обратно к сканированию стола
window.resetAR = function() {
  window.isDetached = false;
  document.body.classList.remove('detached-mode');
  
  // Прячем 3D-плеер и шторку КБЖУ
  document.getElementById('viewer-container').style.display = 'none';
  document.getElementById('bottom-sheet').classList.remove('active');
  
  // Возвращаем видимость модели на маркере
  document.getElementById('marker-dish').setAttribute('visible', 'true');
  
  // Сбрасываем кнопки
  document.getElementById('btn-detach').style.display = 'block';
  document.getElementById('btn-info').style.display = 'none';
  document.getElementById('btn-reset').style.display = 'none';
  document.getElementById('action-buttons').style.display = 'none';
  
  const hint = document.getElementById('hint');
  hint.style.opacity = '1';
  hint.innerText = "Наведи камеру на маркер на столе";
};

// 5. Открыть/закрыть КБЖУ
window.toggleInfo = function() {
  document.getElementById('bottom-sheet').classList.toggle('active');
};

// 6. Загрузка данных из БД при старте
document.addEventListener("DOMContentLoaded", () => {
  fetch('./data/menu.json')
    .then(response => response.json())
    .then(data => {
      const dish = data.test_dish;
      document.querySelector('.dish-title').innerText = dish.name;
      document.querySelector('#val-cal').innerText = dish.calories;
      document.querySelector('#val-pro').innerText = dish.protein + 'г';
      document.querySelector('#val-fat').innerText = dish.fat + 'г';
      document.querySelector('#val-carb').innerText = dish.carbs + 'г';
    })
    .catch(err => console.error("Ошибка загрузки БД:", err));
});