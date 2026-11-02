const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initUI() {
  initIntros();
  initTopbar();
  initNavActive();
  initReveal();
  initLightbox();
  initCopy();
  initBackdropScene();
  initChimes();
  initPlayer();
}

function initIntros() {
  const gate = document.querySelector('[data-gate]');
  const video = document.querySelector('[data-gate-video]');
  const html = document.documentElement;
  if (!gate) return;

  const entered = html.dataset.entered === '1';
  document.body.classList.toggle('gate-open', !entered);

  let started = false;

  const soundBtn = gate.querySelector('[data-gate-sound]');

  const showSoundBtn = () => {
    if (soundBtn) soundBtn.classList.add('is-visible');
  };

  const loadVideo = () => {
    if (!video || started || reduceMotion) return;
    started = true;
    const wide = window.matchMedia('(min-width: 720px)').matches;
    const src = wide ? gate.dataset.videoWide : gate.dataset.videoSmall;
    if (!src) return;
    video.src = src;
    video.addEventListener('playing', () => gate.classList.add('is-playing'), { once: true });
    video.addEventListener('error', () => gate.classList.remove('is-playing'), { once: true });
    video.addEventListener('ended', enter, { once: true });
    video.muted = false;
    const attempt = video.play();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        video.muted = true;
        showSoundBtn();
        if (soundBtn) {
          soundBtn.setAttribute('aria-pressed', 'false');
          soundBtn.setAttribute('aria-label', '打开声音');
          soundBtn.classList.remove('is-on');
        }
        const retry = video.play();
        if (retry && typeof retry.catch === 'function') retry.catch(() => {});
      });
    }
  };

  if (!entered) {
    const connection = navigator.connection;
    const saveData = connection && connection.saveData === true;
    if (saveData) {
    } else {
      window.setTimeout(loadVideo, 120);
    }
  }

  const enter = () => {
    if (html.dataset.entered === '1') return;
    if (video) video.pause();
    try {
      sessionStorage.setItem('mm333-entered', '1');
    } catch (e) {}
    gate.classList.add('is-leaving');
    html.dataset.entered = '1';
    document.body.classList.remove('gate-open');
    window.setTimeout(() => {
      gate.style.display = 'none';
    }, 1000);
  };

  gate.addEventListener('click', enter);
  gate.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
      event.preventDefault();
      enter();
    }
  });
  gate.tabIndex = 0;

  if (soundBtn) {
    const syncSound = () => {
      const on = !!video && !video.muted;
      soundBtn.setAttribute('aria-pressed', String(on));
      soundBtn.setAttribute('aria-label', on ? '静音' : '打开声音');
      soundBtn.classList.toggle('is-on', on);
    };
    soundBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!video) return;
      video.muted = !video.muted;
      if (!video.muted) {
        const playPromise = video.play();
        if (playPromise && playPromise.catch) playPromise.catch(() => {});
      }
      syncSound();
    });
    ['pointerdown', 'keydown'].forEach((type) => {
      soundBtn.addEventListener(type, (event) => event.stopPropagation());
    });
  }

  const replay = document.querySelectorAll('[data-replay-intro]');
  replay.forEach((button) =>
    button.addEventListener('click', () => {
      try {
        sessionStorage.removeItem('mm333-entered');
      } catch (e) {}
      delete html.dataset.entered;
      gate.style.display = '';
      gate.classList.remove('is-leaving');
      document.body.classList.add('gate-open');
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
      started = false;
      setTimeout(loadVideo, 80);
    })
  );
}

function initTheme() {
  const html = document.documentElement;
  const buttons = document.querySelectorAll('[data-theme-toggle]');
  if (!buttons.length) return;

  const sync = () => {
    const night = html.dataset.theme === 'night';
    buttons.forEach((button) => {
      button.setAttribute('aria-label', night ? '切成黄昏' : '切成夜');
      button.setAttribute('aria-pressed', String(night));
    });
  };

  buttons.forEach((button) =>
    button.addEventListener('click', () => {
      const next = html.dataset.theme === 'night' ? 'dusk' : 'night';
      html.dataset.theme = next;
      try {
        localStorage.setItem('mm333-theme', next);
      } catch (e) {}
      sync();
    })
  );
  sync();
}

