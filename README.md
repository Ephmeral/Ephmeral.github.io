# Ephmeral 的笔记

[ephmeral.github.io](https://ephmeral.github.io/) 的源码。站点用 [Quartz](https://github.com/jackyzha0/quartz) v4.5.2 生成，由 GitHub Actions 发布到 GitHub Pages。

## 目录

```
content/                  文章，按主题分文件夹
quartz/
  quartz.config.ts        站点配置
  quartz.layout.ts        页面布局
  custom/                 自定义组件和静态文件
  legacy-urls.txt         旧地址清单，CI 会检查它们都能打开
  build.sh                本地构建脚本
.github/workflows/build.yml
```

Quartz 框架不在这个仓库里。构建时，脚本把 `content/` 和 `quartz/` 覆盖到 Quartz v4.5.2 上再生成站点。

## 写一篇文章

在 `content/` 下对应主题的文件夹里新建 Markdown 文件，开头写 frontmatter：

```yaml
---
title: 文章标题
description: 一两句话的摘要，用于搜索结果和分享卡片
date: 2025-03-01
updated: 2026-11-20
tags: [go, 分布式]
draft: true
---
```

- `date` 是发布日期，首页和归档按它排序。
- `updated` 只在内容修订过时填写。
- `draft: true` 的文章不会被发布，写完后删掉这一行。
- 文章之间用 `[[双链]]` 互相引用，图表用 Mermaid 代码块。

## 本地预览

需要 Node.js 22 或更新版本。

```bash
bash quartz/build.sh
```

脚本会把 Quartz 克隆到 `/tmp/quartz-v4.5.2-build`，构建结果在该目录的 `public/` 下。

## 发布

- 拉取请求只构建和检查，不发布。
- 合并到 `master` 后，工作流会自动构建并部署到 GitHub Pages，通常几分钟内上线。
