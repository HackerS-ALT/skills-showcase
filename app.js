// Showcase app: loads skills.json, renders the grid, opens the detail modal.
(function () {
  var grid = document.getElementById('grid');
  var search = document.getElementById('search');
  var familyFilter = document.getElementById('family-filter');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var modal = document.getElementById('modal');
  var modalVideo = document.getElementById('modal-video');
  var allSkills = [];

  function landscapeClass(s) {
    return s.orientation === 'landscape' ? 'landscape' : '';
  }

  function cardEl(s) {
    var card = document.createElement('article');
    card.className = 'card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', s.name + ' — open details');
    var h = document.createElement('h2');
    h.textContent = s.name;
    var fam = document.createElement('div');
    fam.className = 'family';
    fam.textContent = s.family;
    var img = document.createElement('img');
    img.src = s.stills[0];
    img.alt = s.name + ' preview still';
    img.loading = 'lazy';
    img.className = landscapeClass(s);
    card.appendChild(h);
    card.appendChild(fam);
    card.appendChild(img);
    card.addEventListener('click', function () { openModal(s); });
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(s); }
    });
    return card;
  }

  function render() {
    var q = search.value.trim().toLowerCase();
    var fam = familyFilter.value;
    grid.innerHTML = '';
    var shown = 0;
    allSkills.forEach(function (s) {
      if (fam && s.family !== fam) return;
      if (q && (s.name + ' ' + s.family + ' ' + (s.description || '')).toLowerCase().indexOf(q) === -1) return;
      grid.appendChild(cardEl(s));
      shown++;
    });
    countEl.textContent = shown + ' of ' + allSkills.length + ' styles';
    emptyEl.hidden = shown !== 0;
  }

  function openModal(s) {
    document.getElementById('modal-name').textContent = s.name;
    document.getElementById('modal-family').textContent = s.family;
    document.getElementById('modal-desc').textContent = s.description || '';
    var uses = document.getElementById('modal-uses');
    uses.innerHTML = '';
    (s.best_use_cases || []).forEach(function (u) {
      var li = document.createElement('li');
      li.textContent = u;
      uses.appendChild(li);
    });
    document.getElementById('modal-style').textContent = s.style || '';
    document.getElementById('modal-voice').textContent = s.voice || '';
    modalVideo.src = s.video;
    modalVideo.load();
    var stills = document.getElementById('modal-stills');
    stills.innerHTML = '';
    s.stills.slice(1, 6).forEach(function (src) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = s.name + ' still';
      img.loading = 'lazy';
      img.className = landscapeClass(s);
      stills.appendChild(img);
    });
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
  }

  modal.querySelectorAll('[data-close]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });
  search.addEventListener('input', render);
  familyFilter.addEventListener('change', render);

  fetch('skills.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      allSkills = data.skills || [];
      allSkills.sort(function (a, b) { return a.name.localeCompare(b.name); });
      render();
    })
    .catch(function (err) {
      grid.innerHTML = '<p class="empty">Could not load skills.json — ' + err.message + '</p>';
    });
})();
