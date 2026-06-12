"use client";

import { useState } from "react";

interface Listing {
  id: string;
  title: string;
  price_eur: number | null;
  mileage_km: number | null;
  city: string | null;
  year: number | null;
  url: string;
}

interface PriceChange {
  listing_id: string;
  old_price: number;
  new_price: number;
  changed_at: string;
  listing: Listing;
}

interface Period {
  label: string;
  new: Listing[];
  removed: Listing[];
  price_changes: PriceChange[];
}

interface DiffData {
  last_sync: string | null;
  periods: {
    since_last_sync: Period;
    last_3d: Period;
    last_7d: Period;
    last_30d: Period;
  };
  summary: {
    total_active: number;
    avg_price_eur: number | null;
  };
}

function fmt(n: number | null, suffix = "") {
  if (n === null) return "—";
  return n.toLocaleString("sr-RS") + suffix;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString("sr-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ListingRow({ l, badge }: { l: Listing; badge?: React.ReactNode }) {
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-4 px-3 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors group"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {badge}
          <span className="text-sm font-medium group-hover:text-blue-400 transition-colors truncate">
            {l.title}
          </span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {l.year && <span>{l.year} · </span>}
          {l.mileage_km && <span>{fmt(l.mileage_km, " km")} · </span>}
          {l.city && <span>{l.city}</span>}
        </div>
      </div>
      <span className="text-sm font-semibold text-emerald-400 whitespace-nowrap shrink-0">
        {fmt(l.price_eur, " €")}
      </span>
    </a>
  );
}

function PriceChangeRow({ c }: { c: PriceChange }) {
  const diff = c.new_price - c.old_price;
  const pct = Math.round((diff / c.old_price) * 100);
  const isDown = diff < 0;
  return (
    <a
      href={c.listing?.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start justify-between gap-4 px-3 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors group"
    >
      <div className="min-w-0">
        <span className="text-sm font-medium group-hover:text-blue-400 transition-colors truncate block">
          {c.listing?.title || c.listing_id}
        </span>
        <div className="text-xs text-gray-500 mt-0.5">
          {c.listing?.year && <span>{c.listing.year} · </span>}
          {c.listing?.city && <span>{c.listing.city}</span>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-gray-500 line-through">{fmt(c.old_price, " €")}</div>
        <div className="text-sm font-semibold text-emerald-400">{fmt(c.new_price, " €")}</div>
        <div className={`text-xs font-medium ${isDown ? "text-green-400" : "text-red-400"}`}>
          {isDown ? "▼" : "▲"} {Math.abs(pct)}%
        </div>
      </div>
    </a>
  );
}

const PERIOD_KEYS = ["since_last_sync", "last_3d", "last_7d", "last_30d"] as const;

function PeriodSection({ period }: { period: Period }) {
  const total =
    period.new.length + period.removed.length + period.price_changes.length;

  if (total === 0) {
    return <p className="text-sm text-gray-600 py-2">Nema promena u ovom periodu.</p>;
  }

  return (
    <div className="space-y-4">
      {period.new.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
            <span className="text-green-400">🆕</span> Novi oglasi ({period.new.length})
          </h4>
          <div className="space-y-1.5">
            {period.new.map((l) => (
              <ListingRow key={l.id} l={l} />
            ))}
          </div>
        </div>
      )}
      {period.price_changes.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
            <span>💰</span> Promena cene ({period.price_changes.length})
          </h4>
          <div className="space-y-1.5">
            {period.price_changes.map((c) => (
              <PriceChangeRow key={c.listing_id + c.changed_at} c={c} />
            ))}
          </div>
        </div>
      )}
      {period.removed.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-gray-400 mb-2 flex items-center gap-1.5">
            <span className="text-red-400">❌</span> Sklonjen oglas ({period.removed.length})
          </h4>
          <div className="space-y-1.5">
            {period.removed.map((l) => (
              <ListingRow key={l.id} l={l} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DiffPanel({ data }: { data: DiffData }) {
  const [active, setActive] = useState<(typeof PERIOD_KEYS)[number]>("since_last_sync");

  const tabs = PERIOD_KEYS.map((k) => ({
    key: k,
    label: data.periods[k].label,
    count:
      data.periods[k].new.length +
      data.periods[k].removed.length +
      data.periods[k].price_changes.length,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Aktivnih oglasa:{" "}
          <span className="text-white font-medium">{data.summary.total_active}</span>
        </span>
        {data.summary.avg_price_eur && (
          <span>
            Prosečna cena:{" "}
            <span className="text-emerald-400 font-medium">
              {fmt(data.summary.avg_price_eur, " €")}
            </span>
          </span>
        )}
        {data.last_sync && (
          <span>Poslednji sync: {fmtDate(data.last_sync)}</span>
        )}
      </div>

      <div className="flex gap-1 bg-gray-900 p-1 rounded-lg">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex-1 text-xs py-1.5 px-2 rounded-md transition-colors font-medium flex items-center justify-center gap-1.5 ${
              active === t.key
                ? "bg-gray-700 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="bg-blue-600 text-white rounded-full text-[10px] px-1.5 py-px leading-none">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <PeriodSection period={data.periods[active]} />
    </div>
  );
}
