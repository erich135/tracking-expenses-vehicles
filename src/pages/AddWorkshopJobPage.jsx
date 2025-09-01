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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const jobStatuses = [
  "Quoted/Awaiting Order", "Stripping", "Go Ahead", "Completed", "Invoiced",
  "Overdue", "PDI", "Awaiting Spares",
];

// ✅ Updated area to prefix map based on your screenshot
const areaPrefixMap = {
  CTN: "WC",
  DBN: "WD",
  JHB: "WJ",
  LDB: "WL",
  MDB: "WM",
  PE: "WP",
  RTB: "WU",
  NAMIBIA: "WN",
};

const AddWorkshopJobPage = ({ isEditMode = false, jobData, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    job_number: '',
    technician_id: null,
    equipment_detail: '',
    customer_id: null,
    cash_customer_name: '',
    quote_date: null,
    po_date: null,
    quote_amount: '',
    days_quoted: '',
    area: '',
    delivery_date: null,
    status: '',
    notes: '',
  });

  const resetForm = useCallback(() => {
    setFormData({
      job_number: '',
      technician_id: null,
      equipment_detail: '',
      customer_id: null,
      cash_customer_name: '',
      quote_date: null,
      po_date: null,
      quote_amount: '',
      days_quoted: '',
      area: '',
      delivery_date: null,
      status: '',
      notes: '',
    });
  }, []);
  useEffect(() => {
    if (isEditMode && jobData) {
      setFormData({
        job_number: jobData.job_number || '',
        technician_id: jobData.technician ? { id: jobData.technician_id, name: jobData.technician.name } : null,
        equipment_detail: jobData.equipment_detail || '',
        customer_id: jobData.customer ? { id: jobData.customer_id, name: jobData.customer.name } : null,
        cash_customer_name: jobData.cash_customer_name || '',
        quote_date: jobData.quote_date ? new Date(jobData.quote_date) : null,
        po_date: jobData.po_date ? new Date(jobData.po_date) : null,
        quote_amount: jobData.quote_amount || '',
        days_quoted: jobData.days_quoted || '',
        area: jobData.area || '',
        delivery_date: jobData.delivery_date ? new Date(jobData.delivery_date) : null,
        status: jobData.status || '',
        notes: jobData.notes || '',
      });
    }
  }, [isEditMode, jobData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAreaChange = async (selectedArea) => {
    setFormData((prev) => ({ ...prev, area: selectedArea }));
    if (!isEditMode) {
      const prefix = areaPrefixMap[selectedArea];
      if (!prefix) return;

      const { data, error } = await supabase
        .from('workshop_jobs')
        .select('job_number')
        .like('job_number', `${prefix}%`)
        .order('job_number', { ascending: false })
        .limit(1);

      if (error) {
        console.error("Failed to fetch job numbers:", error);
        return;
      }

      const lastJob = data?.[0]?.job_number || `${prefix}0000`;
      const lastNumber = parseInt(lastJob.replace(prefix, ''), 10);
      const newNumber = (lastNumber + 1).toString().padStart(4, '0');
      const newJobNumber = `${prefix}${newNumber}`;

      setFormData((prev) => ({
        ...prev,
        job_number: newJobNumber,
      }));
    }
  };
  return (
    <div className="p-4">
      <Card>
        <CardHeader>
          <CardTitle>{isEditMode ? "Edit Job" : "Add New Workshop Job"}</CardTitle>
        </CardHeader>

        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Area Dropdown */}
          <div>
            <Label>Area</Label>
            <Select
              onValueChange={handleAreaChange}
              value={formData.area}
              disabled={isEditMode}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an area" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(areaPrefixMap).map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Job Number */}
          <div>
            <Label>Job Number</Label>
            <Input
              name="job_number"
              value={formData.job_number}
              readOnly
              placeholder="Auto-generated after area selection"
            />
          </div>

          {/* Equipment Detail */}
          <div className="md:col-span-2">
            <Label>Equipment Detail</Label>
            <Textarea
              name="equipment_detail"
              value={formData.equipment_detail}
              onChange={handleChange}
              placeholder="e.g., Atlas Copco GA37 - Repair and quote"
            />
          </div>

          {/* Cash Customer Name */}
          <div>
            <Label>Cash Customer Name</Label>
            <Input
              name="cash_customer_name"
              value={formData.cash_customer_name}
              onChange={handleChange}
              placeholder="e.g., Engen Coedmore"
            />
          </div>

          {/* Quote Amount */}
          <div>
            <Label>Quote Amount (R)</Label>
            <Input
              name="quote_amount"
              value={formData.quote_amount}
              onChange={handleChange}
              placeholder="e.g., 15000"
            />
          </div>
          {/* Quote Date */}
          <div>
            <Label>Quote Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.quote_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.quote_date
                    ? format(formData.quote_date, "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.quote_date}
                  onSelect={(date) =>
                    setFormData((prev) => ({ ...prev, quote_date: date }))
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* PO Date */}
          <div>
            <Label>PO Date</Label>
            <Input
              type="date"
              name="po_date"
              value={
                formData.po_date
                  ? format(formData.po_date, "yyyy-MM-dd")
                  : ""
              }
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  po_date: new Date(e.target.value),
                }))
              }
            />
          </div>

          {/* Delivery Date */}
          <div>
            <Label>Delivery Date</Label>
            <Input
              type="date"
              name="delivery_date"
              value={
                formData.delivery_date
                  ? format(formData.delivery_date, "yyyy-MM-dd")
                  : ""
              }
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  delivery_date: new Date(e.target.value),
                }))
              }
            />
          </div>

          {/* Status Dropdown */}
          <div>
            <Label>Status</Label>
            <Select
              value={formData.status}
              onValueChange={(status) =>
                setFormData((prev) => ({ ...prev, status }))
              }
            >
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
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes"
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              resetForm();
              navigate(-1);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const payload = {
                ...formData,
                quote_date: formData.quote_date?.toISOString(),
                po_date: formData.po_date?.toISOString(),
                delivery_date: formData.delivery_date?.toISOString(),
                user_id: user?.id,
                technician_id: formData.technician_id?.id || null,
                customer_id: formData.customer_id?.id || null,
              };

              const { error } = isEditMode
                ? await supabase
                    .from("workshop_jobs")
                    .update(payload)
                    .eq("id", jobData.id)
                : await supabase.from("workshop_jobs").insert(payload);

              if (error) {
                toast({ title: "Error", description: error.message });
              } else {
                toast({ title: "Success", description: "Job saved successfully" });
                resetForm();
                if (onSuccess) onSuccess();
                else navigate("/workshop");
              }
            }}
          >
            {isEditMode ? "Update" : "Submit"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AddWorkshopJobPage;
