# HYTEX · 个人简历页

基于提供的简历制作，采用编辑式排版、暖白背景和低饱和的绿色强调。视觉参考 frontend-slides 的 Paper & Ink 与 Swiss Modern，以文字层级、细分隔线和留白组织内容，保留简历网页的滚动和手机排版。纯 HTML / CSS / JavaScript，无 npm 依赖、无后端，字体和资源均保存在本目录。可直接使用 GitHub Pages 托管。

## 本地查看

直接打开 `index.html` 可以浏览。若要检查复制邮箱等需要安全上下文的功能，在本目录运行：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 http://localhost:4173 。这只是本机预览，不需要部署自己的服务器。

## 通过 GitHub Pages 发布（推荐）

1. 登录 GitHub，创建公开仓库 `resume-site`。GitHub Free 可在公开仓库使用 Pages。
2. 上传此目录内的文件到仓库根目录，确保根目录直接有 `index.html`，并保留 `assets` 子目录。不要把整个 `resume-site` 文件夹作为仓库的下一层。
3. 提交到 `main` 分支后，进入仓库 **Settings → Pages**。
4. 在 **Build and deployment → Source** 选择 **Deploy from a branch**。
5. 选择 **main** 分支和 **/ (root)** 目录，点击 **Save**。
6. 等待 GitHub 的 **Actions → pages build and deployment** 完成。回到 Pages 设置页复制实际站点链接。
7. 地址通常为 `https://你的GitHub用户名.github.io/resume-site/`。将这个链接发给招聘方即可，无需发送源代码或自己准备服务器。

如果希望地址没有 `/resume-site/`，将仓库命名为 `你的GitHub用户名.github.io`，按同样方法发布。一个账号只能有一个这样的用户站点；已有用户站点时推荐使用 `resume-site` 项目仓库。

网页上传方式：新仓库页面选择 **uploading an existing file**，或在仓库 **Add file → Upload files**。上传本目录内的网页文件和 `assets` 文件夹；`.nojekyll` 可使用 Git 命令上传。此站点不使用下划线目录，即便网页上传遗漏该空文件，仍能按上述方式发布。

如果使用 Git，在 GitHub 新建空仓库后，在本目录执行（替换用户名）：

```bash
git init -b main
git add .
git commit -m "Create personal resume website"
git remote add origin https://github.com/你的GitHub用户名/resume-site.git
git push -u origin main
```

之后仍需在仓库 Settings → Pages 中选择发布分支。每次修改后提交并推送，GitHub 会自动更新站点。

官方说明：[创建 GitHub Pages 站点](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)、[配置发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 当前仓库

源码仓库：[z6221668/hytex](https://github.com/z6221668/hytex)。

此仓库名称与账号名不同，属于项目站点。推送后，在仓库 **Settings → Pages** 选择 **Deploy from a branch → main → / (root)**。发布完成后以 Pages 设置页显示的地址为准；默认项目地址为 `https://z6221668.github.io/hytex/`。Git 推送完成不代表 Pages 已启用或发布成功。

## 修改内容

- `resume-data.js`：技术球、项目经历、工作经历。技术球的 `size` 控制大小，`kind` 是技术类型，`description` 是技术说明。位置由背景动画自动生成。
- `index.html`：昵称、个人介绍、教育与邮箱。网页本身就是公开简历，不提供 PDF 下载。
- `app.js`：复制邮箱地址与互动逻辑。更换邮箱时同步修改此文件和 `index.html`。
- `styles.css`：基础布局、技术卡片、项目与工作经历。
- `background.css`：全页背景小球、右侧说明和手机适配。
- `editorial.css`：当前编辑式排版、阅读背景、技术栏、项目列表与手机样式。
- `background.js`：随机漂浮、滑向右侧、展示说明、返回背景及暂停控制。
- `query-demo.js` / `query-demo.css`：开源项目的串行与并行查询时间线动画、暂停重播与手机适配。时间线使用示意时长，不代表性能测试。
- `assets/archivo.ttf` / `assets/archivo-license.txt`：本地 Archivo 字体及 SIL Open Font License。
预览图仅用于本地检查，由 `.gitignore` 排除，不上传至 Pages 仓库。

原文同时出现“7 年”和“8 年”经验，网页采用“2018 年起从事研发”，避免冲突。XLEND、贷超项目中的“至今”沿用原文，发布前请核实最新日期。AI 技术展示仅采用原简历已有的 Spring AI、模型服务接入与工作流实践。项目规模、业务背景和技术处理放在项目描述与工作内容中，不单独展示成绩数字。

发布后页面可公开访问。公开版使用 HYTEX，联系方式仅有邮箱，保留公司名称与项目经历，隐藏真实姓名、照片、电话、个人所在城市和院校名称。公司名称中保留的地名属于公司信息。网站目录不存放原始简历或 PDF 文件。

## 页面功能

- 全页背景的技术球采用分区布点，在球较少、文字遮挡较少的位置生成；漂移时选择疏散区域并缓慢转向，相邻球通过柔性分离避免聚集。滚动时更新阅读区，窗口变化时保持相对分布。粒子球缓慢移动、旋转，AI / Spring 球更大。随机选中的球滑到右侧，技术说明逐字显示；显示完成后停留 10 秒，沿原路径返回出发位置。
- 点击背景技术球，会直接移到右侧展示说明。展示中的球被点击后，说明立即关闭，粒子以当前球为中心依次从右侧吸入，再从随机的背景空位中的一个点依次喷出并补成原球，继续漂浮。没有可见的小口或标签。每次点击重新开始回收计时；转移过程中暂时锁定技术选择，避免其他点击打断喷射。
- 重组时会推开附近球，碰撞按球大小计算质量，以冲量、碰撞分离和阻尼处理反弹。回收不删除该技术球。手动点击回收时，即使背景暂停也播放完整过程；减少动态效果时减小转移轨迹的弯曲幅度，保留点击反馈。通道只临时使用一个 Canvas，结束后清理。
- 首页“技术说明”选择框可以指定技术；选择“随机展示”恢复自动轮换。手机端说明在右下方显示。
- 独立技术栈区，按 Java 服务、AI 内容处理、数据与缓存、服务通信、部署与监控、跨端开发分类展示实际工作。Flutter / Electron 纳入正式技术栏。
- 可以暂停背景；跟随系统“减少动态效果”偏好；标签页切到后台时暂停动画。暂停时仍可通过选择框查看技术说明。
- 七个项目分类筛选；项目详情使用弹窗，保持卡片高度不变。支持 Esc、关闭按钮和点击遮罩关闭，关闭后回到原位置；四段工作经历与教育经历。
- 邮箱复制、邮件链接与开源项目入口。
- 开源项目区对比逐个查询与虚拟线程并行查询，展示独立任务执行、等待与汇总返回。支持暂停和重新演示；离开可视区域、打开项目详情或切换标签页时暂停，减少动态效果时显示完整静态示意图。
- 转移粒子在桌面为 48 / 72 个，手机为 32 / 48 个；粒径和透明度降低，三组路径批量填充，只清理变化区域。转移动画逐帧绘制，重组末尾渐变衔接静态球；移动粒子带短拖尾和较亮的粒子头；空白区域中的球适当提高可见度，背景点击范围比球半径扩大 10px，链接和按钮仍优先响应；名词 hover 无阴影或滤镜。
- 手机布局、键盘焦点、跳至正文、打印样式。

所有资源使用相对路径，兼容 GitHub Pages 项目仓库的子路径，也可部署到其他静态托管平台。
