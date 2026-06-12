import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { scrapeFilter } from "@/lib/scraper";
import type { Filter, SyncResult } from "@/types";

export async function POST(req: NextRequest) {
  const { filter_id } = await req.json();

  const { data: filter, error: filterErr } = await supabase
    .from("filters")
    .select("*")
    .eq("id", filter_id)
    .single();

  if (filterErr || !filter) {
    return NextResponse.json({ error: "Filter not found" }, { status: 404 });
  }

  const scraped = await scrapeFilter(filter as Filter);
  const scrapedIds = new Set(scraped.map((l) => l.id));
  const syncedAt = new Date().toISOString();

  const { data: existingListings } = await supabase
    .from("listings")
    .select("*")
    .eq("filter_id", filter_id);

  const existingMap = new Map(
    (existingListings || []).map((l) => [l.id, l])
  );

  const newListings: Filter[] = [];
  const priceChanges: SyncResult["price_changes"] = [];

  for (const scraped_listing of scraped) {
    const existing = existingMap.get(scraped_listing.id);

    if (!existing) {
      // new listing
      const { data: inserted } = await supabase
        .from("listings")
        .insert({
          id: scraped_listing.id,
          filter_id,
          title: scraped_listing.title,
          price_eur: scraped_listing.price_eur,
          mileage_km: scraped_listing.mileage_km,
          city: scraped_listing.city,
          year: scraped_listing.year,
          url: scraped_listing.url,
          first_seen_at: syncedAt,
          last_seen_at: syncedAt,
          is_active: true,
        })
        .select()
        .single();

      if (inserted) {
        newListings.push(inserted);
        if (scraped_listing.price_eur) {
          await supabase.from("price_history").insert({
            listing_id: scraped_listing.id,
            price_eur: scraped_listing.price_eur,
            recorded_at: syncedAt,
          });
        }
      }
    } else {
      // existing — update last_seen, check price change
      const updates: Record<string, unknown> = {
        last_seen_at: syncedAt,
        is_active: true,
        title: scraped_listing.title,
        mileage_km: scraped_listing.mileage_km,
        city: scraped_listing.city,
        year: scraped_listing.year,
      };

      if (
        scraped_listing.price_eur !== null &&
        scraped_listing.price_eur !== existing.price_eur
      ) {
        const oldPrice = existing.price_eur;
        updates.price_eur = scraped_listing.price_eur;

        await supabase.from("price_history").insert({
          listing_id: scraped_listing.id,
          price_eur: scraped_listing.price_eur,
          recorded_at: syncedAt,
        });

        priceChanges.push({
          listing: { ...existing, ...updates },
          old_price: oldPrice,
          new_price: scraped_listing.price_eur,
        });
      }

      await supabase
        .from("listings")
        .update(updates)
        .eq("id", scraped_listing.id);
    }
  }

  // mark removed listings inactive
  const removedListings: Filter[] = [];
  for (const existing of existingListings || []) {
    if (existing.is_active && !scrapedIds.has(existing.id)) {
      await supabase
        .from("listings")
        .update({ is_active: false, last_seen_at: syncedAt })
        .eq("id", existing.id);
      removedListings.push(existing);
    }
  }

  // record sync
  await supabase.from("syncs").insert({
    filter_id,
    synced_at: syncedAt,
    total_scraped: scraped.length,
    new_count: newListings.length,
    price_change_count: priceChanges.length,
    removed_count: removedListings.length,
  });

  const result: SyncResult = {
    filter_id,
    new_listings: newListings as never,
    price_changes: priceChanges,
    removed_listings: removedListings as never,
    total_scraped: scraped.length,
    synced_at: syncedAt,
  };

  return NextResponse.json(result);
}