function initTopbar() {
  const bar = document.querySelector('.topbar');
  if (!bar) return;

  const onScroll = () => {
    bar.classList.toggle('is-solid', window.scrollY > 40);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
}

function initNavActive() {
  const links = [...document.querySelectorAll('[data-nav-link]')];
  if (!links.length || !('IntersectionObserver' in window)) return;

  const targets = links
    .map((link) => document.getElementById(link.dataset.navLink))
    .filter((el) => el);

  const setActive = (id) => {
    links.forEach((link) => link.classList.toggle('is-active', link.dataset.navLink === id));
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(visible.target.id);
    },
    { rootMargin: '-42% 0px -42% 0px', threshold: [0, 0.15, 0.4] }
  );

  targets.forEach((target) => observer.observe(target));
  setActive('top');
}

function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;
  if (reduceMotion || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  items.forEach((el) => observer.observe(el));
}

function initTabs() {
  const buttons = [...document.querySelectorAll('[data-tab]')];
  const panels = [...document.querySelectorAll('[data-panel]')];
  if (!buttons.length || !panels.length) return;

  const select = (key) => {
    buttons.forEach((button) => {
      const active = button.dataset.tab === key;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    panels.forEach((panel) => panel.classList.toggle('is-active', panel.dataset.panel === key));
  };

  buttons.forEach((button) => button.addEventListener('click', () => select(button.dataset.tab)));
}

function initLightbox() {
  const figures = [...document.querySelectorAll('[data-zoom]')];
  if (!figures.length) return;

  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = `
    <button class="lightbox__close" type="button" aria-label="关闭">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <img alt="" />`;
  document.body.appendChild(box);
  const img = box.querySelector('img');

  const close = () => {
    box.classList.remove('is-open');
    document.body.style.overflow = '';
  };

  figures.forEach((figure) => {
    const source = figure.querySelector('img');
    figure.addEventListener('click', () => {
      img.src = source.currentSrc || source.src;
      img.alt = source.alt || '';
      box.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    });
  });
  box.addEventListener('click', (event) => {
    if (event.target === box || event.target.closest('.lightbox__close')) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}

function initCopy() {
  document.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.dataset.copy || '';
      try {
        await navigator.clipboard.writeText(value);
      } catch (e) {
        const area = document.createElement('textarea');
        area.value = value;
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      const original = button.textContent;
      button.textContent = '已复制';
      button.classList.add('is-done');
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('is-done');
      }, 1600);
    });
  });
}

