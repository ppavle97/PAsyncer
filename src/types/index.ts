export interface Filter {
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

export interface Listing {
  id: string;
  filter_id: string;
  title: string;
  price_eur: number | null;
  mileage_km: number | null;
  city: string | null;
  year: number | null;
  url: string;
  first_seen_at: string;
  last_seen_at: string;
  is_active: boolean;
}

export interface PriceHistory {
  id: number;
  listing_id: string;
  price_eur: number;
  recorded_at: string;
}

export interface SyncResult {
  filter_id: string;
  new_listings: Listing[];
  price_changes: { listing: Listing; old_price: number; new_price: number }[];
  removed_listings: Listing[];
  total_scraped: number;
  synced_at: string;
}
