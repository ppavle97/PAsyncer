"use client";

import { useEffect, useState, useCallback } from "react";
import AddFilterModal from "@/components/AddFilterModal";
import ListingsPanel from "@/components/ListingsPanel";

interface Filter {
  id: string;
  name: string;
  brand: string;
  model: string;
  year_from: number | null;
  year_to: number | null;
  price_from: number | null;
  price_to: number | null;
  created_at: string;
}

export default function Home() {
  const [filters, setFilters] = useState<Filter[]>([]);
  const [selected, setSelected] = useState<Filter | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [listings, setListings] = useState<any[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);

  const loadFilters = useCallback(async () => {
    const res = await fetch("/api/filters");
    const data = await res.json();
    setFilters(data);
    if (data.length > 0 && !selected) {
      setSelected(data[0]);
    }
  }, [selected]);

  useEffect(() => {
    loadFilters();
  }, []);

  const loadListings = useCallback(async (filterId: string) => {
    setLoadingListings(true);
    setListings([]);
    const res = await fetch(`/api/listings?filter_id=${filterId}`);
    const data = await res.json();
    setListings(data.listings || []);
    setLoadingListings(false);
  }, []);

  useEffect(() => {
    if (selected) loadListings(selected.id);
  }, [selected, loadListings]);

  async function handleSync() {
    if (!selected) return;
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filter_id: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSyncMsg(`Greška: ${data.error}`);
      } else {
        setSyncMsg(
          `Sync završen — ${data.total_scraped} oglasa, ${data.new_listings.length} novih, ${data.price_changes.length} promena cene, ${data.removed_listings.length} sklonjenih`
        );
        loadListings(selected.id);
      }
    } catch {
      setSyncMsg("Greška pri syncu");
    }
    setSyncing(false);
  }

  async function handleDelete(f: Filter) {
    if (!confirm(`Obrisati filter "${f.name}"?`)) return;
    await fetch("/api/filters", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: f.id }),
    });
    const newFilters = filters.filter((x) => x.id !== f.id);
    setFilters(newFilters);
    if (selected?.id === f.id) {
      setSelected(newFilters[0] || null);
      setListings([]);
    }
  }

  function filterLabel(f: Filter) {
    const parts = [f.brand.toUpperCase(), f.model].filter(Boolean);
    if (f.year_from || f.year_to) parts.push(`${f.year_from || ""}–${f.year_to || ""}`);
    if (f.price_from || f.price_to) parts.push(`${f.price_from ? f.price_from + "€" : ""}–${f.price_to ? f.price_to + "€" : ""}`);
    return parts.join(" ");
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PAsyncer</h1>
          <p className="text-gray-500 text-sm mt-0.5">Pratilac auto oglasa · Polovni automobili</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + Dodaj filter
        </button>
      </div>

      {filters.length === 0 ? (
        <div className="text-center py-24 text-gray-600">
          <p className="text-lg mb-2">Nema filtera</p>
          <p className="text-sm">Dodaj filter da počneš da pratiš oglase.</p>
        </div>
      ) : (
        <div className="flex gap-6">
          <div className="w-56 shrink-0 space-y-1">
            {filters.map((f) => (
              <div
                key={f.id}
                onClick={() => setSelected(f)}
                className={`group flex items-start justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${selected?.id === f.id ? "bg-blue-600 text-white" : "hover:bg-gray-800 text-gray-300"}`}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{f.name}</div>
                  <div className={`text-xs truncate mt-0.5 ${selected?.id === f.id ? "text-blue-200" : "text-gray-500"}`}>
                    {filterLabel(f)}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(f); }}
                  className={`text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${selected?.id === f.id ? "text-blue-200 hover:text-white" : "text-gray-600 hover:text-red-400"}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <div className="flex-1 min-w-0">
            {selected && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">{selected.name}</h2>
                  <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                  >
                    {syncing ? (
                      <>
                        <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                        Sinkronizujem...
                      </>
                    ) : "↻ Sync"}
                  </button>
                </div>

                {syncMsg && (
                  <div className="mb-4 text-sm text-gray-300 bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
                    {syncMsg}
                  </div>
                )}

                {loadingListings
                  ? <div className="text-gray-600 text-sm py-8 text-center">Učitavam...</div>
                  : <ListingsPanel listings={listings} />}
              </>
            )}
          </div>
        </div>
      )}

      {showAdd && <AddFilterModal onClose={() => setShowAdd(false)} onAdded={loadFilters} />}
    </main>
  );
}
