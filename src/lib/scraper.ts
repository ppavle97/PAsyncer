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

function buildTargetUrl(filter: Filter, page: number): string {
  const parts: string[] = [];
  parts.push(`brand=${encodeURIComponent(filter.brand)}`);
  if (filter.model) parts.push(`model[]=${encodeURIComponent(filter.model)}`);
  if (filter.year_from) parts.push(`year_from=${filter.year_from}`);
  if (filter.year_to) parts.push(`year_to=${filter.year_to}`);
  if (filter.price_from) parts.push(`price_from=${filter.price_from}`);
  if (filter.price_to) parts.push(`price_to=${filter.price_to}`);
  parts.push("showOldNew=all");
  parts.push("without_price=1");
  parts.push("submit_1=");
  if (page > 1) parts.push(`page=${page}`);
  return `https://www.polovniautomobili.com/auto-oglasi/pretraga?${parts.join("&")}`;
}

function scraperApiUrl(targetUrl: string): string {
  const key = process.env.SCRAPER_API_KEY;
  return `http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(targetUrl)}`;
}

function parsePrice(text: string): number | null {
  const cleaned = text.replace(/[^\d]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) || num === 0 ? null : num;
}

function parseYear(text: string): number | null {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : null;
}

function parseMileage(text: string): number | null {
  const match = text.match(/(\d[\d\s.]*)\s*km/i);
  if (!match) return null;
  const num = parseInt(match[1].replace(/[\s.]/g, ""), 10);
  return isNaN(num) ? null : num;
}

function extractId(href: string): string {
  const match = href.match(/\/(\d+)(?:\/|$|\?)/);
  return match ? match[1] : href;
}

async function scrapePage(
  filter: Filter,
  page: number
): Promise<{ listings: ScrapedListing[]; hasMore: boolean }> {
  const targetUrl = buildTargetUrl(filter, page);
  const fetchUrl = scraperApiUrl(targetUrl);

  const res = await fetch(fetchUrl);
  if (!res.ok) return { listings: [], hasMore: false };

  const html = await res.text();
  const $ = cheerio.load(html);
  const listings: ScrapedListing[] = [];

  // each ad has class like "classified ad-XXXXXXXX ..."
  $('[class*="classified ad-"]').each((_, el) => {
    const $el = $(el);

    const linkEl = $el.find("a.ga-title").first();
    const href = linkEl.attr("href") || "";
    const title = linkEl.text().trim();
    if (!title || !href) return;

    const fullUrl = href.startsWith("http")
      ? href
      : `https://www.polovniautomobili.com${href}`;
    const id = extractId(href);

    const priceText = $el.find(".price").first().text();
    const price = parsePrice(priceText);

    const setInfo = $el.find(".setInfo").text();
    const mileage = parseMileage(setInfo);
    const year = parseYear($el.find(".first-row-info").text() || setInfo || title);

    const city = $el.find(".city").first().text().trim() || null;

    listings.push({ id, title, price_eur: price, mileage_km: mileage, city, year, url: fullUrl });
  });

  const hasMore = $(".js-pagination-next").length > 0 && listings.length > 0;

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
    await new Promise((r) => setTimeout(r, 500));
  }

  return all;
}
