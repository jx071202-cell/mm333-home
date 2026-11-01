export const site = {
  name: 'mm333',
  siteTitle: 'mm333 的小窝',
  tagline: '在自己的小窝里，慢慢来。',
  description: 'mm333 的个人小窝：一场雨、一些近况、喜欢的东西，和几张照片。',
  since: 2026,
  url: 'https://example.com',
};

export const intro = {
  kicker: 'WELCOME IN',
  title: ['放轻松，', '这里是我的地方。'],
  hint: '点击任意位置进入',
  skip: '跳过开场',
  videoWide: '/media/intro-720.mp4',
  videoSmall: '/media/intro-540.mp4',
  poster: '/images/poster.jpg',
};

export const scene = {
  art: '/images/scene-art.jpg',
  artWide: '/images/scene-wide.jpg',
  artTall: '/images/scene-tall.jpg',
  kicker: 'WEATHERING WITH YOU',
  title: 'mm333 的小窝',
  lines: ['雨会停的。', '在那之前，先在这里待一会。'],
  hint: '移动鼠标：雨会绕开你 · 点击：水面会荡开',
  credit: '壁纸还原：天气之子 · 嘻嘻嘻，为你打伞~',
};

export const nav = [
  { id: 'top', label: '首页' },
  { id: 'about', label: '关于我' },
  { id: 'songs', label: '我的歌单' },
  { id: 'anime', label: '番剧' },
  { id: 'games', label: '游戏' },
  { id: 'moments', label: '说说' },
  { id: 'mood', label: '心情' },
  { id: 'coffee', label: '咖啡' },
  { id: 'board', label: '留言板' },
];

export const contacts = {
  qq: '2621636916',
  qqNickname: 'mm333',
  qqAvatar: 'https://q1.qlogo.cn/g?b=qq&nk=2621636916&s=140',
  qqZone: 'https://user.qzone.qq.com/2621636916',
  email: '2621636916@qq.com',
  links: [
    { label: 'QQ 空间', href: 'https://user.qzone.qq.com/2621636916' },
    { label: 'Bilibili', href: '' },
    { label: 'GitHub', href: '' },
  ],
};

export const about = {
  title: '关于我',
  subtitle: '一点自我介绍',
  avatar: 'https://q1.qlogo.cn/g?b=qq&nk=2621636916&s=140',
  paragraphs: [
    '我是 mm333，喜欢摄影、咖啡、游戏，还有阴天。',
    '这个小窝不放攻略，也不写教程，只记录一些我真正在意的东西：一场雨、一张照片、一局游戏、一杯没喝完的咖啡。',
    '慢慢来，比较快。',
  ],
  facts: [] as { label: string; value: string }[],
};

export const songs = [
  { name: '《天气之子》OST', artist: 'RADWIMPS', note: '下雨天单曲循环', link: '' },
  { name: 'Grand Escape', artist: 'RADWIMPS', note: '出门前听一遍', link: '' },
  { name: 'Lemon', artist: '米津玄师', note: '写东西的时候', link: '' },
  { name: 'Somewhere Over the Rainbow', artist: 'Israel Kamakawiwoʻole', note: '睡前', link: '' },
].map((item) => ({ ...item, link: item.link || '' }));

export const anime = [
  { name: '《天气之子》', meta: '新海诚 · 2019', note: '看哭过，不丢人' },
  { name: '《你的名字。》', meta: '新海诚 · 2016', note: '入坑作' },
  { name: '《铃芽之旅》', meta: '新海诚 · 2022', note: '想再去一次电影院' },
  { name: '《花束般的恋爱》', meta: '土井裕泰 · 2021', note: '后劲很大' },
];

export const games = [
  { name: '《塞尔达传说：王国之泪》', meta: 'Switch', note: '想再通一次，但没时间' },
  { name: '《星露谷物语》', meta: 'PC', note: '种地，很解压' },
  { name: '《原神》', meta: 'PC / 手机', note: '看看风景就下线' },
  { name: '《GRIS》', meta: 'PC', note: '像看一场水彩动画' },
];

export const moments = [
  { date: '2026.11.01', text: '把小窝搭起来了。第一次有了自己的首页，而不是一堆散落在各处的链接。' },
  { date: '2026.10.28', text: '傍晚下了一场很短的雨，十分钟就停了。刚好够拍两张。' },
  { date: '2026.10.20', text: '开始整理这两年的照片，翻出来最多的不是人，是天空。' },
  { date: '2026.10.06', text: '想通一件事：与其像收藏夹一样攒东西，不如当一台留声机。' },
];

export const moods = [
  { date: '2026.11.01', mood: '🌧️', text: '下雨，但心情是晴的。' },
  { date: '2026.10.30', mood: '☕', text: '第三杯咖啡。今天能写完。' },
  { date: '2026.10.27', mood: '🌤️', text: '风很软，适合什么都不做。' },
  { date: '2026.10.24', mood: '🌙', text: '夜里的城市比白天好看。' },
];

export const coffee = [
  { name: '手冲 · 耶加雪菲', meta: '自己冲 · 15g / 250ml', note: '喜欢那种很亮的酸' },
  { name: '冰美式', meta: '楼下 · 少冰', note: '夏天续命' },
  { name: '拿铁', meta: '燕麦奶', note: '想喝奶的时候就喝' },
  { name: '冷萃', meta: '前一晚泡好', note: '第二天早上刚好' },
];

export const board = {
  title: '留言板',
  note: '小窝是纯静态站，暂时不收留言。想说话，加我 QQ 或者发邮件。',
};

export const photos = [
  { src: '/images/photo-window.jpg', caption: '窗边的下午' },
  { src: '/images/photo-coffee.jpg', caption: '一杯' },
  { src: '/images/photo-street.jpg', caption: '傍晚的街' },
  { src: '/images/photo-desk.jpg', caption: '书桌一角' },
];
