import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

export default function WorkshopEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [customers, setCustomers] = useState([]);

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
    status: "",
    notes: "",
  });

  useEffect(() => {
    fetchDropdowns();
    fetchJob();
  }, [id]);

  async function fetchDropdowns() {
    const { data: techs } = await supabase.from("parts").select("id, name");
    const { data: custs } = await supabase.from("customers").select("id, name");
    setTechnicians(techs || []);
    setCustomers(custs || []);
  }

  async function fetchJob() {
    const { data, error } = await supabase
      .from("workshop_jobs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert("Error loading job: " + error.message);
      return;
    }

    const today = new Date();
    const quoteDate = new Date(data.quote_date);
    const isCompleted = data.job_status?.toLowerCase() === "completed";

    const daysTaken = isCompleted
      ? data.days_taken
      : Math.floor((today.getTime() - quoteDate.getTime()) / (1000 * 60 * 60 * 24));

    setForm({
      ...data,
      days_taken: daysTaken,
    });

    setLoading(false);
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("workshop_jobs")
      .update(form)
      .eq("id", id);

    setSaving(false);

    if (error) {
      alert("❌ Error updating job: " + error.message);
    } else {
      alert("✅ Job updated successfully!");
      navigate("/workshop-expenses");
    }
  }

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Edit Workshop Job</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-medium">Job Number</label>
          <input name="job_number" className="input w-full" onChange={handleChange} value={form.job_number} />
        </div>

        <div>
          <label className="block font-medium">Technician</label>
          <select name="technician_id" className="input w-full" onChange={handleChange} value={form.technician_id}>
            <option value="">Select Technician</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium">Equipment Detail</label>
          <input name="equipment_detail" className="input w-full" onChange={handleChange} value={form.equipment_detail} />
        </div>

        <div>
          <label className="block font-medium">Customer</label>
          <select name="customer_id" className="input w-full" onChange={handleChange} value={form.customer_id}>
            <option value="">Select Customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
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
          <label className="block font-medium">Days Taken (auto)</label>
          <input type="number" name="days_taken" className="input w-full bg-gray-100" value={form.days_taken} readOnly />
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
            <option value="">Select</option>
            <option>Quoted</option>
            <option>Go Ahead</option>
            <option>Completed</option>
            <option>Invoiced</option>
            <option>PDI</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Status</label>
          <select name="status" className="input w-full" onChange={handleChange} value={form.status}>
            <option value="">Select</option>
            <option>Stripping</option>
            <option>Quoted/Awaiting Order</option>
            <option>Busy</option>
            <option>Completed</option>
          </select>
        </div>

        <div>
          <label className="block font-medium">Notes</label>
          <textarea name="notes" className="input w-full" rows={3} onChange={handleChange} value={form.notes} />
        </div>

        <div>
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded">
            {saving ? "Saving..." : "Update Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
