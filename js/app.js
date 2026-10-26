window.isDetached = false;

// 1. Вращение одним пальцем и масштаб (зум) двумя пальцами
AFRAME.registerComponent('drag-rotate', {
  init: function () {
    let isDragging = false;
    let prevX = 0, prevY = 0;
    let initialPinchDist = null;

    window.addEventListener('touchstart', e => { 
      if (e.target.closest('#bottom-sheet') || e.target.closest('.btn')) return;
      if (e.touches.length === 1) {
        isDragging = true;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    window.addEventListener('touchmove', e => {
      if (e.touches.length === 1 && isDragging) {
        let deltaX = e.touches[0].clientX - prevX;
        let deltaY = e.touches[0].clientY - prevY;
        prevX = e.touches[0].clientX;
        prevY = e.touches[0].clientY;

        let rot = this.el.getAttribute('rotation');
        this.el.setAttribute('rotation', {
          x: rot.x + deltaY * 0.5,
          y: rot.y + deltaX * 0.5,
          z: rot.z
        });
      } else if (e.touches.length === 2 && initialPinchDist) {
        let currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        let ratio = currentDist / initialPinchDist;
        initialPinchDist = currentDist;

        let s = this.el.getAttribute('scale');
        let newScale = Math.min(Math.max(s.x * ratio, 0.15), 2.0);
        this.el.setAttribute('scale', `${newScale} ${newScale} ${newScale}`);
      }
    });

    window.addEventListener('touchend', () => {
      isDragging = false;
      initialPinchDist = null;
    });
  }
});

// 2. Удержание модели на экране после нажатия "Забрать блюдо"
AFRAME.registerComponent('manual-detach', {
  init: function () {
    const marker = this.el;
    this.lastValidMatrix = new AFRAME.THREE.Matrix4();
    this.hasMatrix = false;

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
  },

  tick: function () {
    // Пока блюдо на маркере — запоминаем его текущие координаты
    if (!window.isDetached) {
      if (this.el.object3D.visible) {
        this.lastValidMatrix.copy(this.el.object3D.matrix);
        this.hasMatrix = true;
      }
    } else if (this.hasMatrix) {
      // Когда нажали "Забрать" — принудительно держим модель видимой перед камерой!
      this.el.object3D.visible = true;
      this.el.object3D.matrix.copy(this.lastValidMatrix);
    }
  }
});

// 3. Кнопка "Забрать блюдо" (отвязка от маркера)
window.detachDish = function() {
  window.isDetached = true;
  document.body.classList.add('detached-mode');

  // Меняем кнопки внизу
  document.getElementById('btn-detach').style.display = 'none';
  document.getElementById('btn-info').style.display = 'block';
  document.getElementById('btn-reset').style.display = 'block';

  const hint = document.getElementById('hint');
  hint.style.opacity = '1';
  hint.innerText = "Блюдо зафиксировано! Можешь убрать камеру и крутить его пальцем.";
  setTimeout(() => {
    if (window.isDetached) hint.style.opacity = '0';
  }, 3500);
};

// 4. Кнопка "Вернуть на маркер"
window.resetAR = function() {
  window.isDetached = false;
  document.body.classList.remove('detached-mode');

  document.getElementById('bottom-sheet').classList.remove('active');
  document.getElementById('btn-detach').style.display = 'block';
  document.getElementById('btn-info').style.display = 'none';
  document.getElementById('btn-reset').style.display = 'none';
  document.getElementById('action-buttons').style.display = 'none';

  const hint = document.getElementById('hint');
  hint.style.opacity = '1';
  hint.innerText = "Наведи камеру на маркер на столе";
};

// 5. Открыть/закрыть шторку КБЖУ
window.toggleInfo = function() {
  document.getElementById('bottom-sheet').classList.toggle('active');
};

// 6. Загрузка КБЖУ из JSON
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