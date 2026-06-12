import * as cheerio from "cheerio";
import type { Filter } from "@/types";

export interface ScrapedListing {
  id: string;
  title: string;
  price_eur: number | null;
  mileage_km: number | null;
  city: string | null;
  year: number | null;
  url: string;
}

function buildUrl(filter: Filter, page: number): string {
  const base = "https://www.polovniautomobili.com/auto-oglasi/pretraga";
  const params = new URLSearchParams();
  params.set("brand", filter.brand);
  if (filter.model) params.set("model[]", filter.model);
  if (filter.year_from) params.set("year_from", String(filter.year_from));
  if (filter.year_to) params.set("year_to", String(filter.year_to));
  if (filter.price_from) params.set("price_from", String(filter.price_from));
  if (filter.price_to) params.set("price_to", String(filter.price_to));
  params.set("page", String(page));
  params.set("sort", "dateDesc");
  return `${base}?${params.toString()}`;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function parseMileage(text: string): number | null {
  const cleaned = text.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

function parseYear(text: string): number | null {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : null;
}

function extractIdFromUrl(url: string): string {
  const match = url.match(/\/(\d+)(?:\/|$)/);
  return match ? match[1] : url;
}

async function scrapePage(
  filter: Filter,
  page: number
): Promise<{ listings: ScrapedListing[]; hasMore: boolean }> {
  const url = buildUrl(filter, page);

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "sr,en-US;q=0.7,en;q=0.3",
    },
  });

  if (!res.ok) return { listings: [], hasMore: false };

  const html = await res.text();
  const $ = cheerio.load(html);
  const listings: ScrapedListing[] = [];

  $("article.classified-item, .classified-item").each((_, el) => {
    const $el = $(el);

    const linkEl = $el.find("a.classified-title, h3 a, .title a").first();
    const href = linkEl.attr("href") || "";
    const fullUrl = href.startsWith("http")
      ? href
      : `https://www.polovniautomobili.com${href}`;

    const title = linkEl.text().trim();
    if (!title || !href) return;

    const id = extractIdFromUrl(href);

    const priceText = $el.find(".price-box, .price").first().text();
    const price = parsePrice(priceText);

    const detailsText = $el.find(".details, .classified-details").text();
    const mileage = parseMileage(
      $el.find(".mileage, [class*=mileage]").text() || detailsText
    );
    const year = parseYear(
      $el.find(".year, [class*=year]").text() || title || detailsText
    );
    const city =
      $el
        .find(".city, .location, [class*=location]")
        .first()
        .text()
        .trim() || null;

    listings.push({ id, title, price_eur: price, mileage_km: mileage, city, year, url: fullUrl });
  });

  const hasMore =
    listings.length > 0 &&
    $("a[rel=next], .pagination .next, li.next:not(.disabled)").length > 0;

  return { listings, hasMore };
}

export async function scrapeFilter(
  filter: Filter,
  maxPages = 20
): Promise<ScrapedListing[]> {
  const all: ScrapedListing[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const { listings, hasMore } = await scrapePage(filter, page);

    for (const l of listings) {
      if (!seen.has(l.id)) {
        seen.add(l.id);
        all.push(l);
      }
    }

    if (!hasMore) break;

    // polite delay between pages
    await new Promise((r) => setTimeout(r, 800));
  }

  return all;
}
