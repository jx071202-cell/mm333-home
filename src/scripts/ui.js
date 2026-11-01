const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initUI() {
  initIntros();
  initTopbar();
  initNavActive();
  initReveal();
  initLightbox();
  initCopy();
  initBackdropScene();
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
  const player = document.querySelector('[data-player]');
  const audio = document.querySelector('[data-audio]');
  if (!player || !audio) return;

  const items = [...document.querySelectorAll('[data-song]')];
  const titleEl = player.querySelector('[data-player-title]');
  const subEl = player.querySelector('[data-player-sub]');
  const toggle = player.querySelector('[data-play-toggle]');
  const prevBtn = player.querySelector('[data-play-prev]');
  const nextBtn = player.querySelector('[data-play-next]');
  const seek = player.querySelector('[data-seek]');
  const fill = player.querySelector('[data-progress]');
  const curEl = document.querySelector('[data-time-current]');
  const totalEl = document.querySelector('[data-time-total]');

  let index = -1;

  const fmt = (value) => {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const m = Math.floor(value / 60);
    const s = Math.floor(value % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const setState = (i, state) => {
    items.forEach((item, k) => {
      const badge = item.querySelector('[data-state]');
      if (!badge) return;
      if (k !== i) {
        badge.textContent = '▶';
        return;
      }
      badge.textContent = state;
    });
  };

  const setActive = (i) => {
    items.forEach((item, k) => {
      item.classList.toggle('is-active', k === i);
      item.classList.remove('is-error');
    });
  };

  const load = (i, autoplay) => {
    const item = items[i];
    if (!item) return;
    index = i;
    const id = item.dataset.id;
    const name = item.querySelector('.playlist__name');
    const meta = item.querySelector('.playlist__meta');
    if (titleEl) titleEl.textContent = name ? name.textContent : '未知歌曲';
    if (subEl) subEl.textContent = meta ? meta.textContent : '';
    setActive(i);
    audio.src = `https://music.163.com/song/media/outer/url?id=${encodeURIComponent(id)}.mp3`;
    audio.load();
    if (autoplay) {
      const p = audio.play();
      if (p && p.catch) p.catch(() => {});
    }
  };

  const step = (delta) => {
    if (!items.length) return;
    const base = index < 0 ? 0 : index;
    const next = (base + delta + items.length) % items.length;
    load(next, true);
  };

  audio.addEventListener('play', () => {
    player.classList.add('is-playing');
    if (toggle) toggle.setAttribute('aria-label', '暂停');
    setState(index, '❚❚');
  });

  audio.addEventListener('pause', () => {
    player.classList.remove('is-playing');
    if (toggle) toggle.setAttribute('aria-label', '播放');
    setState(index, '▶');
  });

  audio.addEventListener('timeupdate', () => {
    const duration = audio.duration || 0;
    const current = audio.currentTime || 0;
    if (fill) fill.style.width = `${duration ? (current / duration) * 100 : 0}%`;
    if (curEl) curEl.textContent = fmt(current);
  });

  audio.addEventListener('loadedmetadata', () => {
    if (totalEl) totalEl.textContent = fmt(audio.duration);
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

  audio.addEventListener('ended', () => step(1));

  audio.addEventListener('error', () => {
    player.classList.remove('is-playing');
    const item = items[index];
    if (item) {
      item.classList.add('is-error');
      const badge = item.querySelector('[data-state]');
      if (badge) badge.textContent = '×';
    }
    if (subEl) subEl.textContent = '这首歌暂时播不了，去网易云听吧';
  });

  items.forEach((item, i) => {
    const button = item.querySelector('[data-play-song]');
    if (!button) return;
    button.addEventListener('click', () => {
      if (index === i) {
        if (audio.paused) {
          const p = audio.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          audio.pause();
        }
        return;
      }
      load(i, true);
    });
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      if (index < 0) {
        load(0, true);
        return;
      }
      if (audio.paused) {
        const p = audio.play();
        if (p && p.catch) p.catch(() => {});
      } else {
        audio.pause();
      }
    });
  }

  if (prevBtn) prevBtn.addEventListener('click', () => step(-1));
  if (nextBtn) nextBtn.addEventListener('click', () => step(1));

  if (seek) {
    seek.addEventListener('click', (event) => {
      if (!audio.duration) return;
      const rect = seek.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      audio.currentTime = ratio * audio.duration;
    });
  }
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
