import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type CostingEntry = {
  id: number;
  job_number: string;
  invoice_number: string;
  job_description: string;
  customer: string;
  rep: string;
  profit: number;
  margin: number;
};

export default function CostingList() {
  const [entries, setEntries] = useState<CostingEntry[]>([]);

  useEffect(() => {
    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from('costing_entries')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) console.error('Error loading entries:', error);
      else setEntries(data || []);
    };

    fetchEntries();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Saved Costing Entries</h2>
      {entries.length === 0 && <p className="text-gray-500">No entries yet.</p>}

      {entries.map((entry) => (
        <Card key={entry.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p><strong>{entry.job_number}</strong> - {entry.job_description}</p>
                <p>{entry.customer} | {entry.rep}</p>
                <p>Profit: R{entry.profit.toFixed(2)} | Margin: {entry.margin.toFixed(1)}%</p>
              </div>
              <Button variant="outline" size="sm">Edit</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
