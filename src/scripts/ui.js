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
  initPanels();
  initFortune();
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
  const audio = document.querySelector('[data-audio]');
  const items = [...document.querySelectorAll('[data-song]')];
  const folia = document.querySelector('[data-folia]');
  if (!audio || !items.length) return;

  const API_BASES = ['https://zm.wwoyun.cn', 'https://zm.i9mr.com'];

  const els = {
    cover: document.querySelector('[data-player-cover]'),
    title: document.querySelector('[data-player-title]'),
    sub: document.querySelector('[data-player-sub]'),
    timeCurrent: document.querySelector('[data-time-current]'),
    timeTotal: document.querySelector('[data-time-total]'),
    seek: document.querySelector('[data-seek]'),
    progress: document.querySelector('[data-progress]'),
    toggle: document.querySelector('[data-play-toggle]'),
    mute: document.querySelector('[data-player-mute]'),
    foliaCover: document.querySelector('[data-folia-cover]'),
    foliaBg: document.querySelector('[data-folia-bg]'),
    foliaTitle: document.querySelector('[data-folia-title]'),
    foliaSub: document.querySelector('[data-folia-sub]'),
    foliaLyrics: document.querySelector('[data-folia-lyrics]'),
  };

  const songs = items.map((el) => ({
    id: el.dataset.id,
    name: el.querySelector('.playlist__name')?.textContent.trim() || '',
    meta: el.querySelector('.playlist__meta')?.textContent.trim() || '',
    cover: el.dataset.cover || '',
  }));

  let index = -1;
  let lines = [];
  let activeLine = -1;
  let loadToken = 0;
  const cache = new Map();

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const sec = String(total % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  const parseLrc = (text) => {
    const result = [];
    if (!text) return result;
    text.split(/\r?\n/).forEach((raw) => {
      const matches = [...raw.matchAll(/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)];
      const content = raw.replace(/\[[^\]]*\]/g, '').trim();
      if (!matches.length || !content) return;
      matches.forEach((match) => {
        const minutes = Number(match[1]);
        const seconds = Number(match[2]);
        const fraction = match[3] ? Number(`0.${match[3]}`) : 0;
        result.push({ time: minutes * 60 + seconds + fraction, text: content });
      });
    });
    return result.sort((a, b) => a.time - b.time);
  };

  const fetchJson = async (url) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(url, { signal: controller.signal, mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  };

  const resolveStream = (song) => {
    if (cache.has(song.id)) return cache.get(song.id);
    const task = (async () => {
      for (const base of API_BASES) {
        try {
          const [urlRes, lyricRes] = await Promise.all([
            fetchJson(`${base}/song/url?id=${encodeURIComponent(song.id)}&br=128000`),
            fetchJson(`${base}/lyric?id=${encodeURIComponent(song.id)}`).catch(() => null),
          ]);
          const rawUrl = urlRes?.data?.[0]?.url;
          if (!rawUrl) continue;
          return { url: rawUrl.replace(/^http:/, 'https:'), lrc: lyricRes?.lrc?.lyric || '' };
        } catch (error) {
          continue;
        }
      }
      return null;
    })();
    cache.set(song.id, task);
    return task;
  };

  const renderLyrics = () => {
    if (!els.foliaLyrics) return;
    els.foliaLyrics.innerHTML = '';
    const lineNodes = lines.map((line) => {
      const p = document.createElement('p');
      p.className = 'folia__line';
      p.textContent = line.text;
      els.foliaLyrics.appendChild(p);
      return p;
    });
    if (!lines.length) {
      const p = document.createElement('p');
      p.className = 'folia__line is-active';
      p.textContent = '这首歌暂时没有歌词';
      els.foliaLyrics.appendChild(p);
      lineNodes.push(p);
    }
    els.foliaLyrics.__nodes = lineNodes;
    activeLine = -1;
  };

  const scrollLyrics = (target) => {
    if (!els.foliaLyrics || !target) return;
    const box = els.foliaLyrics;
    const offset = target.offsetTop - box.clientHeight / 2 + target.offsetHeight / 2;
    box.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
  };

  const setActiveLine = (next) => {
    const nodes = els.foliaLyrics?.__nodes;
    if (!nodes || next === activeLine) return;
    nodes.forEach((node, i) => {
      node.classList.toggle('is-active', i === next);
      node.classList.toggle('is-near', Math.abs(i - next) === 1);
    });
    activeLine = next;
    if (next >= 0) scrollLyrics(nodes[next]);
  };

  const syncLyrics = (time) => {
    if (!lines.length) return;
    let next = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].time <= time + 0.15) next = i;
      else break;
    }
    setActiveLine(next);
  };

  const setActiveItem = (next) => {
    items.forEach((el, i) => {
      el.classList.toggle('is-active', i === next);
      const state = el.querySelector('[data-state]');
      if (state) state.textContent = i === next ? '❚❚' : '▶';
    });
  };

  const applySong = (song) => {
    if (els.cover && song.cover) els.cover.src = song.cover;
    if (els.foliaCover && song.cover) els.foliaCover.src = song.cover;
    if (els.foliaBg && song.cover) els.foliaBg.style.backgroundImage = `url("${song.cover}")`;
    if (els.title) els.title.textContent = song.name;
    if (els.sub) els.sub.textContent = song.meta;
    if (els.foliaTitle) els.foliaTitle.textContent = song.name;
    if (els.foliaSub) els.foliaSub.textContent = song.meta;
    if (els.timeTotal) els.timeTotal.textContent = '0:00';
    if (els.timeCurrent) els.timeCurrent.textContent = '0:00';
    if (els.progress) els.progress.style.width = '0%';
  };

  const select = async (next, autoplay) => {
    if (next < 0 || next >= songs.length) return;
    index = next;
    const song = songs[next];
    const token = ++loadToken;
    applySong(song);
    setActiveItem(next);
    lines = [];
    renderLyrics();
    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    const result = await resolveStream(song);
    if (token !== loadToken) return;
    if (!result || !result.url) {
      if (els.sub) els.sub.textContent = '接口暂时不可用 · 稍后再试';
      return;
    }
    lines = parseLrc(result.lrc);
    renderLyrics();
    audio.src = result.url;
    audio.load();
    if (autoplay) audio.play().catch(() => {});
  };

  const updatePlayState = () => {
    if (!bar) return;
    const playing = !audio.paused && !audio.ended;
    bar.classList.toggle('is-playing', playing);
    if (els.toggle) els.toggle.setAttribute('aria-label', playing ? '暂停' : '播放');
  };

  audio.addEventListener('timeupdate', () => {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    if (els.timeCurrent) els.timeCurrent.textContent = formatTime(audio.currentTime);
    if (els.timeTotal) els.timeTotal.textContent = formatTime(duration);
    if (els.progress && duration > 0) {
      els.progress.style.width = `${Math.min(100, (audio.currentTime / duration) * 100)}%`;
    }
    syncLyrics(audio.currentTime);
  });

  audio.addEventListener('play', updatePlayState);
  audio.addEventListener('pause', updatePlayState);
  audio.addEventListener('ended', () => {
    updatePlayState();
    select((index + 1) % songs.length, true);
  });
  audio.addEventListener('error', () => {
    if (els.sub) els.sub.textContent = '播放失败 · 试试下一首';
    updatePlayState();
  });

  els.toggle?.addEventListener('click', () => {
    if (index === -1) {
      select(0, true);
      return;
    }
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  });

  document.querySelector('[data-play-prev]')?.addEventListener('click', () => {
    select((index - 1 + songs.length) % songs.length, true);
  });

  document.querySelector('[data-play-next]')?.addEventListener('click', () => {
    select((index + 1) % songs.length, true);
  });

  items.forEach((el) => {
    el.querySelector('[data-play-song]')?.addEventListener('click', () => {
      select(Number(el.dataset.index), true);
    });
  });

  els.seek?.addEventListener('pointerdown', (event) => {
    if (!Number.isFinite(audio.duration) || !audio.duration) return;
    const rect = els.seek.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * audio.duration;
  });

  els.mute?.addEventListener('click', () => {
    audio.muted = !audio.muted;
    els.mute.classList.toggle('is-muted', audio.muted);
    els.mute.setAttribute('aria-label', audio.muted ? '取消静音' : '静音');
  });

  const setFoliaOpen = (open) => {
    if (!folia) return;
    folia.classList.toggle('is-open', open);
    folia.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('folia-open', open);
    if (open && activeLine >= 0) {
      const nodes = els.foliaLyrics?.__nodes;
      if (nodes && nodes[activeLine]) scrollLyrics(nodes[activeLine]);
    }
  };

  document.querySelectorAll('[data-folia-open]').forEach((button) =>
    button.addEventListener('click', () => setFoliaOpen(true))
  );
  document.querySelector('[data-folia-close]')?.addEventListener('click', () => setFoliaOpen(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setFoliaOpen(false);
  });

  const first = songs[0];
  if (first) {
    if (els.cover && first.cover) els.cover.src = first.cover;
    if (els.foliaCover && first.cover) els.foliaCover.src = first.cover;
    if (els.foliaBg && first.cover) els.foliaBg.style.backgroundImage = `url("${first.cover}")`;
    if (els.title) els.title.textContent = first.name;
    if (els.sub) els.sub.textContent = first.meta;
    if (els.foliaTitle) els.foliaTitle.textContent = first.name;
    if (els.foliaSub) els.foliaSub.textContent = first.meta;
  }
  updatePlayState();
}

