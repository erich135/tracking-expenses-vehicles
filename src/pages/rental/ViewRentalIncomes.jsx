import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const ViewRentalIncomes = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const fetchEntries = async () => {
      const { data, error } = await supabase
        .from('rental_incomes')
        .select(`
          id,
          invoice_number,
          date,
          amount,
          rep_code,
          account_number,
          notes,
          customers (name),
          rental_equipment (plant_no)
        `)
        .order('date', { ascending: false });

      if (error) {
        toast({ variant: 'destructive', title: 'Error loading entries', description: error.message });
      } else {
        setEntries(data || []);
      }
    };

    fetchEntries();
  }, [toast]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rental income entry?')) return;

    const { error } = await supabase.from('rental_incomes').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to delete entry', description: error.message });
    } else {
      toast({ title: 'Deleted', description: 'Entry was removed.' });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Rental Income Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="min-w-full table-auto text-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Machine</th>
              <th className="p-2 text-left">Customer</th>
              <th className="p-2 text-left">Rep</th>
              <th className="p-2 text-left">Invoice</th>
              <th className="p-2 text-left">Amount</th>
              <th className="p-2 text-left">Notes</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t">
                <td className="p-2">{entry.date?.split('T')[0]}</td>
                <td className="p-2">{entry.rental_equipment?.plant_no}</td>
                <td className="p-2">{entry.customers?.name}</td>
                <td className="p-2">{entry.rep_code}</td>
                <td className="p-2">{entry.invoice_number || ''}</td>
                <td className="p-2">R {Number(entry.amount ?? 0).toFixed(2)}</td>
                <td className="p-2">{entry.notes}</td>
                <td className="p-2 flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate(`/rental/income/edit/${entry.id}`)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(entry.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}

            {entries.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={8}>
                  No entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default ViewRentalIncomes;