function initRainScene() {
  const stage = document.querySelector('[data-stage]');
  const canvas = document.querySelector('[data-rain]');
  const art = document.querySelector('[data-art]');
  if (!stage || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let drops = [];
  let ripples = [];
  let raf = 0;
  let last = 0;
  let pointer = { x: -999, y: -999, active: false };
  let target = { px: 0, py: 0 };
  let current = { px: 0, py: 0 };
  const UMBRELLA_R = 96;

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(420, Math.max(90, (width * height) / 11000)));
    drops = Array.from({ length: count }, () => spawn(true));
  };

  function spawn(initial = false) {
    return {
      x: Math.random() * (width + 160) - 80,
      y: initial ? Math.random() * height : -30 - Math.random() * 140,
      len: 8 + Math.random() * 22,
      speed: 460 + Math.random() * 620,
      alpha: 0.1 + Math.random() * 0.35,
      wind: 0.1 + Math.random() * 0.08,
      width: Math.random() > 0.85 ? 1.3 : 0.7,
    };
  }

  const draw = (time) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
    last = time;
    ctx.clearRect(0, 0, width, height);

    const px = pointer.x;
    const py = pointer.y;

    ctx.lineCap = 'round';
    for (const drop of drops) {
      let vx = drop.speed * drop.wind;
      let vy = drop.speed;

      if (pointer.active) {
        const dx = drop.x - px;
        const dy = drop.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist < UMBRELLA_R + 30 && dist > 0.0001) {
          const force = (1 - dist / (UMBRELLA_R + 30)) * 260;
          vx += (dx / dist) * force * 0.9;
          vy += (dy / dist) * force * 0.35;
        }
      }

      drop.x += vx * dt;
      drop.y += vy * dt;
      if (drop.y > height + 24 || drop.x < -120 || drop.x > width + 120) {
        Object.assign(drop, spawn(false));
        continue;
      }

      const grad = ctx.createLinearGradient(drop.x, drop.y, drop.x, drop.y + drop.len);
      grad.addColorStop(0, 'rgba(214, 236, 250, 0)');
      grad.addColorStop(0.5, `rgba(214, 236, 250, ${drop.alpha})`);
      grad.addColorStop(1, 'rgba(240, 250, 255, 0.05)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = drop.width;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * drop.wind * 2.2, drop.y + drop.len);
      ctx.stroke();
    }

    ripples = ripples.filter((ripple) => {
      ripple.life -= dt * 1.4;
      if (ripple.life <= 0) return false;
      const r = (1 - ripple.life) * 130 + 6;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(220, 242, 255, ${0.35 * ripple.life})`;
      ctx.lineWidth = 1.2;
      ctx.ellipse(ripple.x, ripple.y, r, r * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });

    if (pointer.active) {
      const halo = ctx.createRadialGradient(px, py, 0, px, py, UMBRELLA_R);
      halo.addColorStop(0, 'rgba(200, 232, 255, 0.12)');
      halo.addColorStop(0.65, 'rgba(200, 232, 255, 0.045)');
      halo.addColorStop(1, 'rgba(200, 232, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(px, py, UMBRELLA_R, 0, Math.PI * 2);
      ctx.fill();
    }

    current.px += (target.px - current.px) * 0.06;
    current.py += (target.py - current.py) * 0.06;
    stage.style.setProperty('--px', `${current.px.toFixed(2)}px`);
    stage.style.setProperty('--py', `${current.py.toFixed(2)}px`);
    if (art) art.style.transform = `scale(1.06) translate3d(${(-current.px * 0.6).toFixed(2)}px, ${(-current.py * 0.4).toFixed(2)}px, 0)`;

    raf = requestAnimationFrame(draw);
  };

  const start = () => {
    if (!raf && !reduceMotion) raf = requestAnimationFrame(draw);
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
    target.px = ((event.clientX / window.innerWidth) - 0.5) * 22;
    target.py = ((event.clientY / window.innerHeight) - 0.5) * 14;
  });
  stage.addEventListener('pointerleave', () => {
    pointer.active = false;
    pointer.x = -999;
    pointer.y = -999;
    target.px = 0;
    target.py = 0;
  });
  stage.addEventListener('pointerdown', (event) => {
    const rect = stage.getBoundingClientRect();
    ripples.push({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      life: 1,
    });
    for (const drop of drops) {
      const dx = drop.x - ripples[ripples.length - 1].x;
      const dy = drop.y - ripples[ripples.length - 1].y;
      const dist = Math.hypot(dx, dy);
      if (dist < 150 && dist > 1) {
        drop.x += (dx / dist) * 26;
        drop.y += (dy / dist) * 14;
      }
    }
  });

  window.addEventListener('resize', () => {
    resize();
    start();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  resize();

  if (reduceMotion) {
    for (const drop of drops) {
      ctx.strokeStyle = `rgba(214, 236, 250, ${drop.alpha * 0.9})`;
      ctx.lineWidth = drop.width;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * drop.wind * 2.2, drop.y + drop.len);
      ctx.stroke();
    }
  } else {
    start();
  }
}

function initPlayer() {
  const bar = document.querySelector('[data-player]');
  const wrap = document.querySelector('.player-bar__frame-wrap');
  const titleEl = document.querySelector('[data-player-title]');
  const subEl = document.querySelector('[data-player-sub]');
  const items = [...document.querySelectorAll('[data-song]')];
  if (!wrap || !items.length) return;

  const songs = items.map((el) => ({
    id: el.dataset.id,
    name: el.querySelector('.playlist__name')?.textContent.trim() || '',
    meta: el.querySelector('.playlist__meta')?.textContent.trim() || '',
  }));

  let index = -1;
  let frame = null;

  wrap.querySelectorAll('[data-player-frame]').forEach((el) => el.remove());

  const playerUrl = (id, auto) =>
    `https://music.163.com/outchain/player?type=2&id=${encodeURIComponent(id)}&auto=${auto}&height=66`;

  const load = (id, auto) => {
    const next = document.createElement('iframe');
    next.className = 'player-bar__frame';
    next.setAttribute('data-player-frame', '');
    next.title = '网易云音乐播放器';
    next.allow = 'autoplay; encrypted-media';
    next.loading = 'eager';
    next.src = playerUrl(id, auto);
    if (frame) frame.replaceWith(next);
    else wrap.appendChild(next);
    frame = next;
  };

  const select = (next, autoplay) => {
    if (!songs[next]) return;
    index = next;
    const song = songs[next];
    load(song.id, autoplay ? 1 : 0);
    if (titleEl) titleEl.textContent = song.name;
    if (subEl) subEl.textContent = song.meta;
    if (bar) bar.classList.add('is-playing');
    items.forEach((el, i) => {
      el.classList.toggle('is-active', i === next);
      const state = el.querySelector('[data-state]');
      if (state) state.textContent = i === next ? '❚❚' : '▶';
    });
  };

  items.forEach((el) => {
    el.querySelector('[data-play-song]')?.addEventListener('click', () => {
      select(Number(el.dataset.index), true);
    });
  });

  document.querySelector('[data-play-prev]')?.addEventListener('click', () => {
    select((index - 1 + songs.length) % songs.length, true);
  });

  document.querySelector('[data-play-next]')?.addEventListener('click', () => {
    select((index + 1) % songs.length, true);
  });

  const pop = document.querySelector('[data-playlist-pop]');
  const listBtn = document.querySelector('[data-toggle-playlist]');
  if (pop && listBtn) {
    const setOpen = (open) => {
      pop.classList.toggle('is-open', open);
      pop.setAttribute('aria-hidden', String(!open));
      listBtn.setAttribute('aria-expanded', String(open));
    };
    listBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      setOpen(!pop.classList.contains('is-open'));
    });
    document.addEventListener('click', (event) => {
      if (!pop.contains(event.target) && !listBtn.contains(event.target)) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  load(songs[0].id, 0);
}

function initChimes() {
  const chimes = [...document.querySelectorAll('[data-chime]')];
  if (!chimes.length) return;

  let ctx = null;

  const ensureContext = () => {
    if (!ctx) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      ctx = new AudioCtor();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };

  const strike = async (note) => {
    const ac = ensureContext();
    if (!ac) return;
    if (ac.state !== 'running') {
      try {
        await ac.resume();
      } catch (e) {}
    }
    const t0 = ac.currentTime + 0.012;
    const base = 440 * Math.pow(2, (note - 69) / 12);

    const master = ac.createGain();
    master.gain.value = 0.2;
    master.connect(ac.destination);

    const partials = [
      [1.0, 0.34, 2.8],
      [2.31, 0.13, 2.0],
      [3.86, 0.08, 1.5],
      [5.42, 0.045, 1.05],
      [7.13, 0.026, 0.7],
    ];

    partials.forEach(([ratio, amp, decay], index) => {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * ratio * (1 + (Math.random() - 0.5) * 0.005), t0);
      const gain = ac.createGain();
      const attack = 0.003 + index * 0.0015;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(amp, t0 + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + decay);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + decay + 0.05);
    });

    const length = Math.floor(ac.sampleRate * 0.035);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      const fall = Math.pow(1 - i / length, 4);
      data[i] = (Math.random() * 2 - 1) * fall;
    }
    const noise = ac.createBufferSource();
    noise.buffer = buffer;
    const highpass = ac.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = Math.min(9000, base * 2.2);
    const noiseGain = ac.createGain();
    noiseGain.gain.value = 0.07;
    noise.connect(highpass);
    highpass.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t0);
  };

  const unlock = () => {
    const ac = ensureContext();
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  };
  document.addEventListener('pointerdown', unlock, { passive: true });
  document.addEventListener('keydown', unlock, { passive: true });

  chimes.forEach((chime) => {
    const note = Number(chime.dataset.note) || 90;
    const ring = () => {
      strike(note);
      chime.classList.remove('is-ringing');
      void chime.offsetWidth;
      chime.classList.add('is-ringing');
      window.setTimeout(() => chime.classList.remove('is-ringing'), 2000);
    };
    chime.addEventListener('click', (event) => {
      event.stopPropagation();
      ring();
    });
    chime.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        ring();
      }
    });
  });
}

