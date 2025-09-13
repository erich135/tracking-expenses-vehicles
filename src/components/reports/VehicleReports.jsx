import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';

const MODE = {
  ALL: 'all',
  DUE_3000: 'due3000',
  DUE_1000: 'due1000',
};

const VehicleReports = () => {
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);

  // quick filters + search
  const [mode, setMode] = useState(MODE.ALL);
  const [q, setQ] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    // make sure these columns exist in your "vehicles" table
    const { data, error } = await supabase
      .from('vehicles')
      .select('id, name, registration_number, odometer, next_service_odometer');

    if (!error) setVehicles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // decorate with km_to_service
  const rows = useMemo(
    () =>
      (vehicles || []).map((v) => {
        const odo = Number(v.odometer ?? 0);
        const next = Number(v.next_service_odometer ?? 0);
        const km_to_service = next > 0 ? next - odo : null; // null when next service is not set
        return { ...v, odometer: odo, next_service_odometer: next, km_to_service };
      }),
    [vehicles]
  );

  // search + quick filter
  const filtered = useMemo(() => {
    let list = rows;

    // search by name or reg no.
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter(
        (r) =>
          String(r.name || '').toLowerCase().includes(term) ||
          String(r.registration_number || '').toLowerCase().includes(term)
      );
    }

    // quick filter modes
    if (mode === MODE.DUE_1000) {
      list = list.filter((r) => r.km_to_service !== null && r.km_to_service <= 1000);
    } else if (mode === MODE.DUE_3000) {
      list = list.filter((r) => r.km_to_service !== null && r.km_to_service <= 3000);
    }

    // sort: service due soonest first (nulls last)
    list = [...list].sort((a, b) => {
      const av = a.km_to_service;
      const bv = b.km_to_service;
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return av - bv;
    });

    return list;
  }, [rows, q, mode]);

  // counts for badges
  const counts = useMemo(
    () => ({
      all: rows.length,
      due3000: rows.filter((r) => r.km_to_service !== null && r.km_to_service <= 3000).length,
      due1000: rows.filter((r) => r.km_to_service !== null && r.km_to_service <= 1000).length,
    }),
    [rows]
  );

 const rowClass = (r) => {
  if (r.km_to_service === null) return '';

  // 🚨 Service overdue (negative or 0 km left) → RED
  if (r.km_to_service <= 0) return 'bg-red-600 text-white';

  // ⚠️ Service due soon (≤ 1000 km) → ORANGE
  if (r.km_to_service <= 1000) return 'bg-orange-400 text-black';

  // ⏳ Service approaching (≤ 3000 km) → YELLOW
  if (r.km_to_service <= 3000) return 'bg-yellow-300 text-black';

  return '';
};


  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Reports</CardTitle>
        <CardDescription>Service Due (by km)</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Toolbar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={mode === MODE.ALL ? 'default' : 'outline'}
              onClick={() => setMode(MODE.ALL)}
              title="Show all vehicles"
            >
              All <span className="ml-2 text-xs opacity-70">({counts.all})</span>
            </Button>
            <Button
              variant={mode === MODE.DUE_3000 ? 'default' : 'outline'}
              onClick={() => setMode(MODE.DUE_3000)}
              title="Within 3000 km of next service"
            >
              ≤ 3000 km <span className="ml-2 text-xs opacity-70">({counts.due3000})</span>
            </Button>
            <Button
              variant={mode === MODE.DUE_1000 ? 'default' : 'outline'}
              onClick={() => setMode(MODE.DUE_1000)}
              title="Within 1000 km of next service"
            >
              ≤ 1000 km <span className="ml-2 text-xs opacity-70">({counts.due1000})</span>
            </Button>
          </div>

          <div className="w-full md:w-72">
            <Input
              placeholder="Search name or reg no…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="table-head-bold">
Vehicle</TableHead>
              <TableHead className="table-head-bold">
Reg No.</TableHead>
              <TableHead className="text-right">Current Odo</TableHead>
              <TableHead className="text-right">Next Service Odo</TableHead>
              <TableHead className="text-right">Km to Service</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5}>Loading…</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5}>No vehicles match.</TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id} className={rowClass(r)}>
                  <TableCell>{r.name || '—'}</TableCell>
                  <TableCell>{r.registration_number || '—'}</TableCell>
                  <TableCell className="text-right">
                    {r.odometer || r.odometer === 0 ? r.odometer.toLocaleString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.next_service_odometer
                      ? r.next_service_odometer.toLocaleString()
                      : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.km_to_service === null
                      ? '—'
                      : r.km_to_service.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default VehicleReports;
