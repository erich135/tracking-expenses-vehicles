import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Edit, Trash2, Search, X } from 'lucide-react';
import AddCostingPage from '@/pages/AddCostingPage';

const ViewCostingsPage = () => {
  const [costings, setCostings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterJobNumber, setFilterJobNumber] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedCosting, setSelectedCosting] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchCostings = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('costing_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeFilter) {
      query = query.ilike('job_number', `%${activeFilter}%`);
    }

    const { data, error } = await query;

    if (error) {
      toast({ variant: 'destructive', title: 'Error fetching costings', description: error.message });
    } else {
      setCostings(data);
    }
    setLoading(false);
  }, [toast, activeFilter]);

  useEffect(() => {
    fetchCostings();
  }, [fetchCostings]);

  const handleApplyFilter = () => {
    setActiveFilter(filterJobNumber);
  };

  const handleClearFilter = () => {
    setFilterJobNumber('');
    setActiveFilter('');
  };

  const handleEditClick = (costing) => {
    setSelectedCosting(costing);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (costing) => {
    setSelectedCosting(costing);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCosting) return;
    const { error } = await supabase.from('costing_entries').delete().eq('id', selectedCosting.id);
    if (error) {
        toast({ variant: 'destructive', title: 'Error deleting entry', description: error.message });
    } else {
        toast({ title: 'Success!', description: 'Costing entry deleted successfully.' });
        fetchCostings();
    }
    setIsDeleteDialogOpen(false);
    setSelectedCosting(null);
  };

  const getMarginColor = (margin) => {
    if (margin <= 30) return 'text-red-600 font-bold';
    if (margin < 40) return 'text-yellow-500 font-bold';
    return 'text-green-600 font-semibold';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Costing Transactions</CardTitle>
          <CardDescription>View, filter, and manage all costing entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
              <Input
                  placeholder="Filter by Job Number..."
                  value={filterJobNumber}
                  onChange={(e) => setFilterJobNumber(e.target.value)}
                  className="max-w-sm"
              />
              <Button onClick={handleApplyFilter}><Search className="mr-2 h-4 w-4"/>Filter</Button>
              <Button variant="ghost" onClick={handleClearFilter}><X className="mr-2 h-4 w-4"/>Clear</Button>
          </div>

          {loading ? (
            <p>Loading transactions...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="table-head-bold">
Job Number</TableHead>
                  <TableHead className="table-head-bold">
Customer</TableHead>
                  <TableHead className="table-head-bold">
Job Description</TableHead>
                  <TableHead className="text-right table-head-bold">Profit (R)</TableHead>
                  <TableHead className="text-right table-head-bold">Margin (%)</TableHead>
                  <TableHead className="text-right table-head-bold">Actions</TableHead>
              </TableRow>
              </TableHeader>
              <TableBody>
                {costings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="6" className="text-center">No transactions found.</TableCell>
                  </TableRow>
                ) : (
                  costings.map((costing) => (
                    <TableRow key={costing.id}>
                      <TableCell>{costing.job_number}</TableCell>
                      <TableCell>{costing.customer}</TableCell>
                      <TableCell className="max-w-[250px] truncate">{costing.job_description}</TableCell>
                      <TableCell className="text-right">{Number(costing.profit).toFixed(2)}</TableCell>
                      <TableCell className={`text-right ${getMarginColor(costing.margin)}`}>
                        {Number(costing.margin).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(costing)}>
                              <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(costing)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-7xl">
              <DialogHeader>
                  <DialogTitle>Edit Costing Entry</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <AddCostingPage 
                    isEditMode={true} 
                    costingData={selectedCosting} 
                    onSuccess={() => {
                        setIsEditDialogOpen(false);
                        fetchCostings();
                    }}
                />
              </div>
          </DialogContent>
      </Dialog>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the costing entry.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ViewCostingsPage;