import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, parseISO, isWithinInterval } from 'date-fns';

type Entry = {
  id: string;
  jobNumber: string;
  rep: string;
  customer: string;
  jobType: string;
  date: string;
  sellingTotal: number;
  expenseTotal: number;
};

const mockData: Entry[] = [
  {
    id: '1',
    jobNumber: 'JOB001',
    rep: 'Rep A',
    customer: 'Customer 1',
    jobType: 'Install',
    date: '2024-01-15',
    sellingTotal: 1000,
    expenseTotal: 490,
  },
  {
    id: '2',
    jobNumber: 'JOB002',
    rep: 'Rep B',
    customer: 'Cash Sales',
    jobType: 'Repair',
    date: '2024-01-20',
    sellingTotal: 800,
    expenseTotal: 560,
  },
  {
    id: '3',
    jobNumber: 'JOB003',
    rep: 'Rep A',
    customer: 'Customer 2',
    jobType: 'Service',
    date: '2024-02-05',
    sellingTotal: 600,
    expenseTotal: 350,
  },
];

const getMargin = (sell: number, expense: number) => {
  if (sell === 0) return 0;
  return ((sell - expense) / sell) * 100;
};

const marginColor = (margin: number) => {
  if (margin > 40) return 'bg-green-500 text-white';
  if (margin >= 31 && margin <= 39) return 'bg-yellow-400 text-black';
  return 'bg-red-600 text-white';
};

export default function CostingReports() {
  const [data, setData] = useState<Entry[]>(mockData);
  const [filtered, setFiltered] = useState<Entry[]>(mockData);

  const [repFilter, setRepFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('');
  const [jobNumberFilter, setJobNumberFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [marginRange, setMarginRange] = useState('');

  useEffect(() => {
    let results = data;

    if (repFilter) results = results.filter(r => r.rep === repFilter);
    if (customerFilter) results = results.filter(r => r.customer === customerFilter);
    if (jobTypeFilter) results = results.filter(r => r.jobType === jobTypeFilter);
    if (jobNumberFilter) results = results.filter(r => r.jobNumber.includes(jobNumberFilter));

    if (startDate && endDate) {
      results = results.filter(r =>
        isWithinInterval(parseISO(r.date), {
          start: parseISO(startDate),
          end: parseISO(endDate),
        }),
      );
    }

    if (marginRange) {
      results = results.filter(r => {
        const margin = getMargin(r.sellingTotal, r.expenseTotal);
        if (marginRange === 'above40') return margin > 40;
        if (marginRange === 'between31and39') return margin >= 31 && margin <= 39;
        if (marginRange === 'below30') return margin < 30;
        return true;
      });
    }

    setFiltered(results);
  }, [
    repFilter,
    customerFilter,
    jobTypeFilter,
    jobNumberFilter,
    startDate,
    endDate,
    marginRange,
    data,
  ]);

  const totalProfit = filtered.reduce((acc, cur) => acc + (cur.sellingTotal - cur.expenseTotal), 0);
  const avgMargin =
    filtered.length > 0
      ? filtered.reduce((acc, cur) => acc + getMargin(cur.sellingTotal, cur.expenseTotal), 0) /
        filtered.length
      : 0;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Costing Reports</h1>

      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4">
          <div>
            <Label>Start Date</Label>
            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>End Date</Label>
            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <Label>Rep</Label>
            <Input value={repFilter} onChange={e => setRepFilter(e.target.value)} />
          </div>
          <div>
            <Label>Customer</Label>
            <Input value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} />
          </div>
          <div>
            <Label>Job Type</Label>
            <Input value={jobTypeFilter} onChange={e => setJobTypeFilter(e.target.value)} />
          </div>
          <div>
            <Label>Job Number</Label>
            <Input value={jobNumberFilter} onChange={e => setJobNumberFilter(e.target.value)} />
          </div>
          <div className="col-span-full">
            <Label>Profit Margin Range</Label>
            <select
              className="w-full border rounded px-2 py-1"
              value={marginRange}
              onChange={e => setMarginRange(e.target.value)}
            >
              <option value="">All</option>
              <option value="above40">Above 40%</option>
              <option value="between31and39">31% to 39%</option>
              <option value="below30">Below 30%</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-2">
          <h2 className="font-bold text-lg">Summary</h2>
          <p>
            <strong>Total Profit:</strong> R{totalProfit.toFixed(2)}
          </p>
          <p>
            <strong>Average Margin:</strong> {avgMargin.toFixed(1)}%
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          {filtered.length === 0 && <p>No entries match the filters.</p>}
          {filtered.map(entry => {
            const margin = getMargin(entry.sellingTotal, entry.expenseTotal);
            return (
              <div
                key={entry.id}
                className={`border rounded p-4 flex flex-col md:flex-row md:justify-between items-start md:items-center gap-2 ${marginColor(
                  margin
                )}`}
              >
                <div>
                  <div className="font-bold">{entry.jobNumber}</div>
                  <div>{format(parseISO(entry.date), 'yyyy-MM-dd')}</div>
                  <div>
                    {entry.rep} - {entry.customer} - {entry.jobType}
                  </div>
                </div>
                <div className="text-right">
                  <div>
                    <strong>Profit:</strong> R{(entry.sellingTotal - entry.expenseTotal).toFixed(2)}
                  </div>
                  <div>
                    <strong>Margin:</strong> {margin.toFixed(1)}%
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
