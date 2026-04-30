import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export default function ViewRentalExpenses() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [sortField, setSortField] = useState(null);
  const [sortDirection, setSortDirection] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className="inline ml-1 h-3 w-3 opacity-40" />;
    return sortDirection === 'asc' ? <ChevronUp className="inline ml-1 h-3 w-3" /> : <ChevronDown className="inline ml-1 h-3 w-3" />;
  };

  const sortedEntries = useMemo(() => {
    if (!sortField) return entries;
    return [...entries].sort((a, b) => {
      let aVal = sortField === 'machine' ? (a.rental_equipment?.plant_no || '') : sortField === 'supplier' ? (a.suppliers?.name || '') : a[sortField];
      let bVal = sortField === 'machine' ? (b.rental_equipment?.plant_no || '') : sortField === 'supplier' ? (b.suppliers?.name || '') : b[sortField];
      if (aVal == null) aVal = ''; if (bVal == null) bVal = '';
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDirection === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [entries, sortField, sortDirection]);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('rental_expenses')
      .select(`
        id,
        date,
        total_amount,
        rental_equipment:rental_equipment_id (
          plant_no
        ),
        suppliers:supplier_id (
          name
        )
      `)
      .order('date', { ascending: false });

    if (error) {
      toast({ variant: 'destructive', title: 'Error loading expenses', description: error.message });
    } else {
      setEntries(data || []);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense entry?')) return;
    const { error } = await supabase.from('rental_expenses').delete().eq('id', id);
    if (error) {
      toast({ variant: 'destructive', title: 'Failed to delete entry', description: error.message });
    } else {
      toast({ title: 'Deleted', description: 'Expense was removed.' });
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const handleEdit = (id) => {
    navigate(`/rental/expense/edit/${id}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>All Rental Expense Entries</CardTitle>
      </CardHeader>
      <CardContent>
        <table className="min-w-full table-auto text-sm border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left cursor-pointer select-none" onClick={() => handleSort('date')}>Date <SortIcon field="date" /></th>
              <th className="p-2 text-left cursor-pointer select-none" onClick={() => handleSort('machine')}>Machine <SortIcon field="machine" /></th>
              <th className="p-2 text-left cursor-pointer select-none" onClick={() => handleSort('supplier')}>Supplier <SortIcon field="supplier" /></th>
              <th className="p-2 text-left cursor-pointer select-none" onClick={() => handleSort('total_amount')}>Amount <SortIcon field="total_amount" /></th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="p-2">{e.date?.split('T')[0]}</td>
                <td className="p-2">{e.rental_equipment?.plant_no ?? '—'}</td>
                <td className="p-2">{e.suppliers?.name ?? '—'}</td>
                <td className="p-2">{`R ${Number(e.total_amount ?? 0).toFixed(2)}`}</td>
                <td className="p-2 flex gap-2">
                  <Button size="sm" onClick={() => handleEdit(e.id)}>Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(e.id)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
