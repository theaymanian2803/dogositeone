import { Link, createFileRoute, notFound } from "@tanstack/react-router";

import { PageBlocks } from "@/components/site/page-blocks";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ThemeStyle } from "@/components/site/theme-style";
import { Button } from "@/components/ui/button";
import { customerSessionFn, getPageFn, getStoreSettingsFn } from "@/lib/api";
import { LocaleProvider } from "@/lib/locale";

export const Route = createFileRoute("/pages/$pageKey")({
  loader: async ({ params }) => {
    const [page, settings, session] = await Promise.all([
      getPageFn({ data: { pageKey: params.pageKey } }),
      getStoreSettingsFn(),
      customerSessionFn(),
    ]);
    if (!page) throw notFound();
    return { page, settings, user: session.user };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.page.title ?? "Page"} — PetPals` }],
  }),
  notFoundComponent: PageNotFound,
  component: ContentPage,
});

function ContentPage() {
  const { page, settings, user } = Route.useLoaderData();
  const wide = page.layout === "two_column";

  return (
    <LocaleProvider language={settings.store_locale.language}>
      <main className="min-h-screen bg-background text-foreground">
        <ThemeStyle theme={settings.store_theme} />
        <SiteHeader settings={settings} user={user} />
        <article
          className={`mx-auto px-5 py-14 sm:px-8 sm:py-20 ${wide ? "max-w-[1200px]" : "max-w-[820px]"}`}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">
            {page.eyebrow || "Information"}
          </p>
          <h1 className="font-display mt-2 text-[48px] font-extrabold leading-[0.9] sm:text-[68px]">
            {page.title}
          </h1>
          {page.heroImage && (
            <img
              src={page.heroImage}
              alt=""
              fetchPriority="high"
              className="mt-7 w-full border border-border bg-secondary object-cover"
            />
          )}
          <div className="mt-8">
            <PageBlocks blocks={page.blocks} layout={page.layout} />
          </div>
          <div className="mt-8 border-t border-border pt-5">
            <Button
              asChild
              variant="outline"
              className="rounded-none text-[10px] uppercase tracking-[0.08em]"
            >
              <Link to="/" hash="shop">
                Back to the store
              </Link>
            </Button>
          </div>
        </article>
        <SiteFooter settings={settings} />
      </main>
    </LocaleProvider>
  );
}

function PageNotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-hot-pink">404</p>
      <h1 className="font-display mt-3 text-[48px] font-extrabold leading-[0.9]">
        THIS PAGE
        <br />
        <span className="text-hot-pink">ISN&apos;T HERE.</span>
      </h1>
      <Button
        asChild
        className="mt-7 rounded-none bg-foreground px-6 text-xs font-bold uppercase tracking-[0.1em] text-background hover:bg-hot-pink hover:text-foreground"
      >
        <Link to="/">Back to the store</Link>
      </Button>
    </main>
  );
}
