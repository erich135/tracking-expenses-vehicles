import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/customSupabaseClient";
import { useToast } from "@/components/ui/use-toast";

const fmt = (v) => Number.isFinite(Number(v)) ? Number(v).toFixed(2) : "0.00";

function safeMonthKey(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

export default function SlaReportsSection() {
  const { toast } = useToast();

  // filters
  const [unitId, setUnitId] = useState(""); // keep as string for <Select>, convert to number in queries
  const [start, setStart] = useState("");   // YYYY-MM-DD
  const [end, setEnd] = useState("");       // YYYY-MM-DD

  // data
  const [units, setUnits] = useState([]);
  const [expenseItems, setExpenseItems] = useState([]); // from sla_expense_items + joined parent
  const [incomes, setIncomes] = useState([]);

  const [loading, setLoading] = useState(false);

  // units
  const fetchUnits = useCallback(async () => {
    const { data, error } = await supabase.from("sla_units").select("id, unit_number").order("unit_number");
    if (error) {
      toast({ variant: "destructive", title: "Error loading units", description: error.message });
      return;
    }
    setUnits(data || []);
  }, [toast]);

  // expenses + incomes
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const unitIdNum = unitId ? Number(unitId) : null;

      // ----- EXPENSES: pull from items, join parent SLA expense (for date + unit) -----
      // Using dot-notation to select parent fields
      let expQ = supabase
        .from("sla_expense_items")
        .select("quantity, unit_price, sla_expenses(date, sla_unit_id)");

      // Filter by joined parent fields
      if (unitIdNum) expQ = expQ.eq("sla_expenses.sla_unit_id", unitIdNum);
      if (start) expQ = expQ.gte("sla_expenses.date", start);
      if (end) expQ = expQ.lte("sla_expenses.date", end);

      // ----- INCOMES: direct from sla_incomes (assumes column 'amount' exists) -----
      let incQ = supabase
        .from("sla_incomes")
        .select("id, sla_unit_id, date, amount");

      if (unitIdNum) incQ = incQ.eq("sla_unit_id", unitIdNum);
      if (start) incQ = incQ.gte("date", start);
      if (end) incQ = incQ.lte("date", end);

      const [{ data: itemsData, error: itemsErr }, { data: incData, error: incErr }] =
        await Promise.all([expQ, incQ]);

      if (itemsErr) {
        toast({ variant: "destructive", title: "Error loading SLA expenses", description: itemsErr.message });
      } else {
        setExpenseItems(itemsData || []);
      }

      if (incErr) {
        toast({ variant: "destructive", title: "Error loading SLA incomes", description: incErr.message });
      } else {
        setIncomes(incData || []);
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }, [toast, unitId, start, end]);

  useEffect(() => { fetchUnits(); }, [fetchUnits]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // lookup for unit id -> number
  const unitLookup = useMemo(
    () => Object.fromEntries(units.map(u => [u.id, u.unit_number])),
    [units]
  );

  // Flatten expense items to { unitId, date, cost }
  const expensesFlat = useMemo(() => {
    const out = [];
    for (const row of expenseItems) {
      const qty = Number(row.quantity) || 0;
      const price = Number(row.unit_price) || 0;
      const parent = row.sla_expenses || {};
      const date = parent.date || null;
      const unit = parent.sla_unit_id ?? null;
      if (!date || unit == null) continue;
      out.push({ sla_unit_id: unit, date, cost: qty * price });
    }
    return out;
  }, [expenseItems]);

  // Aggregations
  const costByUnit = useMemo(() => {
    const map = new Map();
    for (const e of expensesFlat) {
      map.set(e.sla_unit_id, (map.get(e.sla_unit_id) || 0) + e.cost);
    }
    return Array.from(map.entries()).map(([id, total]) => ({
      unit: unitLookup[id] ?? id,
      total
    }));
  }, [expensesFlat, unitLookup]);

  const incomeByUnit = useMemo(() => {
    const map = new Map();
    for (const i of incomes) {
      const v = Number(i.amount) || 0;
      map.set(i.sla_unit_id, (map.get(i.sla_unit_id) || 0) + v);
    }
    return Array.from(map.entries()).map(([id, total]) => ({
      unit: unitLookup[id] ?? id,
      total
    }));
  }, [incomes, unitLookup]);

  const totalsByMonth = useMemo(() => {
    const map = new Map(); // month -> {month, expenses, incomes}
    for (const e of expensesFlat) {
      const k = safeMonthKey(e.date);
      if (!k) continue;
      const row = map.get(k) || { month: k, expenses: 0, incomes: 0 };
      row.expenses += e.cost;
      map.set(k, row);
    }
    for (const i of incomes) {
      const k = safeMonthKey(i.date);
      if (!k) continue;
      const row = map.get(k) || { month: k, expenses: 0, incomes: 0 };
      row.incomes += Number(i.amount) || 0;
      map.set(k, row);
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [expensesFlat, incomes]);

  const costByDate = useMemo(() => {
    const map = new Map();
    for (const e of expensesFlat) {
      const d = e.date;
      if (!d) continue;
      map.set(d, (map.get(d) || 0) + e.cost);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total }));
  }, [expensesFlat]);

  const incomeByDate = useMemo(() => {
    const map = new Map();
    for (const i of incomes) {
      const d = i.date;
      if (!d) continue;
      map.set(d, (map.get(d) || 0) + (Number(i.amount) || 0));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date, total }));
  }, [incomes]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>SLA Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-sm block mb-1">SLA Unit</label>
         <Select value={unitId || "all"} onValueChange={(v) => setUnitId(v === "all" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="All units" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {units.map(u => (
              <SelectItem key={u.id} value={String(u.id)}>{u.unit_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>
          </div>
          <div>
            <label className="text-sm block mb-1">Start date</label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <label className="text-sm block mb-1">End date</label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="flex items-end text-sm">{loading ? "Loading..." : ""}</div>
        </CardContent>
      </Card>

      {/* Cost by Unit */}
      <Card>
        <CardHeader><CardTitle>Cost by Unit</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="table-head-bold">
Unit</TableHead>
                <TableHead className="text-right">Total Cost (R)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costByUnit.length === 0 ? (
                <TableRow><TableCell colSpan={2}>No data</TableCell></TableRow>
              ) : (
                costByUnit.map((r) => (
                  <TableRow key={r.unit}>
                    <TableCell>{r.unit}</TableCell>
                    <TableCell className="text-right">{fmt(r.total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Income by Unit */}
      <Card>
        <CardHeader><CardTitle>Income by Unit</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="table-head-bold">
Unit</TableHead>
                <TableHead className="text-right">Total Income (R)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incomeByUnit.length === 0 ? (
                <TableRow><TableCell colSpan={2}>No data</TableCell></TableRow>
              ) : (
                incomeByUnit.map((r) => (
                  <TableRow key={r.unit}>
                    <TableCell>{r.unit}</TableCell>
                    <TableCell className="text-right">{fmt(r.total)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Monthly totals */}
      <Card>
        <CardHeader><CardTitle>Totals per Month (All Units)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="table-head-bold">
Month</TableHead>
                <TableHead className="text-right">Income (R)</TableHead>
                <TableHead className="text-right">Expense (R)</TableHead>
                <TableHead className="text-right">Net (R)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {totalsByMonth.length === 0 ? (
                <TableRow><TableCell colSpan={4}>No data</TableCell></TableRow>
              ) : (
                totalsByMonth.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell>{r.month}</TableCell>
                    <TableCell className="text-right">{fmt(r.incomes)}</TableCell>
                    <TableCell className="text-right">{fmt(r.expenses)}</TableCell>
                    <TableCell className="text-right">{fmt((r.incomes || 0) - (r.expenses || 0))}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* By date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Cost by Date</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-head-bold">
Date</TableHead>
                  <TableHead className="text-right">Cost (R)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costByDate.length === 0 ? (
                  <TableRow><TableCell colSpan={2}>No data</TableCell></TableRow>
                ) : (
                  costByDate.map((r) => (
                    <TableRow key={r.date}>
                      <TableCell>{r.date}</TableCell>
                      <TableCell className="text-right">{fmt(r.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Income by Date</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-head-bold">
Date</TableHead>
                  <TableHead className="text-right">Income (R)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incomeByDate.length === 0 ? (
                  <TableRow><TableCell colSpan={2}>No data</TableCell></TableRow>
                ) : (
                  incomeByDate.map((r) => (
                    <TableRow key={r.date}>
                      <TableCell>{r.date}</TableCell>
                      <TableCell className="text-right">{fmt(r.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
