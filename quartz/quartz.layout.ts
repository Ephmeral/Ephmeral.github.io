import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"
import ArticleIndex from "./quartz/components/ArticleIndex"
import SiteNav from "./quartz/components/SiteNav"

// 全站共用。Head 使用 quartz/custom/components/Head.tsx 覆盖后的版本。
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [SiteNav()],
  // 只在首页和归档页画出列表。标签页的 slug 对不上，组件返回空。
  afterBody: [
    Component.ConditionalRender({
      component: ArticleIndex({ mode: "flat" }),
      condition: (page) => page.fileData.slug === "index",
    }),
    Component.ConditionalRender({
      component: ArticleIndex({ mode: "archive" }),
      condition: (page) => page.fileData.slug === "archive",
    }),
  ],
  footer: Component.Footer({
    links: {
      GitHub: "https://github.com/Ephmeral/Ephmeral.github.io",
    },
  }),
}

const isListing = (slug: string | undefined) => slug === "index" || slug === "archive"

// 单篇文章。首页和归档在正文后面列出全部文章。
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.ConditionalRender({
      component: Component.Breadcrumbs(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ArticleTitle(),
      condition: (page) => page.fileData.slug !== "index",
    }),
    Component.ConditionalRender({
      component: Component.ContentMeta(),
      condition: (page) => !isListing(page.fileData.slug),
    }),
    Component.ConditionalRender({
      component: Component.TagList(),
      condition: (page) => !isListing(page.fileData.slug),
    }),
  ],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
        { Component: Component.ReaderMode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [
    Component.Graph(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// 文件夹页和标签页。标签索引用 Quartz 自带的 TagPage。
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.Breadcrumbs(), Component.ArticleTitle(), Component.ContentMeta()],
  left: [
    Component.PageTitle(),
    Component.MobileOnly(Component.Spacer()),
    Component.Flex({
      components: [
        {
          Component: Component.Search(),
          grow: true,
        },
        { Component: Component.Darkmode() },
      ],
    }),
    Component.Explorer(),
  ],
  right: [],
}
