
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

const ViewWorkshopJobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('workshop_jobs')
  .select("*, technicians(name)")
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
            <Button onClick={() => setActiveFilter(filter)}>
              <Search className="mr-2 h-4 w-4" />Filter
            </Button>
            <Button variant="ghost" onClick={() => { setFilter(''); setActiveFilter(''); }}>
              <X className="mr-2 h-4 w-4" />Clear
            </Button>
          </div>

          <div className="w-full overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Job No.</TableHead>
                  <TableHead>Technician</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>PO Date</TableHead>
                  <TableHead>Quote Date</TableHead>
                  <TableHead>Quote Amt.</TableHead>
                  <TableHead>Overdue</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan="11" className="text-center">Loading jobs...</TableCell></TableRow>
                ) : jobs.length === 0 ? (
                  <TableRow><TableCell colSpan="11" className="text-center">No jobs found.</TableCell></TableRow>
                ) : (
                  jobs.map((job) => {
                    const isOverdue = job.po_date && job.days_quoted
                      ? differenceInDays(new Date(), new Date(job.po_date)) > job.days_quoted
                      : false;

                    return (
                      <TableRow key={job.id}>
                        <TableCell>{job.job_number}</TableCell>
                        <TableCell>{job.technicians?.name || 'Unknown'}</TableCell>
                        <TableCell>{job.equipment_detail || 'N/A'}</TableCell>
                        <TableCell>{job.cash_customer_name || job.customer?.name || 'Unknown'}</TableCell>
                        <TableCell>{job.po_date ? format(new Date(job.po_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>{job.quote_date ? format(new Date(job.quote_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>R {Number(job.quote_amount || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-center font-bold">{isOverdue ? 'YES' : 'NO'}</TableCell>
                        <TableCell>{job.delivery_date ? format(new Date(job.delivery_date), 'yyyy-MM-dd') : 'N/A'}</TableCell>
                        <TableCell>{job.status || 'N/A'}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
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
          </div>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Edit Workshop Job</DialogTitle></DialogHeader>
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
