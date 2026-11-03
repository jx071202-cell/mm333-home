export const site = {
  name: 'mm333',
  siteTitle: 'mm333 的小窝',
  tagline: '在自己的小窝里，慢慢来。',
  description: 'mm333 的个人小窝：一场雨，和我的歌单。',
  since: 2026,
  url: 'https://jx071202-cell.github.io/mm333-home/',
};

export const intro = {
  kicker: 'WELCOME IN',
  title: ['放轻松，', '这里是我的地方。'],
  hint: '点击任意位置进入',
  skip: '跳过开场',
  videoWide: '/media/intro-1080.mp4',
  videoSmall: '/media/intro-720.mp4',
  poster: '/images/poster.jpg',
};

export const scene = {
  art: '/images/scene-art.jpg',
  artWide: '/images/scene-wide.jpg',
  artTall: '/images/scene-tall.jpg',
};

export const hero = {
  greeting: '你好呀，欢迎来到我的小窝～',
  title: '我是 mm333',
  suffix: ' ～',
  sub: '关于 mm333 的一切',
  avatar: 'https://q1.qlogo.cn/g?b=qq&nk=2621636916&s=140',
  socials: [
    { label: 'QQ', href: 'https://wpa.qq.com/msgrd?v=3&uin=2621636916&site=qq&menu=yes' },
    { label: 'QQ 空间', href: 'https://user.qzone.qq.com/2621636916' },
    { label: '网易云', href: 'https://music.163.com/#/user/home?id=8492969981' },
  ],
};

export const nav = [
  { id: 'top', label: '首页', panel: null },
  { id: 'songs', label: '我的歌单', panel: 'playlist' },
  { id: 'shuoshuo', label: '说说', panel: 'shuoshuo' },
  { id: 'fortune', label: '每日占卜', panel: 'fortune' },
];

export const shuoshuo = [
  { date: '2026-11-03', text: '风铃今天自己响了好几次，像是有谁路过。' },
  { date: '2026-11-01', text: '雨天不出门，循环《浴室》一整晚。' },
  { date: '2026-10-30', text: '把屋顶那场日出设成了桌面，看着就安静。' },
];

export const fortune = {
  items: [
    { level: '大吉', text: '今天适合听一首很久没放的歌，会想起一个人。' },
    { level: '中吉', text: '会有一件小事顺起来，别急着否定自己。' },
    { level: '小吉', text: '适合把想说没说的话写下来，不一定要发出去。' },
    { level: '吉', text: '陌生人的一句客气话，会让你开心一下午。' },
    { level: '末吉', text: '晚点再决定。今天的天气比你的心情更值得看。' },
    { level: '平', text: '普通的一天，适合把歌单往下翻一页。' },
    { level: '凶', text: '别在今天做大决定，先听完这一首。' },
  ],
};

export const contacts = {
  qq: '2621636916',
  qqNickname: 'mm333',
  qqAvatar: 'https://q1.qlogo.cn/g?b=qq&nk=2621636916&s=140',
  qqZone: 'https://user.qzone.qq.com/2621636916',
};

export const playlist = {
  source: {
    label: 'CLANNAD_Stumble',
    href: 'https://music.163.com/user/home?id=1826444943',
  },
  note: '点歌名播放。音频走网易云外链，受版权限制个别歌可能不可播。',
  songs: [
    {
      id: '483378334',
      name: '浴室',
      artist: 'deca joins',
      album: '浴室',
      cover: 'https://p4.music.126.net/byjfkEIOWI_RmxSKEWTPyw==/18910500486297525.jpg',
      duration: 260,
    },
    {
      id: '22707033',
      name: 'Ana (Short Ver.)',
      artist: 'Lia',
      album: 'CLANNAD ORIGINAL SOUNDTRACK',
      cover: 'https://p3.music.126.net/kkkPkRGflxLurhhKBbCmPg==/109951171268737495.jpg',
      duration: 325,
    },
  ],
};
