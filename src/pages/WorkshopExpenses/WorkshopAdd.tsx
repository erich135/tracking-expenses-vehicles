import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function WorkshopAdd() {
  const [technicians, setTechnicians] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    job_number: "",
    technician_id: "",
    equipment_detail: "",
    customer_id: "",
    cash_customer_name: "",
    quote_date: "",
    po_date: "",
    quote_amount: "",
    days_quoted: "",
    days_taken: "",
    area: "",
    delivery_date: "",
    job_status: "",
    notes: "",
  });

  // Fetch dropdowns on mount
  useEffect(() => {
    fetchDropdowns();
  }, []);

  // Recalculate days_taken if quote_date or job_status changes
  useEffect(() => {
    calculateDaysBusy();
  }, [form.quote_date, form.job_status]);

  async function fetchDropdowns() {
    const { data: techs } = await supabase.from("parts").select("id, name");
    const { data: custs } = await supabase.from("customers").select("id, name");

    setTechnicians(techs || []);
    setCustomers(custs || []);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ✅ Auto-calculate days taken unless job is completed
  function calculateDaysBusy() {
    if (!form.quote_date || form.job_status === "Completed") return;

    const quoted = new Date(form.quote_date);
    const today = new Date();
    const timeDiff = today.getTime() - quoted.getTime();
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (!isNaN(days)) {
      setForm((prev) => ({ ...prev, days_taken: days.toString() }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("workshop_jobs").insert([form]);
    setLoading(false);

    if (error) {
      alert("❌ Error adding job: " + error.message);
    } else {
      alert("✅ Workshop job added!");
      setForm({
        job_number: "",
        technician_id: "",
        equipment_detail: "",
        customer_id: "",
        cash_customer_name: "",
        quote_date: "",
        po_date: "",
        quote_amount: "",
        days_quoted: "",
        days_taken: "",
        area: "",
        delivery_date: "",
        job_status: "",
        notes: "",
      });
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Add Workshop Job</h1>
      <p className="mb-6 text-gray-600">Fill in all the job details below to begin tracking costs and timelines.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Job Number</label>
          <input name="job_number" className="input w-full" onChange={handleChange} value={form.job_number} />
        </div>

        <div>
          <label className="block font-medium">Technician</label>
          <select name="technician_id" onChange={handleChange} className="input w-full" value={form.technician_id}>
            <option value="">Select Technician</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Equipment Detail</label>
          <input name="equipment_detail" className="input w-full" onChange={handleChange} value={form.equipment_detail} />
        </div>

        <div>
          <label className="block font-medium">Customer</label>
          <select name="customer_id" onChange={handleChange} className="input w-full" value={form.customer_id}>
            <option value="">Select Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Cash Customer Name</label>
          <input name="cash_customer_name" className="input w-full" onChange={handleChange} value={form.cash_customer_name} />
        </div>

        <div>
          <label className="block font-medium">Quote Date</label>
          <input type="date" name="quote_date" className="input w-full" onChange={handleChange} value={form.quote_date} />
        </div>

        <div>
          <label className="block font-medium">PO Date</label>
          <input type="date" name="po_date" className="input w-full" onChange={handleChange} value={form.po_date} />
        </div>

        <div>
          <label className="block font-medium">Quote Amount (R)</label>
          <input type="number" name="quote_amount" className="input w-full" onChange={handleChange} value={form.quote_amount} />
        </div>

        <div>
          <label className="block font-medium">Days Quoted</label>
          <input type="number" name="days_quoted" className="input w-full" onChange={handleChange} value={form.days_quoted} />
        </div>

        <div>
          <label className="block font-medium">Days Busy (Taken)</label>
          <input
            type="number"
            name="days_taken"
            className="input w-full"
            value={form.days_taken}
            readOnly={form.job_status !== "Completed"}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="block font-medium">Area</label>
          <input name="area" className="input w-full" onChange={handleChange} value={form.area} />
        </div>

        <div>
          <label className="block font-medium">Delivery Date</label>
          <input type="date" name="delivery_date" className="input w-full" onChange={handleChange} value={form.delivery_date} />
        </div>

        <div>
          <label className="block font-medium">Job Status</label>
          <select name="job_status" className="input w-full" onChange={handleChange} value={form.job_status}>
            <option value="">Select Status</option>
            <option>Quoted</option>
            <option>Go Ahead</option>
            <option>Completed</option>
            <option>Invoiced</option>
            <option>PDI</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Notes</label>
          <textarea name="notes" className="input w-full" rows={3} onChange={handleChange} value={form.notes} />
        </div>

        <div>
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
            {loading ? "Saving..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
}