function initBackdropScene() {
  const backdrop = document.querySelector('[data-backdrop]');
  const canvas = document.querySelector('[data-rain]');
  const art = document.querySelector('[data-art]');
  if (!backdrop || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let drops = [];
  let ripples = [];
  let raf = 0;
  let last = 0;
  const pointer = { x: -999, y: -999, active: false };
  const target = { px: 0, py: 0 };
  const current = { px: 0, py: 0 };
  const UMBRELLA = 96;

  const spawn = (initial) => ({
    x: Math.random() * (width + 160) - 80,
    y: initial ? Math.random() * height : -30 - Math.random() * 140,
    len: 8 + Math.random() * 22,
    speed: 460 + Math.random() * 620,
    alpha: 0.1 + Math.random() * 0.35,
    wind: 0.1 + Math.random() * 0.08,
    w: Math.random() > 0.85 ? 1.3 : 0.7,
  });

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(Math.min(480, Math.max(90, (width * height) / 10000)));
    drops = Array.from({ length: count }, () => spawn(true));
  };

  const draw = (time) => {
    raf = 0;
    const dt = last ? Math.min(0.05, (time - last) / 1000) : 0.016;
    last = time;
    ctx.clearRect(0, 0, width, height);

    const px = pointer.x;
    const py = pointer.y;

    ctx.lineCap = 'round';
    for (const drop of drops) {
      let vx = drop.speed * drop.wind;
      let vy = drop.speed;
      if (pointer.active) {
        const dx = drop.x - px;
        const dy = drop.y - py;
        const dist = Math.hypot(dx, dy);
        if (dist < UMBRELLA + 30 && dist > 0.0001) {
          const force = (1 - dist / (UMBRELLA + 30)) * 260;
          vx += (dx / dist) * force * 0.9;
          vy += (dy / dist) * force * 0.35;
        }
      }
      drop.x += vx * dt;
      drop.y += vy * dt;
      if (drop.y > height + 24 || drop.x < -120 || drop.x > width + 120) {
        Object.assign(drop, spawn(false));
        continue;
      }
      const grad = ctx.createLinearGradient(drop.x, drop.y, drop.x, drop.y + drop.len);
      grad.addColorStop(0, 'rgba(214, 236, 250, 0)');
      grad.addColorStop(0.5, `rgba(214, 236, 250, ${drop.alpha})`);
      grad.addColorStop(1, 'rgba(240, 250, 255, 0.05)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = drop.w;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * drop.wind * 2.2, drop.y + drop.len);
      ctx.stroke();
    }

    ripples = ripples.filter((ripple) => {
      ripple.life -= dt * 1.4;
      if (ripple.life <= 0) return false;
      const r = (1 - ripple.life) * 130 + 6;
      ctx.beginPath();
      ctx.strokeStyle = `rgba(220, 242, 255, ${0.35 * ripple.life})`;
      ctx.lineWidth = 1.2;
      ctx.ellipse(ripple.x, ripple.y, r, r * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });

    if (pointer.active) {
      const halo = ctx.createRadialGradient(px, py, 0, px, py, UMBRELLA);
      halo.addColorStop(0, 'rgba(200, 232, 255, 0.12)');
      halo.addColorStop(0.65, 'rgba(200, 232, 255, 0.045)');
      halo.addColorStop(1, 'rgba(200, 232, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(px, py, UMBRELLA, 0, Math.PI * 2);
      ctx.fill();
    }

    current.px += (target.px - current.px) * 0.06;
    current.py += (target.py - current.py) * 0.06;
    if (art) {
      art.style.transform = `scale(1.04) translate3d(${(-current.px).toFixed(2)}px, ${(-current.py).toFixed(2)}px, 0)`;
    }

    raf = requestAnimationFrame(draw);
  };

  const start = () => {
    if (!raf && !reduceMotion) raf = requestAnimationFrame(draw);
  };

  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    target.px = (event.clientX / window.innerWidth - 0.5) * 22;
    target.py = (event.clientY / window.innerHeight - 0.5) * 14;
  });

  document.addEventListener('pointerleave', () => {
    pointer.active = false;
    pointer.x = -999;
    pointer.y = -999;
    target.px = 0;
    target.py = 0;
  });

  document.addEventListener('pointerdown', (event) => {
    if (event.target.closest('a,button,input,textarea,select,.song-panel,.topbar,.gate,.lightbox')) return;
    ripples.push({ x: event.clientX, y: event.clientY, life: 1 });
    for (const drop of drops) {
      const dx = drop.x - event.clientX;
      const dy = drop.y - event.clientY;
      const dist = Math.hypot(dx, dy);
      if (dist < 150 && dist > 1) {
        drop.x += (dx / dist) * 26;
        drop.y += (dy / dist) * 14;
      }
    }
  });

  window.addEventListener('resize', () => {
    resize();
    start();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  resize();

  if (reduceMotion) {
    for (const drop of drops) {
      ctx.strokeStyle = `rgba(214, 236, 250, ${drop.alpha * 0.9})`;
      ctx.lineWidth = drop.w;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.len * drop.wind * 2.2, drop.y + drop.len);
      ctx.stroke();
    }
  } else {
    start();
  }
}
