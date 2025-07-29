// src/components/CostingModule.tsx

import React, { useEffect, useState } from "react";
import { fetchDropdownData } from "@/lib/api";

// Types
type Customer = { id: number; name: string };
type Supplier = { id: number; name: string };
type Part = { id: number; name: string; price: number };
type Job = { id: number; description: string };
type Rep = { rep_code: string; rep_name: string | null };

const CostingModule = () => {
  // Dropdown data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);

  // Selected values
  const [selectedCustomer, setSelectedCustomer] = useState<number | "">("");
  const [selectedSupplier, setSelectedSupplier] = useState<number | "">("");
  const [selectedPart, setSelectedPart] = useState<number | "">("");
  const [selectedJob, setSelectedJob] = useState<number | "">("");
  const [selectedRep, setSelectedRep] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");

  // Derived value
  const total = typeof unitPrice === "number" && typeof quantity === "number"
    ? unitPrice * quantity
    : "";

  // Load dropdown data
  useEffect(() => {
    const loadData = async () => {
      try {
        setCustomers(await fetchDropdownData("customers"));
        setSuppliers(await fetchDropdownData("suppliers"));
        setParts(await fetchDropdownData("parts"));
        setJobs(await fetchDropdownData("job_descriptions"));
        setReps(await fetchDropdownData("reps"));
      } catch (error) {
        console.error("Error loading dropdown data:", error);
      }
    };

    loadData();
  }, []);

  // Handle part selection to autofill price
  useEffect(() => {
    const part = parts.find((p) => p.id === selectedPart);
    setUnitPrice(part ? part.price : "");
  }, [selectedPart, parts]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Add Costing Entry</h1>
      <form className="grid grid-cols-2 gap-4">

        {/* Customer */}
        <div>
          <label className="block">Customer</label>
          <select
            className="w-full border p-2"
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(Number(e.target.value) || "")}
          >
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Supplier */}
        <div>
          <label className="block">Supplier</label>
          <select
            className="w-full border p-2"
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(Number(e.target.value) || "")}
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {/* Part */}
        <div>
          <label className="block">Part</label>
          <select
            className="w-full border p-2"
            value={selectedPart}
            onChange={(e) => setSelectedPart(Number(e.target.value) || "")}
          >
            <option value="">Select part</option>
            {parts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Price (Autofilled) */}
        <div>
          <label className="block">Unit Price</label>
          <input
            type="number"
            className="w-full border p-2 bg-gray-100"
            value={unitPrice}
            readOnly
          />
        </div>

        {/* Quantity */}
        <div>
          <label className="block">Quantity</label>
          <input
            type="number"
            className="w-full border p-2"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || "")}
          />
        </div>

        {/* Total (Calculated) */}
        <div>
          <label className="block">Total</label>
          <input
            type="number"
            className="w-full border p-2 bg-gray-100"
            value={total}
            readOnly
          />
        </div>

        {/* Job Description */}
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

        {/* Rep */}
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
      </form>
    </div>
  );
};

export default CostingModule;
