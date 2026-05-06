
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Edit, Trash2, Search, X, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import AddWorkshopJobPage from './AddWorkshopJobPage';

const ViewWorkshopJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [sortField, setSortField] = useState(null);
  const sortDirectionState = useState('asc');
  const [sortDirection, setSortDirection] = sortDirectionState;
  const { toast } = useToast();

  const tableContainerRef = useRef(null);
  const topScrollRef = useRef(null);

  const handleTopScroll = (e) => {
    if (tableContainerRef.current && tableContainerRef.current.scrollLeft !== e.target.scrollLeft) {
      tableContainerRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleTableScroll = (e) => {
    if (topScrollRef.current && topScrollRef.current.scrollLeft !== e.target.scrollLeft) {
      topScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronsUpDown className="inline ml-1 h-3 w-3 opacity-40" />;
    return sortDirection === 'asc' ? <ChevronUp className="inline ml-1 h-3 w-3" /> : <ChevronDown className="inline ml-1 h-3 w-3" />;
  };

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
  .from('workshop_jobs')
  .select(`
    *,
    technicians(name),
    customers(name)
  `)
  .order('created_at', { ascending: false })
  .limit(99999);

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
            job.cash_customer_name,
            job.status
          ]
          .map(field => (field || '').toLowerCase())
          .some(field => field.includes(safeFilter));
        })
      : data;

    setJobs(filteredData);
    setLoading(false);
  }, [toast, activeFilter]);

  const sortedJobs = React.useMemo(() => {
    if (!sortField) return jobs;
    return [...jobs].sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'technician') { aVal = a.technicians?.name || ''; bVal = b.technicians?.name || ''; }
      else if (sortField === 'customer') { aVal = a.customers?.name || a.cash_customer_name || ''; bVal = b.customers?.name || b.cash_customer_name || ''; }
      else { aVal = a[sortField]; bVal = b[sortField]; }
      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [jobs, sortField, sortDirection]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

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
    <div className="space-y-4">
      <Card className="shadow-sm border-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle>All Workshop Jobs</CardTitle>
          <CardDescription>View, filter, and manage all workshop jobs.</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="flex flex-wrap items-center gap-2 mb-4">
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
            <Button onClick={() => setActiveFilter(filter)}>
              <Search className="mr-2 h-4 w-4" />Filter
            </Button>
            <Button variant="ghost" onClick={() => { setFilter(''); setActiveFilter(''); }}>
              <X className="mr-2 h-4 w-4" />Clear
            </Button>
          </div>

          <div
            ref={topScrollRef}
            className="w-full overflow-x-auto border border-b-0 rounded-t-md bg-gray-50 dark:bg-gray-900 custom-scrollbar"
            onScroll={handleTopScroll}
          >
            <div style={{ width: '2000px', height: '1px' }}></div>
          </div>
          <Table 
            containerRef={tableContainerRef}
            onScroll={handleTableScroll}
            containerClassName="flex-1 min-h-0 border rounded-b-md [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]" 
            className="min-w-[2000px]"
          >
              <TableHeader className="sticky top-0 z-20 bg-white dark:bg-background">
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('job_number')}>Job No.<SortIcon field="job_number" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('technician')}>Technician<SortIcon field="technician" /></TableHead>
                  <TableHead className="cursor-pointer select-none min-w-[200px]" onClick={() => handleSort('equipment_detail')}>Equipment<SortIcon field="equipment_detail" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('customer')}>Customer<SortIcon field="customer" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('po_date')}>PO Date<SortIcon field="po_date" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('quote_date')}>Quote Date<SortIcon field="quote_date" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('quote_amount')}>Quote Amt.<SortIcon field="quote_amount" /></TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('delivery_date')}>Delivery<SortIcon field="delivery_date" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>Status<SortIcon field="status" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('job_type')}>Type<SortIcon field="job_type" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('model')}>Model<SortIcon field="model" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('received_date')}>Received<SortIcon field="received_date" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('start_date')}>Start Date<SortIcon field="start_date" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('eta_date')}>ETA<SortIcon field="eta_date" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort('completion_date')}>Completion<SortIcon field="completion_date" /></TableHead>
                  <TableHead>Lead Time</TableHead>
                  <TableHead className="cursor-pointer select-none min-w-[150px]" onClick={() => handleSort('reason_for_hold_up')}>Hold Up Reason<SortIcon field="reason_for_hold_up" /></TableHead>
                  <TableHead className="text-right sticky right-0 bg-white dark:bg-background z-10 w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan="19" className="text-center">Loading jobs...</TableCell></TableRow>
                ) : jobs.length === 0 ? (
                  <TableRow><TableCell colSpan="19" className="text-center">No jobs found.</TableCell></TableRow>
                ) : (
                  sortedJobs.map((job) => {
                    const isOverdue = job.po_date && job.days_quoted
                      ? differenceInDays(new Date(), new Date(job.po_date)) > job.days_quoted
                      : false;

                    return (
                      <TableRow key={job.id}>
                        <TableCell>{job.job_number}</TableCell>
                        <TableCell>{job.technicians?.name || 'Unknown'}</TableCell>
                        <TableCell>{job.equipment_detail || 'N/A'}</TableCell>
                        <TableCell>{job.customers?.name || job.cash_customer_name || 'Unknown'}</TableCell>
                        <TableCell>{job.po_date ? format(new Date(job.po_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>{job.quote_date ? format(new Date(job.quote_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>R {Number(job.quote_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold">{isOverdue ? 'YES' : 'NO'}</TableCell>
                        <TableCell>{job.delivery_date ? format(new Date(job.delivery_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>
                          <span className={`status-label ${job.status?.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-') || 'default'}`}>
                            {job.status || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>{job.job_type || 'N/A'}</TableCell>
                        <TableCell>{job.model || 'N/A'}</TableCell>
                        <TableCell>{job.received_date ? format(new Date(job.received_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>{job.start_date ? format(new Date(job.start_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>{job.eta_date ? format(new Date(job.eta_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>{job.completion_date ? format(new Date(job.completion_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>{
                          job.received_date
                            ? differenceInDays(
                                job.completion_date ? new Date(job.completion_date) : new Date(),
                                new Date(job.received_date)
                              )
                            : 'N/A'
                        }</TableCell>
                        <TableCell>{job.reason_for_hold_up || 'N/A'}</TableCell>
                        <TableCell className="text-right whitespace-nowrap sticky right-0 bg-white dark:bg-background z-10">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedJob(job); setIsEditDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedJob(job); setIsDeleteDialogOpen(true); }}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
          <DialogHeader><DialogTitle>Edit Workshop Job</DialogTitle></DialogHeader>
          <div className="py-2">
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
    </div>
  );
};

export default ViewWorkshopJobsPage;
