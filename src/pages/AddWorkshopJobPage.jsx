import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Autocomplete } from '@/components/ui/autocomplete';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarPlus as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// Area code mapping
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

  const [jobNumber, setJobNumber] = useState('');
  const [area, setArea] = useState('');
  const [equipmentDetail, setEquipmentDetail] = useState('');
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteDate, setQuoteDate] = useState(null);
  const [poDate, setPoDate] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(null);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [cashCustomer, setCashCustomer] = useState('');
  const [customerList, setCustomerList] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  // ✅ Fetch customer list on mount
useEffect(() => {
  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      toast({
        title: 'Error loading customers',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setCustomerList(data);
    }
  };

  fetchCustomers();
}, [toast]);

// ✅ Pre-fill fields in edit mode
useEffect(() => {
  if (isEditMode && jobData) {
    // Infer area from job number prefix if not directly available
let areaValue = jobData.area;
if (!areaValue && jobData.job_number) {
  const prefix = jobData.job_number.substring(0, 2); // e.g., 'WJ'
  const matchedArea = Object.keys(areaPrefixMap).find(
    (key) => areaPrefixMap[key] === prefix
  );
  areaValue = matchedArea || '';
}

setArea(areaValue);

    setJobNumber(jobData.job_number || '');
    setEquipmentDetail(jobData.equipment_detail || '');
    setQuoteAmount(jobData.quote_amount?.toString() || '');
    setQuoteDate(jobData.quote_date ? new Date(jobData.quote_date) : null);
    setPoDate(jobData.po_date ? new Date(jobData.po_date) : null);
    setDeliveryDate(jobData.delivery_date ? new Date(jobData.delivery_date) : null);
    setStatus(jobData.status || '');
    setNotes(jobData.notes || '');
    setCashCustomer(jobData.cash_customer_name || '');

    if (customerList.length > 0 && jobData.customer_id_int) {
      const matchedCustomer = customerList.find(
        (cust) => cust.id === jobData.customer_id_int
      );
      setSelectedCustomer(matchedCustomer || null);
    }
  }
}, [isEditMode, jobData, customerList]);

  // Auto-generate job number when area is selected
  useEffect(() => {
    if (!isEditMode && area) {
      const prefix = areaPrefixMap[area];
      const unique = Math.floor(1000 + Math.random() * 9000);
      setJobNumber(`${prefix}-${unique}`);
    }
  }, [area, isEditMode]);

  const handleCustomerChange = (customer) => {
    setSelectedCustomer(customer);
    if (customer?.name !== 'Cash Sale') {
      setCashCustomer('');
    }
  };
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? 'Edit Workshop Job' : 'Add New Workshop Job'}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Area Dropdown */}
          <div>
            <Label>Area</Label>
            <Select onValueChange={setArea} value={area}>
              <SelectTrigger>
                <SelectValue placeholder="Select an area" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(areaPrefixMap).map((areaKey) => (
                  <SelectItem key={areaKey} value={areaKey}>
                    {areaKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Number (Auto-generated) */}
          <div>
            <Label>Job Number</Label>
            <Input value={jobNumber} disabled />
          </div>

          {/* Equipment Detail */}
          <div className="md:col-span-2">
            <Label>Equipment Detail</Label>
            <Textarea
              placeholder="e.g., Atlas Copco GA37 - Repair and quote"
              value={equipmentDetail}
              onChange={(e) => setEquipmentDetail(e.target.value)}
            />
          </div>

          {/* Customer Dropdown */}
          <div>
            <Label>Customer</Label>
            <Select
              onValueChange={(id) => {
                const customer = customerList.find((c) => c.id === id);
                handleCustomerChange(customer);
              }}
              value={selectedCustomer?.id || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customerList.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cash Customer Name */}
          <div>
            <Label>Cash Customer Name</Label>
            <Input
              placeholder="e.g., Engen Coedmore"
              value={cashCustomer}
              onChange={(e) => setCashCustomer(e.target.value)}
              disabled={selectedCustomer?.name !== 'Cash Sale'}
            />
          </div>

          {/* Quote Amount */}
          <div>
            <Label>Quote Amount (R)</Label>
            <Input
              type="number"
              placeholder="e.g., 15000"
              value={quoteAmount}
              onChange={(e) => setQuoteAmount(e.target.value)}
            />
          </div>
          {/* PO Date */}
          <div>
            <Label>PO Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {poDate ? format(poDate, 'yyyy/MM/dd') : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={poDate} onSelect={setPoDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Quote Date */}
          <div>
            <Label>Quote Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {quoteDate ? format(quoteDate, 'yyyy/MM/dd') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={quoteDate} onSelect={setQuoteDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Delivery Date */}
          <div>
            <Label>Delivery Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {deliveryDate ? format(deliveryDate, 'yyyy/MM/dd') : <span>Select date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={deliveryDate} onSelect={setDeliveryDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <Select onValueChange={setStatus} value={status}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {jobStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
          <Button
            onClick={async () => {
              const { error } = await supabase.from('workshop_jobs').insert({
                area,
                job_number: jobNumber,
                equipment_detail: equipmentDetail,
                quote_amount: quoteAmount === '' ? null : parseFloat(quoteAmount),
                quote_date: quoteDate,
                po_date: poDate,
                delivery_date: deliveryDate,
                status,
                notes,
                customer_id_int: selectedCustomer?.id || null,
                cash_customer_name: selectedCustomer?.name === 'Cash Sales' ? cashCustomer : null,
                user_id: user.id, // ✅ Fixed from created_by to user_id
              });


              if (error) {
                toast({
                  title: 'Failed to add job',
                  description: error.message,
                  variant: 'destructive',
                });
              } else {
                toast({
                  title: 'Success',
                  description: 'Workshop job added successfully',
                });
                if (onSuccess) onSuccess();
                navigate('/workshop-jobs/view');
              }
            }}
          >
            Submit
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AddWorkshopJobPage;
