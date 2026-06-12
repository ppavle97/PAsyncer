import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter_id = searchParams.get("filter_id");
  if (!filter_id) return NextResponse.json({ error: "filter_id required" }, { status: 400 });

  const [{ data: listings }, { data: history }, { data: lastSync }] = await Promise.all([
    supabase.from("listings").select("*").eq("filter_id", filter_id).order("first_seen_at", { ascending: false }),
    supabase.from("price_history").select("*").order("recorded_at", { ascending: true }),
    supabase.from("syncs").select("synced_at").eq("filter_id", filter_id).order("synced_at", { ascending: false }).limit(2),
  ]);

  const prevSyncAt = lastSync && lastSync.length >= 2 ? lastSync[1].synced_at : null;

  const listingIds = new Set((listings || []).map((l) => l.id));
  const filteredHistory = (history || []).filter((h) => listingIds.has(h.listing_id));

  const historyByListing: Record<string, typeof filteredHistory> = {};
  for (const h of filteredHistory) {
    if (!historyByListing[h.listing_id]) historyByListing[h.listing_id] = [];
    historyByListing[h.listing_id].push(h);
  }

  const result = (listings || []).map((listing) => {
    const lh = historyByListing[listing.id] || [];
    const isNew = prevSyncAt ? listing.first_seen_at > prevSyncAt : true;

    let priceChange: { old: number; new: number } | null = null;
    if (prevSyncAt && lh.length >= 2) {
      const before = lh.filter((h) => h.recorded_at <= prevSyncAt);
      const after = lh.filter((h) => h.recorded_at > prevSyncAt);
      if (before.length && after.length) {
        const oldPrice = before[before.length - 1].price_eur;
        const newPrice = after[after.length - 1].price_eur;
        if (oldPrice !== newPrice) priceChange = { old: oldPrice, new: newPrice };
      }
    }

    return {
      ...listing,
      is_new: isNew,
      price_change: priceChange,
      price_history: lh,
    };
  });

  return NextResponse.json({ listings: result, last_sync: lastSync?.[0]?.synced_at ?? null });
}