function initPanels() {
  const panels = [...document.querySelectorAll('[data-panel]')];
  if (!panels.length) return;

  const closeAll = () => {
    panels.forEach((panel) => {
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden', 'true');
    });
  };

  const open = (name) => {
    const target = panels.find((panel) => panel.dataset.panel === name);
    if (!target) return;
    panels.forEach((panel) => {
      const active = panel === target;
      panel.classList.toggle('is-open', active);
      panel.setAttribute('aria-hidden', String(!active));
    });
    target.dispatchEvent(new CustomEvent('panelopen'));
  };

  document.querySelectorAll('[data-open-panel]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      open(btn.dataset.openPanel);
    });
  });

  document.querySelectorAll('[data-close-panel]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      closeAll();
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-panel], [data-open-panel]')) closeAll();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll();
  });
}

function initFortune() {
  const panel = document.querySelector('[data-panel="fortune"]');
  if (!panel) return;
  const draw = panel.querySelector('[data-fortune-draw]');
  const levelEl = panel.querySelector('[data-fortune-level]');
  const textEl = panel.querySelector('[data-fortune-text]');
  const hintEl = panel.querySelector('[data-fortune-hint]');
  const dateEl = panel.querySelector('[data-fortune-date]');
  let items = [];
  try {
    items = JSON.parse(panel.dataset.fortunes || '[]');
  } catch (e) {
    items = [];
  }
  if (!draw || !items.length) return;

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const keyFor = (day) => `mm333-fortune:${day}`;

  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 100000;
    return h;
  };

  const setDate = (day) => {
    if (dateEl) dateEl.textContent = day.replaceAll('-', ' / ');
  };

  const reveal = (index, day) => {
    const item = items[index];
    if (!item) return;
    draw.classList.remove('is-revealed');
    void draw.offsetWidth;
    if (levelEl) levelEl.textContent = item.level;
    if (textEl) textEl.textContent = item.text;
    if (hintEl) hintEl.textContent = '今日已抽 · 明天再来';
    setDate(day);
    draw.classList.add('is-revealed');
  };

  const stored = () => {
    const day = today();
    try {
      const raw = window.localStorage.getItem(keyFor(day));
      if (raw === null) return null;
      const index = Number(raw);
      return Number.isFinite(index) ? { day, index } : null;
    } catch (e) {
      return null;
    }
  };

  const drawNow = () => {
    const day = today();
    const current = stored();
    if (current) {
      reveal(current.index, day);
      return;
    }
    const index = hash(day) % items.length;
    try {
      window.localStorage.setItem(keyFor(day), String(index));
    } catch (e) {}
    reveal(index, day);
  };

  draw.addEventListener('click', drawNow);

  panel.addEventListener('panelopen', () => {
    const current = stored();
    if (current) {
      reveal(current.index, current.day);
      return;
    }
    if (levelEl) levelEl.textContent = '？';
    if (textEl) textEl.textContent = '一天一签，明天再来。';
    if (hintEl) hintEl.textContent = '点一下，抽今天的签';
    setDate(today());
  });
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
    master.gain.value = 0.17;
    master.connect(ac.destination);

    const partials = [
      [1.0, 0.32, 2.8],
      [2.31, 0.12, 2.0],
      [3.86, 0.07, 1.5],
      [5.42, 0.04, 1.05],
      [7.13, 0.024, 0.7],
    ];

    partials.forEach(([ratio, amp, decay], index) => {
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base * ratio * (1 + (Math.random() - 0.5) * 0.006), t0);
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
    noiseGain.gain.value = 0.06;
    noise.connect(highpass);
    highpass.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(t0);
  };

  window.__chimeStrike = strike;

  const entries = chimes.map((el) => ({ el, note: Number(el.dataset.note) || 90 }));

  const ring = (entry) => {
    strike(entry.note);
    entry.el.classList.remove('is-ringing');
    void entry.el.offsetWidth;
    entry.el.classList.add('is-ringing');
    window.setTimeout(() => entry.el.classList.remove('is-ringing'), 2200);
  };

  const unlock = () => {
    const ac = ensureContext();
    if (ac && ac.state === 'suspended') ac.resume().catch(() => {});
  };
  ['pointerdown', 'keydown', 'touchstart'].forEach((type) => {
    document.addEventListener(type, unlock, { once: true, passive: true });
  });

  if (reduceMotion) return;

  const schedule = () => {
    const wait = 6000 + Math.random() * 12000;
    window.setTimeout(() => {
      if (document.hidden) {
        schedule();
        return;
      }
      ring(entries[Math.floor(Math.random() * entries.length)]);
      schedule();
    }, wait);
  };

  const startWhenEntered = () => {
    if (document.documentElement.dataset.entered === '1') {
      window.setTimeout(() => {
        ring(entries[0]);
        schedule();
      }, 1600);
      return;
    }
    window.setTimeout(startWhenEntered, 500);
  };
  startWhenEntered();
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
