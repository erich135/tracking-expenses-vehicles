import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Autocomplete } from '@/components/ui/autocomplete';
import { supabase } from '@/lib/customSupabaseClient';
import { formatDateLocal, toLocalISOString } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarPlus as CalendarIcon } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const jobStatuses = [
  'Quoted/Awaiting Order',
  'Stripping',
  'Go Ahead',
  'Completed',
  'Invoiced',
  'Overdue',
  'PDI',
  'Awaiting Spares',
];

const areaPrefixMap = {
  CTN: 'WC',
  DBN: 'WD',
  JHB: 'WJ',
  LDB: 'WL',
  MDB: 'WM',
  PE: 'WP',
  RTB: 'WU',
  NAMIBIA: 'WN',
};

const AddWorkshopJobPage = ({ isEditMode = false, jobData, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchFromSupabase = async (table, searchColumn, searchTerm) => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .ilike(searchColumn, `%${searchTerm}%`)
      .limit(10);
    if (error) {
      toast({
        variant: 'destructive',
        title: `Error fetching ${table}`,
        description: error.message,
      });
      return [];
    }
    return data;
  };

  const [jobNumber, setJobNumber] = useState('');
  const [area, setArea] = useState('');
  const [isManualJobNumber, setIsManualJobNumber] = useState(false);
  const [equipmentDetail, setEquipmentDetail] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDate, setQuoteDate] = useState(null);
  const [poDate, setPoDate] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [cashCustomer, setCashCustomer] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [technicianList, setTechnicianList] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const fetchTechnicians = useCallback(async () => {
    const { data, error } = await supabase.from('technicians').select('*').order('name');
    if (!error) setTechnicianList(data);
  }, []);

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const fetchCustomers = useCallback(async () => {
    const { data, error } = await supabase.from('customers').select('*').order('name');
    if (!error) {
      setCustomerList(data);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchTechnicians();
  }, [fetchCustomers]);
  useEffect(() => {
    if (isEditMode && jobData) {
      setJobNumber(jobData.job_number || '');
      setArea(jobData.area || '');
      setEquipmentDetail(jobData.equipment_detail || '');
      setQuoteAmount(jobData.quote_amount?.toString() || '');
      setQuoteDate(jobData.quote_date ? new Date(jobData.quote_date) : null);
      setPoDate(jobData.po_date ? new Date(jobData.po_date) : null);
      setDeliveryDate(jobData.delivery_date ? new Date(jobData.delivery_date) : null);
      setStatus(jobData.status || '');
      setNotes(jobData.notes || '');
      setCashCustomer(jobData.cash_customer_name || '');

      // Fetch full customer and technician records for edit mode
      const fetchRelatedRecords = async () => {
        if (jobData.customer_id_int) {
          const { data: customerData } = await supabase
            .from('customers')
            .select('*')
            .eq('id', jobData.customer_id_int)
            .single();
          setSelectedCustomer(customerData);
        }

        if (jobData.technician_id) {
          const { data: technicianData } = await supabase
            .from('technicians')
            .select('*')
            .eq('id', jobData.technician_id)
            .single();
          setSelectedTechnician(technicianData);
        }
      };

      fetchRelatedRecords();

      setIsManualJobNumber(jobData.area === 'Rental' || jobData.area === 'Other');
    }
  }, [isEditMode, jobData]);

  const handleCustomerChange = (customer) => {
    setSelectedCustomer(customer);
    if (customer?.name !== 'Cash Sale') {
      setCashCustomer('');
    }
  };

  const handleAreaChange = (selectedArea) => {
    setArea(selectedArea);
    const isManual = selectedArea === 'Rental' || selectedArea === 'Other';
    setIsManualJobNumber(isManual);

    if (!isManual) {
      const prefix = areaPrefixMap[selectedArea] || 'XX';
      const random = Math.floor(Math.random() * 9000) + 1000;
      setJobNumber(`${prefix}-${random}`);
    } else {
      setJobNumber('');
    }
  };
  const handleSubmit = async () => {
    if (!jobNumber.trim()) {
      toast({
        variant: 'destructive',
        title: 'Job Number Required',
        description: 'Please enter or generate a job number.',
      });
      return;
    }

    const payload = {
      job_number: jobNumber,
      area,
      equipment_detail: equipmentDetail,
      quote_amount: parseFloat(quoteAmount) || 0,
      quote_date: quoteDate ? formatDateLocal(quoteDate) : null,
      po_date: poDate ? formatDateLocal(poDate) : null,
      delivery_date: deliveryDate ? formatDateLocal(deliveryDate) : null,
      status,
      notes,
      cash_customer_name: cashCustomer || null,
      customer_id_int: selectedCustomer?.id || null,
      updated_at: toLocalISOString(new Date()),
      technician_id: selectedTechnician?.id || null,
    };

    if (!isEditMode) {
      payload.created_at = toLocalISOString(new Date());
    }
// ✅ Check for duplicate job number unless area is "Rental" or "Other"
if (!["Rental", "Other"].includes(area)) {
  let query = supabase
    .from('workshop_jobs')
    .select('id')
    .eq('job_number', jobNumber);

  // ✅ Ignore the current record during edit
  if (isEditMode && jobData?.id) {
    query = query.neq('id', jobData.id);
  }

  const { data: existingJobs, error: checkError } = await query;

  if (checkError) {
    toast({
      variant: 'destructive',
      title: 'Error checking job number',
      description: checkError.message,
    });
    return;
  }

  if (existingJobs.length > 0) {
    toast({
      variant: 'destructive',
      title: 'Duplicate Job Number',
      description: `A job with number "${jobNumber}" already exists.`,
    });
    return;
  }
}


    let result;
    if (isEditMode && jobData?.id) {
      result = await supabase
        .from('workshop_jobs')
        .update(payload)
        .eq('id', jobData.id);
    } else {
      result = await supabase
        .from('workshop_jobs')
        .insert([payload]);
    }

    const { error } = result;

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error saving job',
        description: error.message,
      });
    } else {
      toast({
        title: 'Success!',
        description: `Workshop job ${isEditMode ? 'updated' : 'created'} successfully.`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/workshop-jobs/view');
      }
    }
  };
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isEditMode ? 'Edit' : 'Add'} Workshop Job</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Area</Label>
            <Select value={area} onValueChange={handleAreaChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {[
                  'CTN', 'DBN', 'JHB', 'LDB', 'MDB', 'PE', 'RTB', 'NAMIBIA', 'Rental', 'Other'
                ].map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Job Number</Label>
            <Input
              value={jobNumber}
              onChange={(e) => setJobNumber(e.target.value)}
              readOnly={!isManualJobNumber}
              placeholder={isManualJobNumber ? 'Enter job number' : ''}
            />
          </div>

          <div>
            <Label>Technician</Label>
            <Autocomplete
              value={selectedTechnician}
              onChange={(value) => setSelectedTechnician(value)}
              fetcher={(search) => fetchFromSupabase('technicians', 'name', search)}
              displayField="name"
              placeholder="Search technician..."
            />
          </div>

          <div>
            <Label>Customer</Label>
            <Autocomplete
              value={selectedCustomer}
              onChange={handleCustomerChange}
              fetcher={(search) => fetchFromSupabase('customers', 'name', search)}
              displayField="name"
              placeholder="Search customer..."
            />
          </div>

          {selectedCustomer?.name === 'Cash Sale' && (
            <div>
              <Label>Cash Customer Name</Label>
              <Input value={cashCustomer} onChange={(e) => setCashCustomer(e.target.value)} />
            </div>
          )}

          <div>
            <Label>Equipment Detail</Label>
            <Textarea value={equipmentDetail} onChange={(e) => setEquipmentDetail(e.target.value)} />
          </div>

          <div>
            <Label>Quote Amount</Label>
            <Input
              type="number"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
            />
          </div>

          <div>
            <Label>Quote Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {quoteDate ? format(quoteDate, 'yyyy-MM-dd') : 'Pick a date'}
                  <CalendarIcon className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar mode="single" selected={quoteDate} onSelect={setQuoteDate} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>PO Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {poDate ? format(poDate, 'yyyy-MM-dd') : 'Pick a date'}
                  <CalendarIcon className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar mode="single" selected={poDate} onSelect={setPoDate} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Delivery Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  {deliveryDate ? format(deliveryDate, 'yyyy-MM-dd') : 'Pick a date'}
                  <CalendarIcon className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {jobStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-end">
        <Button onClick={handleSubmit}>
          {isEditMode ? 'Update Job' : 'Create Job'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AddWorkshopJobPage;
