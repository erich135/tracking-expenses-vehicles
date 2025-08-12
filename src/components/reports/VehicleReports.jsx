import React, { useState, useEffect, useCallback, useMemo } from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
    import { Button } from '@/components/ui/button';
    import { useToast } from '@/components/ui/use-toast';
    import { supabase } from '@/lib/customSupabaseClient';
    import { downloadAsPdf, downloadAsCsv } from '@/lib/exportUtils';
    import { FileDown, Calendar as CalendarIcon } from 'lucide-react';
    import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
    import { Calendar } from '@/components/ui/calendar';
    import { format, subDays } from 'date-fns';
    import { cn } from '@/lib/utils';
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
    import { MultiSelect } from '@/components/ui/multi-select';

    const reportTypes = [
        { value: 'detailed_expenses', label: 'Detailed Vehicle Expenses' },
        { value: 'total_cost_per_vehicle', label: 'Summary: Total Cost per Vehicle' },
        { value: 'cost_by_category', label: 'Summary: Cost by Category' },
        { value: 'fuel_consumption', label: 'Analysis: Fuel Consumption (km/L)' },
        { value: 'cost_per_km', label: 'Analysis: Cost per Kilometer' },
    ];

    const VehicleReports = () => {
      const [allExpenses, setAllExpenses] = useState([]);
      const [vehicles, setVehicles] = useState([]);
      const [loading, setLoading] = useState(true);
      const { toast } = useToast();
      const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 90), to: new Date() });
      const [selectedReport, setSelectedReport] = useState('detailed_expenses');
      const [selectedVehicleIds, setSelectedVehicleIds] = useState([]);
      const [selectedCategories, setSelectedCategories] = useState([]);

      const vehicleOptions = useMemo(() => vehicles.map(v => ({ value: v.id, label: v.name })), [vehicles]);
      const categoryOptions = useMemo(() => [...new Set(allExpenses.map(e => e.category))]
        .map(c => ({ value: c, label: c })), [allExpenses]);

      const fetchData = useCallback(async () => {
        setLoading(true);
        const [expensesRes, vehiclesRes] = await Promise.all([
          supabase.from('vehicle_expenses').select('*, vehicles(name)'),
          supabase.from('vehicles').select('id, name, odometer')
        ]);

        if (expensesRes.error) {
          toast({ variant: 'destructive', title: 'Error fetching expenses', description: expensesRes.error.message });
        } else {
          setAllExpenses(expensesRes.data);
        }

        if (vehiclesRes.error) {
          toast({ variant: 'destructive', title: 'Error fetching vehicles', description: vehiclesRes.error.message });
        } else {
          setVehicles(vehiclesRes.data);
        }
        setLoading(false);
      }, [toast]);

      useEffect(() => {
        fetchData();
      }, [fetchData]);

      const filteredData = useMemo(() => {
        return allExpenses.filter(entry => {
            const entryDate = new Date(entry.date);
            const inDateRange = (!dateRange.from || entryDate >= dateRange.from) && (!dateRange.to || entryDate <= dateRange.to);
            const isVehicleSelected = selectedVehicleIds.length === 0 || selectedVehicleIds.includes(entry.vehicle_id);
            const isCategorySelected = selectedCategories.length === 0 || selectedCategories.includes(entry.category);
            return inDateRange && isVehicleSelected && isCategorySelected;
        });
      }, [allExpenses, dateRange, selectedVehicleIds, selectedCategories]);

      const processedData = useMemo(() => {
        let data = [];
        let headers = [];

        const getSummary = (key, valueKey, dataSrc, keyMap = {}) => {
            const summary = {};
            dataSrc.forEach(entry => {
                const groupKey = keyMap[entry[key]] || entry[key] || `Unknown`;
                summary[groupKey] = (summary[groupKey] || 0) + Number(entry[valueKey] || 0);
            });
            return Object.entries(summary).map(([group, value]) => ({ group, value: value.toFixed(2) }));
        };
        
        const vehicleNameMap = vehicles.reduce((acc, v) => ({...acc, [v.id]: v.name }), {});

        switch (selectedReport) {
            case 'total_cost_per_vehicle': {
                data = getSummary('vehicle_id', 'amount', filteredData, vehicleNameMap);
                headers = [{ key: 'group', label: 'Vehicle' }, { key: 'value', label: 'Total Cost (R)' }];
                break;
            }
            case 'cost_by_category': {
                data = getSummary('category', 'amount', filteredData);
                headers = [{ key: 'group', label: 'Category' }, { key: 'value', label: 'Total Cost (R)' }];
                break;
            }
            case 'fuel_consumption':
            case 'cost_per_km': {
                const analysisByVehicle = {};
                const relevantVehicles = selectedVehicleIds.length > 0
                    ? vehicles.filter(v => selectedVehicleIds.includes(v.id))
                    : vehicles;

                relevantVehicles.forEach(vehicle => {
                    const vehicleExpenses = filteredData
                        .filter(e => e.vehicle_id === vehicle.id)
                        .sort((a, b) => new Date(a.date) - new Date(b.date) || a.odometer - b.odometer);
                    
                    const fuelAndOdoExpenses = vehicleExpenses
                        .filter(e => e.odometer)
                        .sort((a, b) => a.odometer - b.odometer);

                    let totalKm = 0;
                    let totalLitres = 0;
                    let totalCost = vehicleExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

                    if (fuelAndOdoExpenses.length > 0) {
                        const firstOdoEntry = fuelAndOdoExpenses[0];
                        const lastOdoEntry = fuelAndOdoExpenses[fuelAndOdoExpenses.length - 1];
                        totalKm = lastOdoEntry.odometer - firstOdoEntry.odometer;

                        if (totalKm > 0) {
                            totalLitres = fuelAndOdoExpenses
                                .slice(1) // Exclude the first entry's litres as it's for the previous leg
                                .filter(e => e.category === 'Fuel' && e.litres)
                                .reduce((sum, e) => sum + Number(e.litres), 0);
                        }
                    }

                    analysisByVehicle[vehicle.name] = {
                        kml: totalLitres > 0 && totalKm > 0 ? (totalKm / totalLitres).toFixed(2) : 'N/A',
                        cpk: totalKm > 0 ? (totalCost / totalKm).toFixed(2) : 'N/A'
                    };
                });
                
                if (selectedReport === 'fuel_consumption') {
                    data = Object.entries(analysisByVehicle).map(([vehicle, stats]) => ({ vehicle, kml: stats.kml }));
                    headers = [{ key: 'vehicle', label: 'Vehicle' }, { key: 'kml', label: 'Fuel Consumption (km/L)' }];
                } else {
                     data = Object.entries(analysisByVehicle).map(([vehicle, stats]) => ({ vehicle, cpk: stats.cpk }));
                     headers = [{ key: 'vehicle', label: 'Vehicle' }, { key: 'cpk', label: 'Cost Per Kilometer (R)' }];
                }
                break;
            }
            case 'detailed_expenses':
            default:
                data = filteredData.map(e => ({
                    date: format(new Date(e.date), 'yyyy-MM-dd'),
                    vehicle: e.vehicles?.name || 'Unknown',
                    category: e.category,
                    amount: Number(e.amount).toFixed(2),
                    description: e.description,
                    supplier: e.supplier,
                    odometer: e.odometer,
                }));
                headers = [
                    { key: 'date', label: 'Date' },
                    { key: 'vehicle', label: 'Vehicle' },
                    { key: 'category', label: 'Category' },
                    { key: 'amount', label: 'Amount (R)' },
                    { key: 'supplier', label: 'Supplier' },
                    { key: 'odometer', label: 'Odometer (km)' },
                    { key: 'description', label: 'Description' },
                ];
                break;
        }
        return { data, headers };
      }, [selectedReport, filteredData, vehicles, selectedVehicleIds]);

      const handleExport = (format) => {
        const title = reportTypes.find(r => r.value === selectedReport)?.label || 'Vehicle Report';
        let exportData = processedData.data;
         if (selectedReport.includes('summary') || selectedReport.includes('analysis')) {
            exportData = processedData.data.map(d => ({ [processedData.headers[0].label]: d.group || d.vehicle, [processedData.headers[1].label]: d.value || d.kml || d.cpk }));
        }
        if (format === 'pdf') {
           downloadAsPdf(title, processedData.headers, processedData.data.map(item => processedData.headers.map(h => item[h.key] ?? item['group'] ?? item['vehicle'] ?? item['kml'] ?? item['cpk'])));
        } else if (format === 'csv') {
          downloadAsCsv(`${title}.csv`, exportData);
        }
      };

      return (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Report Options & Filters</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger><SelectValue placeholder="Select a report type" /></SelectTrigger>
                <SelectContent>
                  {reportTypes.map(report => (
                    <SelectItem key={report.value} value={report.value}>{report.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</> : <>{format(dateRange.from, "LLL dd, y")}</>) : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
              <div className="lg:col-span-1"><MultiSelect options={vehicleOptions} selected={selectedVehicleIds} onChange={setSelectedVehicleIds} placeholder="Filter by Vehicles..." /></div>
              <div className="lg:col-span-1"><MultiSelect options={categoryOptions} selected={selectedCategories} onChange={setSelectedCategories} placeholder="Filter by Category..." /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{reportTypes.find(r => r.value === selectedReport)?.label}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}><FileDown className="h-4 w-4 mr-2" />PDF</Button>
                <Button variant="outline" size="sm" onClick={() => handleExport('csv')}><FileDown className="h-4 w-4 mr-2" />CSV</Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (<p>Loading report...</p>) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow>{processedData.headers.map(h => <TableHead key={h.key}>{h.label}</TableHead>)}</TableRow></TableHeader>
                    <TableBody>
                      {processedData.data.length > 0 ? (
                        processedData.data.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {processedData.headers.map(header => <TableCell key={header.key}>{row[header.key] ?? row['group'] ?? row['vehicle'] ?? row['kml'] ?? row['cpk']}</TableCell>)}
                          </TableRow>
                        ))
                      ) : (<TableRow><TableCell colSpan={processedData.headers.length} className="text-center">No data for selected filters.</TableCell></TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    };

    export default VehicleReports;