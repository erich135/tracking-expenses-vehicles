import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { toLocalISOString } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from '@/components/ui/table';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';

const PAGE_SIZE = 50;

// All known tables (so dropdown always shows them)
const allTables = [
  'customers',
  'suppliers',
  'technicians',
  'parts',
  'vehicles',
  'workshop_jobs',
  'vehicle_expenses',
  'workshop_expenses',
  'sla_expenses',
  'sla_incomes',
  'sla_units'
];

export default function AuditTrailPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [action, setAction] = useState('ALL');
  const [tableName, setTableName] = useState('ALL');
  const [userEmail, setUserEmail] = useState('');
  const [recordId, setRecordId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // pagination
  const [page, setPage] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    let query = supabase.from('audit_trail').select('*', { count: 'exact' }).order('created_at', { ascending: false });

    if (action !== 'ALL') query = query.eq('action', action);
    if (tableName !== 'ALL') query = query.eq('table_name', tableName);
    if (userEmail.trim()) query = query.ilike('user_email', `%${userEmail.trim()}%`);
    if (recordId.trim()) query = query.eq('record_id', recordId.trim());
    if (fromDate) query = query.gte('created_at', toLocalISOString(new Date(fromDate)));
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      query = query.lte('created_at', toLocalISOString(end));
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, error } = await query;
    if (error) {
      toast({ variant: 'destructive', title: 'Query failed', description: error.message });
      setRows([]);
    } else {
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, tableName, userEmail, recordId, fromDate, toDate, page]);

  const clearFilters = () => {
    setAction('ALL');
    setTableName('ALL');
    setUserEmail('');
    setRecordId('');
    setFromDate('');
    setToDate('');
    setPage(0);
  };

  const prettyJson = (obj) => {
    if (!obj) return 'No details';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  // Always include known tables + whatever appears in results
  const uniqueTables = useMemo(() => {
    const set = new Set([
      ...allTables,
      ...rows.map(r => r.table_name).filter(Boolean)
    ]);
    return Array.from(set).sort();
  }, [rows]);

  return (
    <div className="p-6">
      <Helmet>
        <title>Settings · Audit Trail</title>
      </Helmet>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Audit Trail</CardTitle>
          <CardDescription>See who added, edited, or deleted records.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-4">
            <div>
              <label className="text-sm block mb-1">Action</label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="ADD">Add</SelectItem>
                  <SelectItem value="EDIT">Edit</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm block mb-1">Table</label>
              <Select value={tableName} onValueChange={setTableName}>
                <SelectTrigger><SelectValue placeholder="Table" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  {uniqueTables.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm block mb-1">User email</label>
              <Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="name@company.com" />
            </div>
            <div>
              <label className="text-sm block mb-1">Record ID</label>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} placeholder="e.g. 123" />
            </div>
            <div>
              <label className="text-sm block mb-1">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <label className="text-sm block mb-1">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={() => { setPage(0); fetchData(); }} disabled={loading}>Apply</Button>
            <Button variant="outline" onClick={clearFilters} disabled={loading}>Clear</Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={loading || page === 0}>Prev</Button>
              <span className="text-sm">Page {page + 1}</span>
              <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={loading}>Next</Button>
            </div>
          </div>

          <div className="overflow-auto border rounded">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6}>Loading…</TableCell>
                  </TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>No results</TableCell>
                  </TableRow>
                )}
                {!loading && rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</TableCell>
                    <TableCell>{r.user_email || '-'}</TableCell>
                    <TableCell>{r.action}</TableCell>
                    <TableCell>{r.table_name}</TableCell>
                    <TableCell>{r.record_id}</TableCell>
                    <TableCell>
                      <details>
                        <summary className="cursor-pointer">View</summary>
                        <pre className="text-xs whitespace-pre-wrap">
                          {prettyJson(r.details || r.new_record_data || r.old_record_data)}
                        </pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
