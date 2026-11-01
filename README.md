# mm333 的小窝

一个「个人小窝」式单页：**进门先播一段开场视频，点一下进入；进去之后是一整屏可交互的《天气之子》雨景**，往下是：关于我 / 我的歌单 / 番剧 / 游戏 / 说说 / 心情 / 咖啡 / 留言板。

- 纯静态（Astro 构建），没有后端
- 开场视频从 `.mpkg` 壁纸包里解包、**裁掉了画面里烧录的字幕和人名条**、重新压过：**144 MB → 10 MB（720p）/ 5.9 MB（540p）**
- 进门后的场景还原自壁纸包：一张画 + 一层雨，**鼠标所在处雨会绕开，点击会荡开涟漪**，画面跟随鼠标轻微视差
- 支持 `prefers-reduced-motion`（只保留静态雨、不播动画）

## 跑起来

```bash
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # 产物在 dist/
pnpm preview
```

> 本机 Node / pnpm 不在 PATH 时：
>
> ```powershell
> $node = "C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe"
> $pnpm = "C:\Users\Administrator\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\pnpm\bin\pnpm.mjs"
> & $node $pnpm dev
> ```

## 改内容：只改一个文件

`src/data/site.ts` 里是全部文案和配置：

| 字段 | 作用 |
| --- | --- |
| `site` | 名字、站点标题、描述、起始年份 |
| `intro` | 开场门的文案、提示、视频路径、海报 |
| `scene` | 进门后场景的标题、两行文案、提示、出处 |
| `nav` | 顶部导航（顺序与区块 id 对应） |
| `contacts` | QQ 号、QQ 空间、邮箱、其它链接（href 留空就不显示） |
| `about` | 关于我：自述段落、头像、社交入口；`facts` 留空则不出小资料 |
| `songs` / `anime` / `games` / `coffee` | 四个列表页的内容 |
| `moments` | 说说时间线 |
| `moods` | 心情卡片 |
| `board` | 留言板说明（接 Giscus / Waline 后替换） |
| `photos` | 说说下面的照片条（图片放 `public/images/`） |

## 换素材

**开场视频**：把视频放进 `public/media/`，然后改 `src/data/site.ts` 的 `intro.videoWide` / `intro.videoSmall`。

建议先压缩（开场门不该让人等）：

```bash
ffmpeg -i input.mp4 -an -vf "scale=1280:720,fps=30" \
  -c:v libx264 -preset medium -crf 30 -pix_fmt yuv420p -movflags +faststart \
  public/media/intro-720.mp4
```

**进门后的场景图**：
- 宽屏用 `public/images/scene-wide.jpg`（1920×1080，中间完整画面 + 两侧模糊）
- 手机用 `public/images/scene-tall.jpg`（1080×1920，画面居中 + 上下模糊）
- 兜底 `public/images/scene-art.jpg`（原图）

换图后同步改 `src/data/site.ts` 里 `scene.art/artWide/artTall` 即可。雨、涟漪、视差都在 `src/scripts/ui.js` 的 `initRainScene()`。

## 素材是怎么来的

两个 `.mpkg` 都是壁纸软件的打包格式（头 `PKGM0014`，内含条目表）：

- `1800975564.mpkg`：里面是个 144 MB 的 mp4（《天气之子》中字剪辑）→ 抽出来重新压成 720p/540p
- `1915563165.mpkg`：Wallpaper Engine **场景**包（`scene.json` + 一张 1080 的图 + 一层雨粒子）→ **WE 场景浏览器跑不了**，所以按它的构成还原成了网页：图 + canvas 雨 + 鼠标交互

解包脚本在 `scripts/unpack-mpkg.py`，用法：

```bash
python scripts/unpack-mpkg.py "C:/path/to/xxx.mpkg" out-dir
```

> ⚠️ 视频和画都来自《天气之子》，版权不属于你。自己看没问题，**公开挂到网上属于侵权**。如果这个站要对外，建议换成自己拍的视频/自己画的图，或者找 CC0 素材。

## 部署到 GitHub Pages

仓库里已有 `.github/workflows/deploy.yml`：推到 `main` 自动构建部署。

1. 建仓库并推送代码
2. 仓库 **Settings → Pages → Source** 选 **GitHub Actions**
3. 等 Actions 跑完，地址是 `https://<用户名>.github.io/<仓库名>/`（仓库名为 `<用户名>.github.io` 时是根路径）

子路径自动适配：workflow 会按仓库名注入 `SITE_BASE`，资源、链接、sitemap、robots 都会带前缀。

## 结构

```
mm333-home/
├─ src/
│  ├─ data/site.ts          # 所有文案与配置
│  ├─ pages/index.astro     # 单页：场景 + 四个区块
│  ├─ components/           # 开场门 / 顶栏 / 场景
│  ├─ scripts/ui.js         # 门、主题、雨、视差、tabs、灯箱
│  └─ styles/global.css     # 设计系统（黄昏 / 夜两套）
├─ public/
│  ├─ media/                # 压缩后的开场视频
│  └─ images/               # 海报、场景图、照片
└─ scripts/                 # 解包、压缩、截图、占位图生成
```
