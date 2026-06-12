import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter_id = searchParams.get("filter_id");
  if (!filter_id) return NextResponse.json({ error: "filter_id required" }, { status: 400 });

  // last sync timestamp
  const { data: lastSync } = await supabase
    .from("syncs")
    .select("synced_at")
    .eq("filter_id", filter_id)
    .order("synced_at", { ascending: false })
    .limit(2);

  const previousSyncAt =
    lastSync && lastSync.length >= 2 ? lastSync[1].synced_at : null;
  const lastSyncAt = lastSync && lastSync.length >= 1 ? lastSync[0].synced_at : null;

  const since3d = daysAgo(3);
  const since7d = daysAgo(7);
  const since30d = daysAgo(30);

  // all listings for this filter
  const { data: allListings } = await supabase
    .from("listings")
    .select("*")
    .eq("filter_id", filter_id);

  // all price history
  const listingIds = (allListings || []).map((l) => l.id);
  const { data: allHistory } = listingIds.length
    ? await supabase
        .from("price_history")
        .select("*")
        .in("listing_id", listingIds)
        .order("recorded_at", { ascending: true })
    : { data: [] };

  const listings = allListings || [];
  const history = allHistory || [];

  function getNewSince(since: string | null) {
    if (!since) return listings.filter((l) => l.is_active);
    return listings.filter((l) => l.first_seen_at > since && l.is_active);
  }

  function getRemovedSince(since: string | null) {
    if (!since) return [];
    return listings.filter((l) => !l.is_active && l.last_seen_at > since);
  }

  function getPriceChangesSince(since: string | null) {
    if (!since) return [];
    const changes: { listing_id: string; old_price: number; new_price: number; changed_at: string }[] = [];
    const grouped: Record<string, typeof history> = {};
    for (const h of history) {
      if (!grouped[h.listing_id]) grouped[h.listing_id] = [];
      grouped[h.listing_id].push(h);
    }
    for (const [lid, entries] of Object.entries(grouped)) {
      const relevant = entries.filter((e) => e.recorded_at > since);
      if (relevant.length < 1) continue;
      const before = entries.filter((e) => e.recorded_at <= since);
      if (!before.length) continue;
      const oldPrice = before[before.length - 1].price_eur;
      const newPrice = relevant[relevant.length - 1].price_eur;
      if (oldPrice !== newPrice) {
        changes.push({
          listing_id: lid,
          old_price: oldPrice,
          new_price: newPrice,
          changed_at: relevant[relevant.length - 1].recorded_at,
        });
      }
    }
    return changes.map((c) => ({
      ...c,
      listing: listings.find((l) => l.id === c.listing_id),
    }));
  }

  const avgPrice = (list: typeof listings) => {
    const prices = list.filter((l) => l.price_eur).map((l) => l.price_eur as number);
    if (!prices.length) return null;
    return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  };

  const activeListings = listings.filter((l) => l.is_active);

  return NextResponse.json({
    last_sync: lastSyncAt,
    previous_sync: previousSyncAt,
    periods: {
      since_last_sync: {
        label: "Od poslednjeg synca",
        new: getNewSince(previousSyncAt),
        removed: getRemovedSince(previousSyncAt),
        price_changes: getPriceChangesSince(previousSyncAt),
      },
      last_3d: {
        label: "Poslednjih 3 dana",
        new: getNewSince(since3d),
        removed: getRemovedSince(since3d),
        price_changes: getPriceChangesSince(since3d),
      },
      last_7d: {
        label: "Poslednjih 7 dana",
        new: getNewSince(since7d),
        removed: getRemovedSince(since7d),
        price_changes: getPriceChangesSince(since7d),
      },
      last_30d: {
        label: "Poslednjih 30 dana",
        new: getNewSince(since30d),
        removed: getRemovedSince(since30d),
        price_changes: getPriceChangesSince(since30d),
      },
    },
    summary: {
      total_active: activeListings.length,
      avg_price_eur: avgPrice(activeListings),
    },
  });
}
