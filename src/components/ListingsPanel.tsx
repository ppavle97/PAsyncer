"use client";

import { useState } from "react";

interface PriceChange { old: number; new: number }
interface PriceHistory { id: number; listing_id: string; price_eur: number; recorded_at: string }

interface Listing {
  id: string;
  title: string;
  price_eur: number | null;
  mileage_km: number | null;
  city: string | null;
  year: number | null;
  url: string;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
  is_new: boolean;
  price_change: PriceChange | null;
  price_history: PriceHistory[];
}

function fmt(n: number | null, suffix = "") {
  if (n === null) return "—";
  return n.toLocaleString("sr-RS") + suffix;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("sr-RS", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function NewBadge() {
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-950 text-green-400 border border-green-900 shrink-0">NOVO</span>;
}

function ListingRow({ l }: { l: Listing }) {
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${l.is_active ? "bg-gray-900 hover:bg-gray-800" : "bg-gray-900/40 hover:bg-gray-800/60 opacity-60"}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {l.is_new && l.is_active && <NewBadge />}
          <span className={`text-sm font-medium group-hover:text-blue-400 transition-colors truncate ${!l.is_active ? "line-through text-gray-500" : ""}`}>
            {l.title}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {[l.year, l.mileage_km ? fmt(l.mileage_km, " km") : null, l.city, fmtDate(l.first_seen_at)].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`text-sm font-semibold ${!l.is_active ? "text-gray-600 line-through" : "text-gray-200"}`}>
          {fmt(l.price_eur, " €")}
        </div>
      </div>
    </a>
  );
}

function PriceChangeRow({ l }: { l: Listing }) {
  if (!l.price_change) return null;
  const diff = l.price_change.new - l.price_change.old;
  const isDown = diff < 0;
  const pct = Math.abs(Math.round((diff / l.price_change.old) * 100));

  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors group"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${isDown ? "bg-blue-950 text-blue-300 border-blue-900" : "bg-orange-950 text-orange-400 border-orange-900"}`}>
            {isDown ? "▼" : "▲"} {pct}%
          </span>
          <span className="text-sm font-medium group-hover:text-blue-400 transition-colors truncate">{l.title}</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {[l.year, l.city].filter(Boolean).join(" · ")}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-xs text-gray-500 line-through">{fmt(l.price_change.old, " €")}</div>
        <div className={`text-sm font-semibold ${isDown ? "text-green-400" : "text-orange-400"}`}>{fmt(l.price_change.new, " €")}</div>
      </div>
    </a>
  );
}

const TABS = [
  { key: "all", label: "Svi oglasi" },
  { key: "price", label: "Promena cene" },
  { key: "sold", label: "Prodati" },
] as const;

export default function ListingsPanel({ listings }: { listings: Listing[] }) {
  const [tab, setTab] = useState<"all" | "price" | "sold">("all");
  const [sort, setSort] = useState<"date" | "price">("date");

  const active = listings.filter((l) => l.is_active);
  const priceChanged = listings.filter((l) => l.is_active && l.price_change);
  const sold = listings.filter((l) => !l.is_active);

  const counts = { all: active.length, price: priceChanged.length, sold: sold.length };

  const sorted = [...active].sort((a, b) => {
    if (sort === "price") return (a.price_eur ?? 999999) - (b.price_eur ?? 999999);
    return new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime();
  });

  if (listings.length === 0) {
    return <p className="text-sm text-gray-600 py-8 text-center">Nema oglasa. Pokreni Sync.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors font-medium flex items-center justify-center gap-1.5 ${tab === t.key ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
          >
            {t.label}
            {counts[t.key] > 0 && (
              <span className={`rounded-full text-[10px] px-1.5 py-px leading-none ${tab === t.key ? "bg-gray-500 text-white" : "bg-gray-800 text-gray-400"}`}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "all" && (
        <>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-gray-600">Sortiraj:</span>
            {(["date", "price"] as const).map((s) => (
              <button key={s} onClick={() => setSort(s)} className={`text-xs px-2 py-1 rounded transition-colors ${sort === s ? "bg-gray-700 text-white" : "text-gray-600 hover:text-gray-300"}`}>
                {s === "date" ? "Datum" : "Cena"}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {sorted.map((l) => <ListingRow key={l.id} l={l} />)}
          </div>
        </>
      )}

      {tab === "price" && (
        <div className="space-y-1.5">
          {priceChanged.length === 0
            ? <p className="text-sm text-gray-600 py-8 text-center">Nema promena cene od poslednjeg synca.</p>
            : priceChanged.map((l) => <PriceChangeRow key={l.id} l={l} />)}
        </div>
      )}

      {tab === "sold" && (
        <div className="space-y-1.5">
          {sold.length === 0
            ? <p className="text-sm text-gray-600 py-8 text-center">Nema prodatih / sklonjen oglasa.</p>
            : sold.map((l) => <ListingRow key={l.id} l={l} />)}
        </div>
      )}
    </div>
  );
}
