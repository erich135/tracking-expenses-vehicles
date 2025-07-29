// src/components/ui/CostingForm.tsx

import React, { useState, useEffect } from "react";
import { fetchDropdownData, saveCostingEntry } from "@/lib/api";

type Customer = { id: number; name: string };
type Supplier = { id: number; name: string };
type Part = { id: number; name: string; price: number };
type Job = { id: number; description: string };
type Rep = { rep_code: string; rep_name: string | null };

const CostingForm = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);

  const [selectedCustomer, setSelectedCustomer] = useState<number | "">("");
  const [selectedSupplier, setSelectedSupplier] = useState<number | "">("");
  const [selectedPart, setSelectedPart] = useState<number | "">("");
  const [selectedJob, setSelectedJob] = useState<number | "">("");
  const [selectedRep, setSelectedRep] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        setCustomers(await fetchDropdownData("customers"));
        setSuppliers(await fetchDropdownData("suppliers"));
        setParts(await fetchDropdownData("parts"));
        setJobs(await fetchDropdownData("job_descriptions"));
        setReps(await fetchDropdownData("reps"));
      } catch (err) {
        console.error("Failed to load dropdowns:", err);
      }
    };

    loadDropdowns();
  }, []);

  const handleSave = async () => {
    if (
      !selectedCustomer ||
      !selectedSupplier ||
      !selectedPart ||
      !selectedJob ||
      !selectedRep ||
      !unitPrice ||
      !quantity
    ) {
      alert("Please complete all fields.");
      return;
    }

    const totalCost = Number(unitPrice) * Number(quantity);

    setIsSaving(true);
    try {
      await saveCostingEntry({
        customer_id: selectedCustomer,
        supplier_id: selectedSupplier,
        part_id: selectedPart,
        job_id: selectedJob,
        rep_code: selectedRep,
        unit_price: unitPrice,
        quantity,
        total_cost: totalCost,
      });

      // Reset
      setSelectedCustomer("");
      setSelectedSupplier("");
      setSelectedPart("");
      setSelectedJob("");
      setSelectedRep("");
      setUnitPrice("");
      setQuantity("");
    } catch (err) {
      console.error("Failed to save entry:", err);
      alert("Error saving entry.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Add Costing Entry</h1>
      <form className="grid grid-cols-2 gap-4">
        <div>
          <label className="block">Customer</label>
          <select
            className="w-full border p-2"
            value={selectedCustomer}
            onChange={(e) =>
              setSelectedCustomer(Number(e.target.value) || "")
            }
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block">Supplier</label>
          <select
            className="w-full border p-2"
            value={selectedSupplier}
            onChange={(e) =>
              setSelectedSupplier(Number(e.target.value) || "")
            }
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block">Part</label>
          <select
            className="w-full border p-2"
            value={selectedPart}
            onChange={(e) => {
              const id = Number(e.target.value);
              setSelectedPart(id || "");
              const selected = parts.find((p) => p.id === id);
              setUnitPrice(selected ? selected.price : "");
            }}
          >
            <option value="">Select part</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block">Job Description</label>
          <select
            className="w-full border p-2"
            value={selectedJob}
            onChange={(e) => setSelectedJob(Number(e.target.value) || "")}
          >
            <option value="">Select job</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block">Rep</label>
          <select
            className="w-full border p-2"
            value={selectedRep}
            onChange={(e) => setSelectedRep(e.target.value)}
          >
            <option value="">Select rep</option>
            {reps.map((r) => (
              <option key={r.rep_code} value={r.rep_code}>
                {r.rep_code} - {r.rep_name || "No name"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block">Quantity</label>
          <input
            type="number"
            className="w-full border p-2"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || "")}
          />
        </div>

        <div>
          <label className="block">Unit Price</label>
          <input
            type="number"
            className="w-full border p-2"
            value={unitPrice}
            readOnly
          />
        </div>

        <div className="col-span-2">
          <button
            type="button"
            className="bg-blue-600 text-white px-4 py-2 rounded"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Entry"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CostingForm;
