// src/lib/api.ts
import { supabase } from "./supabaseClient";

// Fetch dropdown data from any table
export async function fetchDropdownData(table: string) {
  const { data, error } = await supabase.from(table).select("*").order("id", { ascending: true });
  if (error) throw error;
  return data;
}

// Save a new costing entry
export async function saveCostingEntry(entry: {
  customer_id: number;
  supplier_id: number;
  part_id: number;
  job_id: number;
  rep_code: string;
  unit_price: number;
}) {
  const { data, error } = await supabase.from("costing_entries").insert(entry).select();
  if (error) throw error;
  return data;
}

// Fetch all costing entries with JOINs to display readable names
export async function fetchCostingEntries() {
  const { data, error } = await supabase
    .from("costing_entries_view")
    .select("*")
    .order("id", { ascending: false });

  if (error) throw error;
  return data;
}

// Delete a costing entry by ID
export async function deleteCostingEntry(id: number) {
  const { error } = await supabase.from("costing_entries").delete().eq("id", id);
  if (error) throw error;
}
