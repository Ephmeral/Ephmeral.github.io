import { i18n } from "../i18n"
import { FullSlug, getFileExtension, joinSegments, pathToRoot, simplifySlug } from "../util/path"
import { CSSResourceToStyleElement, JSResourceToScriptElement } from "../util/resources"
import { googleFontHref, googleFontSubsetHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { unescapeHTML } from "../util/escape"
import { CustomOgImagesEmitterName } from "../plugins/emitters/ogImage"

// v4.5.2 自带的 Head 没有 canonical、article 时间和 BlogPosting JSON-LD。
// 构建时这个文件会覆盖 quartz/components/Head.tsx。

function canonicalHref(baseUrl: string, slug: string | undefined): string {
  const origin = `https://${baseUrl}`
  if (!slug || slug === "404" || slug === "index") {
    return `${origin}/`
  }
  const simple = simplifySlug(slug as FullSlug)
  if (simple === "/") {
    return `${origin}/`
  }
  const path = simple.endsWith("/") ? simple : `${simple}/`
  return `${origin}/${path.replace(/^\//, "")}`
}

function dateText(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString()
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value
  }
  return undefined
}

function jsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

export default (() => {
  const Head: QuartzComponent = ({ cfg, fileData, externalResources, ctx }: QuartzComponentProps) => {
    const titleSuffix = cfg.pageTitleSuffix ?? ""
    const rawTitle = fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title
    const title = rawTitle + titleSuffix
    const description =
      fileData.frontmatter?.socialDescription ??
      fileData.frontmatter?.description ??
      unescapeHTML(fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description)

    const { css, js, additionalHead } = externalResources

    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    const iconPath = joinSegments(baseDir, "static/icon.png")

    const usesCustomOgImage = ctx.cfg.plugins.emitters.some(
      (e) => e.name === CustomOgImagesEmitterName,
    )
    const ogImageDefaultPath = `https://${cfg.baseUrl}/static/og-image.png`
    const canonical = cfg.baseUrl ? canonicalHref(cfg.baseUrl, fileData.slug) : undefined

    // 真正的 Markdown 才是文章。文件夹页和标签页没有 filePath。
    const isArticle = Boolean(fileData.filePath) && fileData.slug !== "index" && fileData.slug !== "404"
    const isHome = fileData.slug === "index"
    const published = dateText(
      fileData.frontmatter?.published ?? fileData.frontmatter?.created ?? fileData.dates?.published,
    )
    const modified = dateText(fileData.frontmatter?.modified ?? fileData.dates?.modified) ?? published
    const keywords = (fileData.frontmatter?.tags ?? []).join(", ")

    const structuredData = isArticle
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: rawTitle,
          description,
          ...(published ? { datePublished: published } : {}),
          ...(modified ? { dateModified: modified } : {}),
          author: { "@type": "Person", name: "Silas" },
          ...(keywords ? { keywords } : {}),
          ...(canonical ? { url: canonical, mainEntityOfPage: canonical } : {}),
          inLanguage: "zh-CN",
        }
      : isHome
        ? {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: cfg.pageTitle,
            description,
            ...(canonical ? { url: canonical } : {}),
            inLanguage: "zh-CN",
            author: { "@type": "Person", name: "Silas" },
          }
        : undefined

    return (
      <head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
            {cfg.theme.typography.title && (
              <link rel="stylesheet" href={googleFontSubsetHref(cfg.theme, cfg.pageTitle)} />
            )}
          </>
        )}
        <link rel="preconnect" href="https://cdnjs.cloudflare.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {canonical && <link rel="canonical" href={canonical} />}

        <meta name="og:site_name" content={cfg.pageTitle}></meta>
        <meta property="og:title" content={title} />
        <meta property="og:type" content={isArticle ? "article" : "website"} />
        {isArticle && published && <meta property="article:published_time" content={published} />}
        {isArticle && modified && <meta property="article:modified_time" content={modified} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta property="og:description" content={description} />
        <meta property="og:image:alt" content={description} />

        {!usesCustomOgImage && (
          <>
            <meta property="og:image" content={ogImageDefaultPath} />
            <meta property="og:image:url" content={ogImageDefaultPath} />
            <meta name="twitter:image" content={ogImageDefaultPath} />
            <meta
              property="og:image:type"
              content={`image/${getFileExtension(ogImageDefaultPath) ?? "png"}`}
            />
          </>
        )}

        {cfg.baseUrl && canonical && (
          <>
            <meta property="twitter:domain" content={cfg.baseUrl}></meta>
            <meta property="og:url" content={canonical}></meta>
            <meta property="twitter:url" content={canonical}></meta>
          </>
        )}

        <link rel="icon" href={iconPath} />
        <meta name="description" content={description} />
        <meta name="generator" content="Quartz" />
        {structuredData && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />
        )}

        {css.map((resource) => CSSResourceToStyleElement(resource, true))}
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}
        {additionalHead.map((resource) => {
          if (typeof resource === "function") {
            return resource(fileData)
          } else {
            return resource
          }
        })}
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
