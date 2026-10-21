// Countdown, photo gallery, scroll reveals, calendar file and the RSVP form.
(function () {
  'use strict';

  var W = window.WEDDING || {};
  var weddingAt = new Date(W.date || '2027-06-12T17:00:00+03:00');
  var $ = function (sel, root) { return (root || document).querySelector(sel); };

  // ---------- countdown ----------

  function tick() {
    var ms = Math.max(0, weddingAt - Date.now());
    var mins = Math.floor(ms / 60000);
    $('[data-cd="d"]').textContent = Math.floor(mins / 1440);
    $('[data-cd="h"]').textContent = Math.floor(mins / 60) % 24;
    $('[data-cd="m"]').textContent = mins % 60;
  }
  tick();
  setInterval(tick, 30000);

  // ---------- gallery ----------

  var gallery = $('#gallery');
  var photos = window.PHOTOS || [];
  if (window.HERO) $('.hero-photo').style.backgroundImage = 'url("' + window.HERO + '")';
  if (photos.length) {
    photos.forEach(function (p) {
      var fig = document.createElement('figure');
      fig.className = 'photo reveal';
      var img = document.createElement('img');
      img.src = p.src || 'photos/' + p.file;
      img.alt = p.alt || 'Johnny and Carla';
      img.loading = 'lazy';
      img.decoding = 'async';
      if (p.w && p.h) { img.width = p.w; img.height = p.h; }
      fig.appendChild(img);
      gallery.appendChild(fig);
    });
  } else {
    ['4 / 5', '3 / 2', '4 / 5', '1 / 1'].forEach(function (ar) {
      var fig = document.createElement('figure');
      fig.className = 'photo placeholder reveal';
      fig.style.setProperty('--ar', ar);
      fig.textContent = 'Photo coming soon';
      gallery.appendChild(fig);
    });
  }

  // ---------- reveal on scroll ----------

  var revealables = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('in'); });
  }

  // ---------- add to calendar ----------

  $('#calendarBtn').addEventListener('click', function () {
    var stamp = function (d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''); };
    var end = new Date(weddingAt.getTime() + 9 * 3600 * 1000); // until about 2am
    var ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Johnny and Carla//Wedding//EN',
      'BEGIN:VEVENT',
      'UID:johnny-carla-wedding-20270612',
      'DTSTAMP:' + stamp(new Date()),
      'DTSTART:' + stamp(weddingAt),
      'DTEND:' + stamp(end),
      'SUMMARY:Johnny & Carla\'s Wedding',
      'LOCATION:Sainte Thérèse Church\\, Mansourieh',
      'DESCRIPTION:5pm church ceremony at Sainte Thérèse\\, Mansourieh. 7pm welcome drink and 8pm dinner at Pleine Nature\\, Mansourieh.',
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = 'Johnny-and-Carla-wedding.ics';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  });

  // ---------- RSVP ----------

  var form = $('#rsvpForm');
  var ifYes = $('.if-yes', form);
  var errorBox = $('#formError');
  var submitBtn = $('#submitBtn');
  var thanks = $('#thanks');
  var STORE_KEY = 'jc-wedding-rsvp';

  if (W.rsvpBy) $('#rsvpBy').textContent = W.rsvpBy; else $('#rsvpBy').hidden = true;

  form.addEventListener('change', function (e) {
    if (e.target.name === 'attending') ifYes.hidden = e.target.value !== 'Yes';
  });

  function showError(msg) { errorBox.textContent = msg; errorBox.hidden = !msg; }

  function showThanks(data) {
    var yes = data.attending === 'Yes';
    $('#thanksTitle').textContent = yes ? 'See you there!' : 'Thank you';
    $('#thanksText').textContent = yes
      ? 'We can\'t wait to celebrate with you, ' + data.name.split(' ')[0] + '.'
      : 'We\'ll miss you, ' + data.name.split(' ')[0] + '. Thank you for letting us know.';
    form.hidden = true;
    thanks.hidden = false;
  }

  function remember(data) { try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {} }
  function recall() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } }

  var previous = recall();
  if (previous && previous.name) {
    Object.keys(previous).forEach(function (k) {
      var el = form.elements[k];
      if (el) el.value = previous[k];
    });
    ifYes.hidden = previous.attending !== 'Yes';
    showThanks(previous);
  }

  $('#againBtn').addEventListener('click', function () {
    thanks.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    showError('');

    var f = form.elements;
    var data = {
      name: f.name.value.trim(),
      attending: f.attending.value,
      count: f.attending.value === 'Yes' ? f.count.value : '0',
      party: f.attending.value === 'Yes' ? f.party.value.trim() : '',
      dietary: f.attending.value === 'Yes' ? f.dietary.value.trim() : '',
      phone: f.phone.value.trim(),
      message: f.message.value.trim(),
      website: f.website.value // spam trap
    };
    var saved = Object.assign({}, data);
    delete saved.website;

    if (!data.name) { showError('Please write your name.'); f.name.focus(); return; }
    if (!data.attending) { showError('Please let us know if you can come.'); return; }

    if (!W.rsvpUrl) {
      // Preview mode: nothing is sent until config.js has the Google Sheet link.
      console.info('RSVP preview (not saved):', saved);
      remember(saved);
      showThanks(saved);
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    // Sent as plain text so the browser makes a simple request Google accepts.
    fetch(W.rsvpUrl, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.ok) throw new Error((res && res.error) || 'not saved');
        remember(saved);
        showThanks(saved);
      })
      .catch(function () {
        showError('Sorry, your reply didn\'t go through. Please check your connection and try again.');
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send my reply';
      });
  });

  // ---------- opening envelope + music ----------

  var root = document.documentElement;
  var opener = $('#opener');
  var music = $('#music');
  var musicBtn = $('#musicBtn');
  var wantMusic = true;

  if (W.music) music.src = W.music;

  function setMusicButton() {
    var playing = !music.paused;
    musicBtn.classList.toggle('paused', !playing);
    musicBtn.setAttribute('aria-label', playing ? 'Pause music' : 'Play music');
  }

  function fadeIn() {
    music.volume = 0;
    var v = 0;
    var t = setInterval(function () {
      v = Math.min(0.6, v + 0.04);
      music.volume = v;
      if (v >= 0.6) clearInterval(t);
    }, 120);
  }

  function playMusic() {
    var p = music.play();
    if (p && p.then) p.then(setMusicButton, setMusicButton); else setMusicButton();
    fadeIn();
  }

  function openInvitation() {
    if (root.classList.contains('opening')) return;
    root.classList.add('opening');
    playMusic(); // must start inside the tap so phones allow sound
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(function () {
      window.scrollTo(0, 0);
      root.classList.remove('sealed');
      root.classList.add('opened');
      musicBtn.hidden = false;
      setTimeout(function () { opener.remove(); }, 1000);
    }, reduce ? 200 : 1900);
  }

  opener.addEventListener('click', openInvitation);

  musicBtn.addEventListener('click', function () {
    wantMusic = music.paused;
    if (wantMusic) playMusic(); else { music.pause(); setMusicButton(); }
  });
  music.addEventListener('play', setMusicButton);
  music.addEventListener('pause', setMusicButton);

  // Stop when the guest switches apps or locks the phone; resume when they come back.
  document.addEventListener('visibilitychange', function () {
    if (!root.classList.contains('opened')) return;
    if (document.hidden) music.pause();
    else if (wantMusic) music.play().catch(function () {});
  });
})();
