// Showcase app: loads skills.json, renders the grid, opens the detail modal.
(function () {
  var grid = document.getElementById('grid');
  var search = document.getElementById('search');
  var familyFilter = document.getElementById('family-filter');
  var countEl = document.getElementById('count');
  var emptyEl = document.getElementById('empty');
  var loadingEl = document.getElementById('loading');
  var modal = document.getElementById('modal');
  var modalVideo = document.getElementById('modal-video');
  var allSkills = [];
  var bySlug = {};

  function landscapeClass(s) {
    return s.orientation === 'landscape' ? 'landscape' : '';
  }

  // Filter key: the source family slug. Done skills carry a display label
  // in `family`; `family_key` (written by build-page.py) is the stable key.
  function familyKey(s) {
    return s.family_key || s.family;
  }

  // Human-readable source-family labels. Done skills carry a per-skill
  // display label in `family`; text skills carry the raw slug — both are
  // normalised here so no card ever shows a raw slug.
  var FAMILY_LABELS = {
    'cartoon-audio-short': 'Cartoon Short',
    'faceless-shorts': 'Faceless Shorts',
    'ai-video-editor': 'AI Video Editor',
    'nafay-style-library': 'Nafay Library',
    'cth-animate': 'CTH Animate',
    'artem-animation-skills': 'Artem Animation'
  };

  function displayName(s) {
    // Most done skills carry a display name in meta.json; one (stack-split)
    // carries the raw slug. Anything entirely lowercase is a slug: title-case
    // its hyphen-separated words. Display names ("Blueprint") pass through.
    if (s.name === s.name.toLowerCase()) {
      return s.name.split('-').map(function (w) {
        return w ? w.charAt(0).toUpperCase() + w.slice(1) : w;
      }).join(' ');
    }
    return s.name;
  }

  function displayFamily(s) {
    return FAMILY_LABELS[s.family] || s.family;
  }

  // Deterministic truncation: the CSS line-clamp does not hold on this
  // Chromium (a flex item's -webkit-box display blockifies, so the clamp
  // inserts an ellipsis yet still renders the overflow lines). Cut to a
  // word boundary with one trailing ellipsis so the card shows at most
  // five lines, cleanly.
  function truncateDesc(text) {
    var budget = 140;
    if (text.length <= budget) return text;
    var cut = text.slice(0, budget);
    var lastSpace = cut.lastIndexOf(' ');
    if (lastSpace > 100) cut = cut.slice(0, lastSpace);
    return cut + '...';
  }

  function cardEl(s) {
    var card = document.createElement('article');
    card.className = 'card';
    if (s.status === 'pending') {
      card.classList.add('placeholder');
      card.setAttribute('aria-label', displayName(s) + ' — coming soon');
      var h = document.createElement('h2');
      h.textContent = displayName(s);
      var fam = document.createElement('div');
      fam.className = 'family';
      fam.textContent = displayFamily(s);
      var soon = document.createElement('div');
      soon.className = 'coming-soon';
      soon.textContent = 'Coming soon';
      card.appendChild(h);
      card.appendChild(fam);
      card.appendChild(soon);
      return card;
    }
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', displayName(s) + ' — open details');
    var h = document.createElement('h2');
    h.textContent = displayName(s);
    var fam = document.createElement('div');
    fam.className = 'family';
    fam.textContent = displayFamily(s);
    card.appendChild(h);
    card.appendChild(fam);
    if (s.status === 'done') {
      var img = document.createElement('img');
      img.src = s.stills[0];
      img.alt = displayName(s) + ' preview still';
      img.loading = 'lazy';
      img.className = landscapeClass(s);
      card.appendChild(img);
    } else {
      // Text-only: media still rendering — name + description, no image.
      card.classList.add('text-only');
      var d = document.createElement('p');
      d.className = 'card-desc';
      d.textContent = truncateDesc(s.description || '');
      card.appendChild(d);
    }
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
    var doneCount = 0;
    allSkills.forEach(function (s) {
      if (s.status === 'done') doneCount++;
      if (fam && familyKey(s) !== fam) return;
      if (q && (displayName(s) + ' ' + s.name + ' ' + displayFamily(s) + ' ' + s.family + ' ' + (s.description || '')).toLowerCase().indexOf(q) === -1) return;
      grid.appendChild(cardEl(s));
      shown++;
    });
    var text = doneCount + ' ready of ' + allSkills.length + ' styles';
    if (fam || q) text += ', ' + shown + ' shown';
    countEl.textContent = text;
    emptyEl.hidden = shown !== 0;
  }

  function openModal(s) {
    document.getElementById('modal-name').textContent = displayName(s);
    document.getElementById('modal-family').textContent = displayFamily(s);
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
    var mediaSection = document.querySelector('.modal-media');
    var mediaPending = document.getElementById('modal-media-pending');
    var hasMedia = (s.stills && s.stills.length > 0) || !!s.video;
    mediaSection.style.display = hasMedia ? '' : 'none';
    if (mediaPending) mediaPending.hidden = hasMedia;
    if (s.video) {
      modalVideo.src = s.video;
      if (s.stills && s.stills[0]) modalVideo.poster = s.stills[0];
      modalVideo.load();
    } else {
      modalVideo.removeAttribute('poster');
    }
    var stills = document.getElementById('modal-stills');
    stills.innerHTML = '';
    (s.stills || []).slice(1, 6).forEach(function (src) {
      var img = document.createElement('img');
      img.src = src;
      img.alt = displayName(s) + ' still';
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
    modalVideo.removeAttribute('poster');
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

  // Hero stills open their skill's modal once the data is loaded.
  function wireHeroStills() {
    document.querySelectorAll('.hero-still').forEach(function (fig) {
      var s = bySlug[fig.getAttribute('data-slug')];
      if (!s) return;
      fig.addEventListener('click', function () { openModal(s); });
      fig.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(s); }
      });
    });
  }

  fetch('skills.json')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      allSkills = data.skills || [];
      allSkills.sort(function (a, b) { return displayName(a).localeCompare(displayName(b)); });
      allSkills.forEach(function (s) { bySlug[s.slug] = s; });
      // Hero sentence stays honest about how much media is live: it names
      // the real done count, and only claims "every card" once all 86
      // skills have stills.
      var heroSentence = document.querySelector('.hero-sentence');
      var doneTotal = data.done || 0;
      if (heroSentence) {
        heroSentence.textContent = doneTotal >= allSkills.length
          ? "Every card below is a real still from its skill's own demo."
          : doneTotal + ' styles have real stills so far. The rest are coming.';
      }
      if (loadingEl) loadingEl.hidden = true;
      wireHeroStills();
      render();
    })
    .catch(function (err) {
      if (loadingEl) loadingEl.textContent = 'Could not load skills.json — ' + err.message;
      grid.innerHTML = '';
    });
})();
