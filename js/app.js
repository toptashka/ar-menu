// 1. Компонент вращения свайпом
AFRAME.registerComponent('drag-rotate', {
  init: function () {
    let isDragging = false, prevX = 0;
    window.addEventListener('touchstart', e => { 
      if(!e.target.closest('#bottom-sheet') && !e.target.closest('.btn')) { 
        isDragging = true; prevX = e.touches[0].clientX; 
      }
    });
    window.addEventListener('touchmove', e => {
      if (!isDragging) return;
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
    
    // Когда камера увидела маркер
    marker.addEventListener('targetFound', () => {
      if (!window.isDetached) {
        document.getElementById('action-buttons').style.display = 'flex';
        document.getElementById('hint').innerText = "Блюдо найдено! Нажми 'Забрать', чтобы зафиксировать его.";
      }
    });

    // Когда камера потеряла маркер
    marker.addEventListener('targetLost', () => {
      if (!window.isDetached) {
        document.getElementById('action-buttons').style.display = 'none';
        document.getElementById('hint').innerText = "Наведи камеру на маркер на столе";
      }
    });
  }
});

// 3. UI Логика и работа с "БД"
window.isDetached = false;

window.detachDish = function() {
  window.isDetached = true;
  
  // 1. Прячем AR-камеру
  document.getElementById('ar-scene').style.display = 'none';
  
  // 2. Показываем идеальный 3D-плеер
  document.getElementById('3d-viewer-container').style.display = 'block';
  
  // 3. Меняем кнопки
  document.getElementById('btn-detach').style.display = 'none';
  document.getElementById('btn-info').style.display = 'block';
  
  // 4. Обновляем подсказку
  const hint = document.getElementById('hint');
  hint.innerText = "Рассматривай блюдо со всех сторон!";
  setTimeout(() => { hint.style.opacity = '0'; }, 3000);
}

// Открыть/закрыть КБЖУ
window.toggleInfo = function() {
  document.getElementById('bottom-sheet').classList.toggle('active');
}

// Загрузка данных из БД при старте
document.addEventListener("DOMContentLoaded", () => {
  fetch('./data/menu.json')
    .then(response => response.json())
    .then(data => {
      // Подставляем данные для первого блюда
      const dish = data.test_dish;
      document.querySelector('.dish-title').innerText = dish.name;
      document.querySelector('#val-cal').innerText = dish.calories;
      document.querySelector('#val-pro').innerText = dish.protein + 'г';
      document.querySelector('#val-fat').innerText = dish.fat + 'г';
      document.querySelector('#val-carb').innerText = dish.carbs + 'г';
    })
    .catch(err => console.error("Ошибка загрузки БД:", err));
});