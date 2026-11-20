import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { FullSlug, resolveRelative } from "../util/path"

const LINKS: { title: string; slug: FullSlug }[] = [
  { title: "首页", slug: "index" as FullSlug },
  { title: "归档", slug: "archive" as FullSlug },
  { title: "标签", slug: "tags/index" as FullSlug },
  { title: "关于", slug: "about" as FullSlug },
]

function isCurrent(current: string | undefined, slug: FullSlug): boolean {
  if (!current) return false
  if (slug === "tags/index") return current.startsWith("tags/")
  return current === slug
}

export default (() => {
  const SiteNav: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
    const current = fileData.slug
    return (
      <nav class="site-nav" aria-label="站点导航">
        {LINKS.map((link) => (
          <a
            href={resolveRelative(current!, link.slug)}
            class={isCurrent(current, link.slug) ? "internal active" : "internal"}
          >
            {link.title}
          </a>
        ))}
      </nav>
    )
  }

  SiteNav.css = `
header .site-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1.2rem;
  margin: 0;
}

header .site-nav a {
  font-weight: 700;
}

header .site-nav a.active {
  text-decoration: underline;
  text-underline-offset: 0.2rem;
}
`

  return SiteNav
}) satisfies QuartzComponentConstructor
