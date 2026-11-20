# Ephmeral 的笔记

这个仓库是 [https://ephmeral.github.io/](https://ephmeral.github.io/) 的源码，用 Quartz **v4.5.2** 生成。拉取请求只构建和校验；推送到 `master` 的工作流会部署到 GitHub Pages。

## 目录

```
content/                 文章，也是以后从 Obsidian 发布的出口
quartz/                  只放配置和少量覆盖文件，不含 Quartz 框架源码
  quartz.config.ts
  quartz.layout.ts
  custom/components/Head.tsx         canonical、发布时间、JSON-LD
  custom/components/ArticleIndex.tsx 首页和归档的文章列表
  custom/components/SiteNav.tsx      首页、归档、标签、关于
  custom/static/               robots.txt、llms.txt
  legacy-urls.txt              要保住的旧 URL
  build.sh                     本地构建
.github/workflows/build.yml
```

构建时把 `content/` 和 `quartz/` 覆盖进固定 tag `v4.5.2` 的 [jackyzha0/quartz](https://github.com/jackyzha0/quartz)。框架本身不进这个仓库。

## 本地预览

需要 Node.js 22 或更新版本。

```bash
bash quartz/build.sh
```

脚本会把 Quartz v4.5.2 克隆到 `/tmp/quartz-v4.5.2-build`，构建结果在该目录的 `public/`。也可以传入别的工作目录：`bash quartz/build.sh /tmp/my-build`。

## 文章和旧地址

新文章用英文路径，例如 `/network/cs144-lab0`。每篇正文开头的重复标题已去掉，标题、日期和标签写在 frontmatter 里。摘要是迁移时按原文补的，旧站的 description 是空的。

旧的中文地址写成 alias，形式是 `原路径/index`，这样 Quartz 会生成 `原路径/index.html`。GitHub Pages 上的 `/原路径/` 才能打开，而不是 404。旧的 `/archive/` 会跳到新的归档页。`/life/杂记/` 和 `/categories/` 仍跳到首页。`/tags/` 用 Quartz 自己的标签索引。

两篇重复的没有单独再放一份：

- `/nju-ics2021-pa2-1/` 跳到 PA2-1 小结
- `/notes/chapter15-面向对象程序设计/` 跳到第 15 章全文

7 个测试页（`hello_world`、两个归档测试、两个树洞、归档列表本身以外的占位）没有迁移。只有 HTML、没有 Markdown 的 7 篇 Hexo 旧文也没有恢复。

`content/go/` 和 `content/ai-agent/` 是空目录，留给以后的笔记。未完成的笔记可以加 `draft: true`，构建时会被丢掉。

## 图片和域名

图片继续用原来的阿里云 OSS 和其他外链，没有下载进仓库。Cache 那篇里有一张 URL 含 `@)(`，已改成百分号编码，避免 Markdown / HTML 把括号当成语法。

不恢复已经无法解析的 `blog.silasblog.top`，仓库里也没有 `CNAME`。规范地址是 `https://ephmeral.github.io/<英文路径>/`。

## 已知问题

- 《5.1 二叉树及其表示》里有 7 处 Obsidian 图片嵌入（`![[...png]]`）。图片不在仓库里，构建后会变成指向这些文件名的图片，打不开。文中唯一的双链指向同一篇的「深度与层次」，已改成页内锚点，避免被解析成旧地址。
- MIT 6.S081 lab 4 和 lab 9 引用的 `xv6.dgs.zone` 图片当时已经返回 500，正文里的地址没改。
- 侯捷笔记里的 `20221019201556.png` 在迁移前多次请求超时，是否还能打开没有确认。
- Quartz 把文章输出成 `路径.html`。GitHub Pages 能打开不带结尾斜杠的新地址；带结尾斜杠的规范地址要等 Pages 的实际行为再核对。旧地址因为用了 `原路径/index`，带斜杠可以打开。

## 上线时改一次 Pages 设置

把这个改动合并进 `master` 之后，打开仓库的 Settings → Pages → Source，把发布源从 “Deploy from a branch” 改成 **GitHub Actions**。别的仓库设置不用动。

建议先合并，再改这个设置。`deploy-pages` 只有在发布源已经是 GitHub Actions 时才会成功。如果合并触发的那一次部署因为还没改设置而失败，改完之后到 Actions 里把 `master` 上的工作流重新跑一遍。先改设置、后合并的话，中间没有可发布的构建，站点会空一段时间。

## 日期

所有日期都写在 frontmatter 里。Quartz v4.5.2 会先把 `date` 抄到 `modified`，再按 `modified`、`updated` 的顺序取值，所以更新时间和发布日期不同时，这两个字段都会写上同一个更新时间。
