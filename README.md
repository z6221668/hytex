# HYTEX · 开发档案

这是 `feat/threejs-rewrite` 分支的整站重写版本。首页、技术、项目、职业经历、开源项目和联系方式使用同一套 Three.js 空间场景，随滚动切换。暖白与墨绿的排版配合立体封面、粒子关系图、项目档案、时间轴、查询流程和信封。正文使用可选择的 HTML 文字，支持键盘、手机和无 WebGL 时的阅读。

当前线上版本仍由 `main` 分支发布。此分支需要完成审阅并合并后才会替换线上页面。

## 本地查看

ES 模块需要通过 HTTP 加载。在本目录运行：

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

打开 http://localhost:4173 。无需自建线上服务器，不需要 npm 安装或构建即可运行。

## 页面交互

- 滚动或点击章节导航切换场景，过渡使用约 0.7 秒的正弦缓入缓出和画面交叉淡化。连续切换时从当前画面继续过渡；技术标签同步淡化。鼠标移动带来轻微视差。
- 技术图中的 AI / Spring 节点更大。点击图中的节点或正式技术列表，粒子用 1.2 秒迁移并聚合，再逐字展示实际技术实践。文字完成后停留 10 秒，粒子沿路径返回。
- 再次点击展示中的技术节点，粒子从右侧吸入，再从一处空位重组。没有可见出口；技术仍保留在关系图中。
- 项目列表、悬停和翻页按钮与三维档案同步。点击档案或列表打开独立详情弹窗，支持 Esc、关闭按钮和遮罩关闭，退出后恢复焦点。
- 工作经历与三维时间轴同步；点击年份定位到对应经历。公司名称保留，教育经历只展示专业、学历和日期。
- `parallel_query` 用三维流程演示独立查询同时执行，再汇总返回。支持重新演示，示意时长不代表性能测试。
- 联系方式只提供邮箱，支持复制和邮件链接。公开昵称为 HYTEX，无电话、照片、真实姓名或 PDF 下载。
- 动画可暂停；后台标签页和项目弹窗打开时暂停渲染，跟随系统减少动态效果偏好。WebGL 无法使用或上下文丢失时仍能阅读和打开项目详情。

## 资源与修改

- `index.html`：整站章节、个人介绍、技术分类、教育和邮箱。
- `resume-data.js`：11 项技术实践、7 个项目和 4 段工作经历。项目中的“至今”沿用原简历，请根据实际情况更新。
- `spatial-app.js`：内容渲染、导航、分类、打字、项目弹窗、邮箱复制与场景事件。
- `spatial-scene.js`：六个 Three.js 场景、GPU 粒子迁移、档案翻页、运行流程、视差与渲染生命周期。
- `spatial.css`：全新排版、手机布局、键盘焦点、减少动态效果和打印样式。
- `assets/vendor/three.module.js`：Three.js **0.186.1**，从官方 npm 发布包提取并用 esbuild 打包、压缩必要导出。约 563 KB，随本站托管，不依赖外部 CDN。
- `assets/vendor/three-LICENSE.txt`：Three.js MIT 许可证。
- `assets/archivo.ttf` / `assets/archivo-license.txt`：本地 Archivo 字体与 SIL Open Font License。

Three.js 的场景与点云实现参考官方 [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)、[Points](https://threejs.org/docs/pages/Points.html) 和 [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html) 文档。渲染采用单个 WebGL 画布，限制像素倍率，仅显示当前章节及过渡章节，页面退出时释放 GPU 资源。

预览截图、原始简历、PDF、node_modules 和构建工具不进入发布目录。

## GitHub Pages

仓库：[z6221668/hytex](https://github.com/z6221668/hytex)。所有引用都使用相对路径，兼容项目站点子路径。

在仓库 **Settings → Pages** 选择 **Deploy from a branch → main → / (root)**。合并并推送到 `main` 后，等待 Pages 发布任务成功。默认地址为 `https://z6221668.github.io/hytex/`，实际地址与发布状态以 Pages 设置页为准。新分支不会自动替换 `main` 的线上页面。
