import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, resolveRelative } from "../util/path"
import { QuartzPluginData } from "../plugins/vfile"
import { Date, getDate } from "./Date"
import { GlobalConfiguration } from "../cfg"

// 首页和归档共用的文章列表。RecentNotes 不显示摘要，所以单独写这一份。

type Mode = "flat" | "archive"

const RESERVED = new Set(["index", "about", "archive"])

function isArticle(page: QuartzPluginData): boolean {
  const slug = page.slug ?? ""
  if (RESERVED.has(slug) || slug.startsWith("tags/") || slug.endsWith("/index")) {
    return false
  }
  return Boolean(page.dates)
}

function byNewest(cfg: GlobalConfiguration) {
  return (a: QuartzPluginData, b: QuartzPluginData) => {
    const da = getDate(cfg, a)?.getTime() ?? 0
    const db = getDate(cfg, b)?.getTime() ?? 0
    if (db !== da) return db - da
    return (a.frontmatter?.title ?? "").localeCompare(b.frontmatter?.title ?? "", "zh-CN")
  }
}

function shanghaiYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  return { year, month }
}

const ArticleCard = ({
  page,
  current,
  cfg,
}: {
  page: QuartzPluginData
  current: FullSlug
  cfg: GlobalConfiguration
}) => {
  const title = page.frontmatter?.title ?? "无题"
  const tags = page.frontmatter?.tags ?? []
  const description = page.description ?? page.frontmatter?.description
  const date = getDate(cfg, page)
  return (
    <li class="blog-item">
      <h3>
        <a href={resolveRelative(current, page.slug!)} class="internal">
          {title}
        </a>
      </h3>
      <p class="meta">
        {date && <Date date={date} locale={cfg.locale} />}
        {tags.length > 0 && (
          <span class="tags">
            {tags.map((tag) => (
              <a class="internal tag-link" href={resolveRelative(current, `tags/${tag}` as FullSlug)}>
                {tag}
              </a>
            ))}
          </span>
        )}
      </p>
      {description && <p class="description">{description}</p>}
    </li>
  )
}

export default ((opts: { mode: Mode }) => {
  const ArticleIndex: QuartzComponent = ({ allFiles, fileData, cfg }: QuartzComponentProps) => {
    const pages = allFiles.filter(isArticle).sort(byNewest(cfg))
    const current = fileData.slug!

    if (opts.mode === "flat") {
      return (
        <section class="blog-index">
          <h2>全部文章</h2>
          <ul>
            {pages.map((page) => (
              <ArticleCard page={page} current={current} cfg={cfg} />
            ))}
          </ul>
        </section>
      )
    }

    const groups = new Map<number, Map<number, QuartzPluginData[]>>()
    for (const page of pages) {
      const date = getDate(cfg, page)
      if (!date) continue
      const { year, month } = shanghaiYearMonth(date)
      if (!groups.has(year)) groups.set(year, new Map())
      const months = groups.get(year)!
      if (!months.has(month)) months.set(month, [])
      months.get(month)!.push(page)
    }

    const years = [...groups.entries()].sort((a, b) => b[0] - a[0])
    return (
      <section class="blog-index blog-archive">
        {years.map(([year, months]) => (
          <section>
            <h2>{year}</h2>
            {[...months.entries()]
              .sort((a, b) => b[0] - a[0])
              .map(([month, monthPages]) => (
                <section>
                  <h3>
                    {month}月
                  </h3>
                  <ul>
                    {monthPages.map((page) => (
                      <ArticleCard page={page} current={current} cfg={cfg} />
                    ))}
                  </ul>
                </section>
              ))}
          </section>
        ))}
      </section>
    )
  }

  ArticleIndex.css = `
.blog-index > h2,
.blog-archive h2 {
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.blog-archive h3 {
  margin: 1.25rem 0 0.25rem;
  font-size: 1.05rem;
}

.blog-index ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.blog-item {
  margin: 0;
  padding: 1.1rem 0;
  border-bottom: 1px solid var(--lightgray);
}

.blog-item h3 {
  margin: 0 0 0.35rem;
}

.blog-item h3 a {
  background-color: transparent;
}

.blog-item .meta {
  margin: 0;
  color: var(--darkgray);
  font-size: 0.9rem;
}

.blog-item .tags {
  margin-left: 0.75rem;
}

.blog-item .tags a {
  margin-right: 0.55rem;
}

.blog-item .description {
  margin: 0.45rem 0 0;
}
`

  return ArticleIndex
}) satisfies QuartzComponentConstructor<{ mode: Mode }>
