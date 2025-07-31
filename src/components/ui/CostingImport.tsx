import React, { useState } from 'react';
import Papa from 'papaparse';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LineItem {
  jobNumber: string;
  jobPerformed: string;
  customer: string;
  cashCustomer: string;
  rep: string;
  invoiceNumber: string;
  description?: string;
  quantity?: number;
  amount?: number;
  supplier?: string;
  partDescription?: string;
  partQuantity?: number;
  cost?: number;
}

interface GroupedJob {
  jobNumber: string;
  header: Omit<LineItem, 'description' | 'quantity' | 'amount' | 'supplier' | 'partDescription' | 'partQuantity' | 'cost'>;
  customerLines: LineItem[];
  expenseLines: LineItem[];
}

const CostingImport: React.FC = () => {
  const [jobs, setJobs] = useState<GroupedJob[]>([]);

  const parseCSV = (file: File): Promise<LineItem[]> =>
    new Promise((resolve, reject) => {
      Papa.parse<LineItem>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => resolve(result.data),
        error: reject,
      });
    });

  const handleImport = async (customerFile?: File, expenseFile?: File) => {
    let customerData: LineItem[] = [];
    let expenseData: LineItem[] = [];

    if (customerFile) customerData = await parseCSV(customerFile);
    if (expenseFile) expenseData = await parseCSV(expenseFile);

    const allJobs = new Map<string, GroupedJob>();

    const mergeLine = (line: LineItem, type: 'customer' | 'expense') => {
      if (!line.jobNumber) return;
      const key = line.jobNumber.trim();

      if (!allJobs.has(key)) {
        allJobs.set(key, {
          jobNumber: key,
          header: {
            jobNumber: key,
            jobPerformed: line.jobPerformed || '',
            customer: line.customer || '',
            cashCustomer: line.cashCustomer || '',
            rep: line.rep || '',
            invoiceNumber: line.invoiceNumber || '',
          },
          customerLines: [],
          expenseLines: [],
        });
      }

      const job = allJobs.get(key)!;
      if (type === 'customer') {
        job.customerLines.push({
          ...line,
          quantity: Number(line.quantity),
          amount: Number(line.amount),
        });
      } else {
        job.expenseLines.push({
          ...line,
          partQuantity: Number(line.partQuantity),
          cost: Number(line.cost),
        });
      }
    };

    customerData.forEach((line) => mergeLine(line, 'customer'));
    expenseData.forEach((line) => mergeLine(line, 'expense'));

    setJobs(Array.from(allJobs.values()));
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Import Costing CSV</h2>
      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-4">
          <div className="flex items-center gap-4">
            <Input type="file" accept=".csv" onChange={(e) => {
              const customerFile = e.target.files?.[0];
              if (customerFile) handleImport(customerFile, undefined);
            }} />
            <span>Customer Side Upload</span>
          </div>
          <div className="flex items-center gap-4">
            <Input type="file" accept=".csv" onChange={(e) => {
              const expenseFile = e.target.files?.[0];
              if (expenseFile) handleImport(undefined, expenseFile);
            }} />
            <span>Expense Side Upload</span>
          </div>
        </CardContent>
      </Card>

      {jobs.map((job) => (
        <Card key={job.jobNumber} className="mb-6">
          <CardContent className="p-4">
            <div className="font-bold mb-2">
              Job: {job.jobNumber} | Rep: {job.header.rep} | Customer: {job.header.customer} | Invoice: {job.header.invoiceNumber}
            </div>
            <div>
              <h4 className="font-semibold">Customer Lines</h4>
              <ul className="list-disc ml-5">
                {job.customerLines.map((line, idx) => (
                  <li key={idx}>
                    {line.description} — {line.quantity} × R{line.amount?.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4">
              <h4 className="font-semibold">Expense Lines</h4>
              <ul className="list-disc ml-5">
                {job.expenseLines.map((line, idx) => (
                  <li key={idx}>
                    {line.partDescription} (Part {line.supplier}) — {line.partQuantity} × R{line.cost?.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CostingImport;
