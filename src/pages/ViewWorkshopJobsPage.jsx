import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { Edit, Trash2, Search, X } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import AddWorkshopJobPage from './AddWorkshopJobPage';

const getStatusColor = (status, isOverdue) => {
  if (isOverdue) return 'bg-red-500 text-white';

  const normalizedStatus = (status || '').toLowerCase();

  switch (normalizedStatus) {
    case 'stripping': return 'bg-blue-300';
    case 'go ahead': return 'bg-yellow-400';
    case 'completed': return 'bg-pink-300';
    case 'invoiced': return 'bg-green-400';
    case 'pdi': return 'bg-purple-400';
    case 'quoted/awaiting order': return 'bg-green-700 text-white';
    default: return 'bg-gray-200';
  }
};
const ViewWorkshopJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sortField, setSortField] = useState('job_number');
  const [sortDirection, setSortDirection] = useState('asc');
  const { toast } = useToast();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('workshop_jobs')
      .select(`
        *,
        technician:technicians(name),
        customer:customers!customer_id_int(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error fetching jobs',
        description: error.message
      });
      setLoading(false);
      return;
    }

    const safeFilter = activeFilter.trim().toLowerCase();
    const filteredData = safeFilter
      ? data.filter(job => {
          return [
            job.job_number,
            job.equipment_detail,
            job.customer?.name,
            job.cash_customer_name,
            job.technician?.name,
            job.status
          ].some(field => (field || '').toLowerCase().includes(safeFilter));
        })
      : data;

    setJobs(filteredData);
    setLoading(false);
  }, [toast, activeFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedJobs = [...jobs].sort((a, b) => {
  const getValue = (job) => {
    switch (sortField) {
      case 'overdue':
        return job.po_date && job.days_quoted
          ? differenceInDays(new Date(), new Date(job.po_date)) > job.days_quoted
            ? 1
            : 0
          : 0;
      case 'status':
        return (job.status || '').toLowerCase().trim();
      default:
        return job[sortField];
    }
  };

  const valA = getValue(a);
  const valB = getValue(b);

  if (valA === undefined || valA === null) return 1;
  if (valB === undefined || valB === null) return -1;

  if (typeof valA === 'string') {
    return sortDirection === 'asc'
      ? valA.localeCompare(valB)
      : valB.localeCompare(valA);
  }

  return sortDirection === 'asc' ? valA - valB : valB - valA;
});


  const handleApplyFilter = () => setActiveFilter(filter);
  const handleClearFilter = () => {
    setFilter('');
    setActiveFilter('');
  };

  const handleEditClick = (job) => {
    setSelectedJob(job);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (job) => {
    setSelectedJob(job);
    setIsDeleteDialogOpen(true);
  };

const handleDeleteConfirm = async () => {
  if (!selectedJob) return;

  const { error } = await supabase
    .from('workshop_jobs')
    .delete()
    .eq('id', selectedJob.id);

  if (error) {
    toast({
      variant: 'destructive',
      title: 'Error deleting job',
      description: error.message,
    });
  } else {
    toast({
      title: 'Deleted!',
      description: 'Workshop job deleted successfully.',
    });
    fetchJobs();
  }

  setIsDeleteDialogOpen(false);
  setSelectedJob(null);
};
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Workshop Jobs</CardTitle>
          <CardDescription>View, filter, and manage all workshop jobs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Input
  placeholder="Filter jobs..."
  value={filter}
  onChange={(e) => {
    const value = e.target.value;
    setFilter(value);
    setActiveFilter(value);
  }}
  className="max-w-sm"
/>
            <Button onClick={handleApplyFilter}>
              <Search className="mr-2 h-4 w-4" />Filter
            </Button>
            <Button variant="ghost" onClick={handleClearFilter}>
              <X className="mr-2 h-4 w-4" />Clear
            </Button>
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => handleSort('job_number')} className="cursor-pointer">Job No.</TableHead>
                  <TableHead className="table-head-bold">
Technician</TableHead>
                  <TableHead className="table-head-bold">
Equipment</TableHead>
                  <TableHead className="table-head-bold">
Customer</TableHead>
                  <TableHead onClick={() => handleSort('po_date')} className="cursor-pointer">PO Date</TableHead>
                  <TableHead onClick={() => handleSort('quote_date')} className="cursor-pointer">Quote Date</TableHead>
                  <TableHead onClick={() => handleSort('quote_amount')} className="cursor-pointer">Quote Amt.</TableHead>
                  <TableHead className="table-head-bold">
Overdue</TableHead>
                  <TableHead className="table-head-bold">
Delivery</TableHead>
                  <TableHead className="table-head-bold">
Status</TableHead>
                  <TableHead className="text-right table-head-bold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="11" className="text-center">Loading jobs...</TableCell>
                  </TableRow>
                ) : sortedJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="11" className="text-center">No jobs found.</TableCell>
                  </TableRow>
                ) : (
                  sortedJobs.map((job) => {
                    const isOverdue = job.po_date && job.days_quoted
                      ? differenceInDays(new Date(), new Date(job.po_date)) > job.days_quoted
                      : false;

                    const rowClass = isOverdue ? 'bg-red-100' : '';
                    const statusClass = getStatusColor(job.status, isOverdue);

                    return (
                      <TableRow key={job.id} className={rowClass}>
                        <TableCell>{job.job_number}</TableCell>
                        <TableCell>{job.technician?.name || 'N/A'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{job.equipment_detail}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{job.customer?.name || job.cash_customer_name}</TableCell>
                        <TableCell>{job.po_date ? format(new Date(job.po_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>{job.quote_date ? format(new Date(job.quote_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell className="text-right">R {Number(job.quote_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="font-bold text-center">{isOverdue ? 'YES' : 'NO'}</TableCell>
                        <TableCell>{job.delivery_date ? format(new Date(job.delivery_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-md text-xs font-semibold ${statusClass}`}>
                            {job.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button variant="ghost" size="icon" onClick={() => handleEditClick(job)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(job)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Workshop Job</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AddWorkshopJobPage
              isEditMode={true}
              jobData={selectedJob}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                fetchJobs();
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
              This action cannot be undone. This will permanently delete the workshop job.
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

export default ViewWorkshopJobsPage;
