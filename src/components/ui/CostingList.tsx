// src/components/ui/CostingList.tsx

import React, { useEffect, useState } from "react";
import { fetchCostingEntries, deleteCostingEntry } from "@/lib/api";

type CostingEntry = {
  id: number;
  customer_name: string;
  supplier_name: string;
  part_name: string;
  job_description: string;
  rep_code: string;
  unit_price: number;
  quantity: number;
  total_cost: number;
  date: string;
};

const CostingList = () => {
  const [entries, setEntries] = useState<CostingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = async () => {
    setLoading(true);
    const data = await fetchCostingEntries();
    setEntries(data);
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) return;
    await deleteCostingEntry(id);
    await loadEntries();
  };

  useEffect(() => {
    loadEntries();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Costing Entries</h2>
      {loading ? (
        <p>Loading...</p>
      ) : entries.length === 0 ? (
        <p>No entries found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-200">
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Customer</th>
                <th className="border px-2 py-1">Supplier</th>
                <th className="border px-2 py-1">Part</th>
                <th className="border px-2 py-1">Job</th>
                <th className="border px-2 py-1">Rep</th>
                <th className="border px-2 py-1">Unit Price</th>
                <th className="border px-2 py-1">Qty</th>
                <th className="border px-2 py-1">Total</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="border px-2 py-1">{entry.date}</td>
                  <td className="border px-2 py-1">{entry.customer_name}</td>
                  <td className="border px-2 py-1">{entry.supplier_name}</td>
                  <td className="border px-2 py-1">{entry.part_name}</td>
                  <td className="border px-2 py-1">{entry.job_description}</td>
                  <td className="border px-2 py-1">{entry.rep_code}</td>
                  <td className="border px-2 py-1">R{entry.unit_price.toFixed(2)}</td>
                  <td className="border px-2 py-1">{entry.quantity}</td>
                  <td className="border px-2 py-1">R{entry.total_cost.toFixed(2)}</td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => handleDelete(entry.id)}
                    >
                      Delete
                    </button>
                    {/* Optional Edit button can go here */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CostingList;
