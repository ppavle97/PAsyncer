"use client";

import { useState } from "react";

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddFilterModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    name: "",
    brand: "",
    model: "",
    year_from: "",
    year_to: "",
    price_from: "",
    price_to: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        brand: form.brand,
        model: form.model,
        year_from: form.year_from ? parseInt(form.year_from) : null,
        year_to: form.year_to ? parseInt(form.year_to) : null,
        price_from: form.price_from ? parseInt(form.price_from) : null,
        price_to: form.price_to ? parseInt(form.price_to) : null,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error);
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Novi filter</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Naziv filtera *</label>
            <input
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="npr. Audi A3 2020+"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Marka *</label>
            <input
              required
              value={form.brand}
              onChange={(e) => set("brand", e.target.value)}
              placeholder="audi"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="border-t border-gray-800 pt-3">
            <p className="text-xs text-gray-600 mb-2">Opciono</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Model</label>
                <input
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                  placeholder="a3"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-400 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Godina od</label>
                <input
                  type="number"
                  value={form.year_from}
                  onChange={(e) => set("year_from", e.target.value)}
                  placeholder="2018"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-400 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Godina do</label>
                <input
                  type="number"
                  value={form.year_to}
                  onChange={(e) => set("year_to", e.target.value)}
                  placeholder="2025"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-400 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Cena od (€)</label>
                <input
                  type="number"
                  value={form.price_from}
                  onChange={(e) => set("price_from", e.target.value)}
                  placeholder="5000"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-400 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Cena do (€)</label>
                <input
                  type="number"
                  value={form.price_to}
                  onChange={(e) => set("price_to", e.target.value)}
                  placeholder="15000"
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg px-3 py-2 text-sm text-gray-400 placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 text-sm transition-colors"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              {loading ? "Čekaj..." : "Sačuvaj"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
