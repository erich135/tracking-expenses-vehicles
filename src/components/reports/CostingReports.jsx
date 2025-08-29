import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, FileDown, TableIcon, BarChartIcon } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Tooltip, Cell, Legend } from "recharts";
import { supabase } from "@/lib/customSupabaseClient";

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectTrigger, SelectValue, SelectItem, SelectContent
} from "@/components/ui/select";
import {
  Popover, PopoverTrigger, PopoverContent
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import AddCostingPage from "@/pages/AddCostingPage"; // align with ViewCostingsPage import

import MultiSelect from "@/components/ui/multi-select.jsx";
import { downloadAsCsv, downloadAsPdf } from "@/lib/exportUtils";

/** Pie label with % + amount */
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#000"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}% (R ${Number(value).toLocaleString("en-ZA", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })})`}
    </text>
  );
};

const CostingReports = () => {
  const [allEntries, setAllEntries] = useState([]);
  const [selectedReport, setSelectedReport] = useState("summary_by_rep");
  const [viewMode, setViewMode] = useState("table");

  const [dateRange, setDateRange] = useState();
  const [marginRange, setMarginRange] = useState([0, 100]);
  const [selectedReps, setSelectedReps] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedJobDescriptions, setSelectedJobDescriptions] = useState([]);
  const [selectedExpenseItems, setSelectedExpenseItems] = useState([]);
  const [jobNumberFilter, setJobNumberFilter] = useState("");
  const [sortOption, setSortOption] = useState("rep_asc");

  // editing
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  // rep dialog
  const [isRepDialogOpen, setIsRepDialogOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);

  /** load all entries (latest first) */
  const fetchData = async () => {
    const { data, error } = await supabase
      .from("costing_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching costing data", error);
    } else {
      setAllEntries(data || []);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const reportTypes = [
    { value: "summary_by_rep", label: "Summary by Rep" },
    { value: "summary_by_customer", label: "Summary by Customer" },
    { value: "profit_by_item", label: "Profit by Item" },
    { value: "detailed_entries", label: "Detailed Costing Entries" },
  ];

  const repOptions = useMemo(() => {
    const unique = [...new Set(allEntries.map(e => e.rep))].filter(Boolean);
    return unique.map(v => ({ label: v, value: v }));
  }, [allEntries]);

  const customerOptions = useMemo(() => {
    const unique = [...new Set(allEntries.map(e => e.customer))].filter(Boolean);
    return unique.map(v => ({ label: v, value: v }));
  }, [allEntries]);

  const jobDescriptionOptions = useMemo(() => {
    const unique = [...new Set(allEntries.map(e => e.job_description))].filter(Boolean);
    return unique.map(v => ({ label: v, value: v }));
  }, [allEntries]);

  const expenseItemOptions = useMemo(() => {
    const names = allEntries.flatMap(e => e.expense_items?.map(i => i.name) || []);
    const unique = [...new Set(names)].filter(Boolean);
    return unique.map(v => ({ label: v, value: v }));
  }, [allEntries]);
  /** apply all filters */
  const filteredData = useMemo(() => {
    return allEntries.filter(entry => {
      const inDateRange =
        (!dateRange?.from || new Date(entry.date) >= new Date(dateRange.from)) &&
        (!dateRange?.to || new Date(entry.date) <= new Date(dateRange.to));

      const inMarginRange =
        parseFloat(entry.margin || 0) >= marginRange[0] &&
        parseFloat(entry.margin || 0) <= marginRange[1];

      const jobMatch =
        jobNumberFilter === "" ||
        entry.job_number?.toLowerCase().includes(jobNumberFilter.toLowerCase());

      const repMatch =
        selectedReps.length === 0 || selectedReps.includes(entry.rep);

      const customerMatch =
        selectedCustomers.length === 0 || selectedCustomers.includes(entry.customer);

      const jobDescMatch =
        selectedJobDescriptions.length === 0 || selectedJobDescriptions.includes(entry.job_description);

      const expenseItemMatch =
        selectedExpenseItems.length === 0 ||
        entry.expense_items?.some(i => selectedExpenseItems.includes(i.name));

      return (
        inDateRange &&
        inMarginRange &&
        jobMatch &&
        repMatch &&
        customerMatch &&
        jobDescMatch &&
        expenseItemMatch
      );
    });
  }, [
    allEntries,
    dateRange,
    marginRange,
    jobNumberFilter,
    selectedReps,
    selectedCustomers,
    selectedJobDescriptions,
    selectedExpenseItems
  ]);

  const getMarginColor = (margin) => {
    if (margin >= 60) return "text-green-600";
    if (margin >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  /** summarize by key (rep / customer) */
  const groupAndSummarize = (key) => {
    const groupMap = {};

    filteredData.forEach(entry => {
      const k = entry[key] || "Unknown";
      if (!groupMap[k]) groupMap[k] = { sales: 0, expenses: 0, profit: 0 };
      groupMap[k].sales += Number(entry.total_customer || 0);
      groupMap[k].expenses += Number(entry.total_expenses || 0);
      groupMap[k].profit += Number(entry.profit || 0);
    });

    return Object.entries(groupMap).map(([group, values]) => {
      const { sales, expenses, profit } = values;
      const margin = sales ? ((profit / sales) * 100).toFixed(2) : "0.00";
      return {
        group,
        sales: Number(sales.toFixed(2)),
        expenses: Number(expenses.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        margin: Number(margin),
      };
    });
  };

  /** dataset for the selected report */
  const processedData = useMemo(() => {
    if (selectedReport === "summary_by_rep") {
      let data = groupAndSummarize("rep");

      if (sortOption === "rep_asc") data.sort((a, b) => a.group.localeCompare(b.group));
      else if (sortOption === "rep_desc") data.sort((a, b) => b.group.localeCompare(a.group));
      else if (sortOption === "profit_asc") data.sort((a, b) => a.profit - b.profit);
      else if (sortOption === "profit_desc") data.sort((a, b) => b.profit - a.profit);

      return {
        headers: [
          { key: "group", label: "Rep" },
          { key: "sales", label: "Sales (R)" },
          { key: "expenses", label: "Cost (R)" },
          { key: "profit", label: "Profit (R)" },
          { key: "margin", label: "Profit %" },
        ],
        data,
        graphNameKey: "group",
      };
    }

    if (selectedReport === "summary_by_customer") {
      return {
        headers: [
          { key: "group", label: "Customer" },
          { key: "sales", label: "Sales (R)" },
          { key: "expenses", label: "Cost (R)" },
          { key: "profit", label: "Profit (R)" },
          { key: "margin", label: "Profit %" },
        ],
        data: groupAndSummarize("customer"),
        graphNameKey: "group",
      };
    }

    if (selectedReport === "profit_by_item") {
      const itemMap = {};
      filteredData.forEach(entry => {
        (entry.expense_items || []).forEach(item => {
          itemMap[item.name] = (itemMap[item.name] || 0) + Number(item.value || 0);
        });
      });

      const data = Object.entries(itemMap).map(([name, value]) => ({
        group: name,
        profit: Number(value.toFixed(2)),
      }));

      return {
        headers: [
          { key: "group", label: "Expense Item" },
          { key: "profit", label: "Amount (R)" },
        ],
        data,
        graphNameKey: "group",
      };
    }

    // Default: detailed entries
    return {
      headers: [
        { key: "date", label: "Date" },
        { key: "rep", label: "Rep" },
        { key: "customer", label: "Customer" },
        { key: "job_number", label: "Job #" },
        { key: "job_description", label: "Job Type" },
        { key: "total_customer", label: "Sales (R)" },
        { key: "total_expenses", label: "Cost (R)" },
        { key: "profit", label: "Profit (R)" },
        { key: "margin", label: "Profit %" },
      ],
      data: filteredData,
      graphNameKey: "job_number",
    };
  }, [filteredData, selectedReport, sortOption]);

  /** breakdown for rep dialog */
  const repBreakdown = useMemo(() => {
    if (!selectedRep) return null;
    const repEntries = filteredData.filter(e => e.rep === selectedRep);

    const sales = repEntries.reduce((acc, e) => acc + Number(e.total_customer || 0), 0);
    const expenses = repEntries.reduce((acc, e) => acc + Number(e.total_expenses || 0), 0);
    const profit = repEntries.reduce((acc, e) => acc + Number(e.profit || 0), 0);

    return [
      { name: "Sales", value: sales },
      { name: "Cost", value: expenses },
      { name: "Profit", value: profit },
    ];
  }, [filteredData, selectedRep]);
  return (
    <div className="p-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>Use the filters below to refine your report.</CardDescription>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Sort (used by Summary by Rep) */}
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger><SelectValue placeholder="Sort by" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="rep_asc">Rep Code A-Z</SelectItem>
              <SelectItem value="rep_desc">Rep Code Z-A</SelectItem>
              <SelectItem value="profit_asc">Profit (Lowest First)</SelectItem>
              <SelectItem value="profit_desc">Profit (Highest First)</SelectItem>
            </SelectContent>
          </Select>

          {/* Report type */}
          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger><SelectValue placeholder="Select a report type" /></SelectTrigger>
            <SelectContent>
              {reportTypes.map(r => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Job number filter */}
          <Input
            placeholder="Filter by Job Number..."
            value={jobNumberFilter}
            onChange={e => setJobNumberFilter(e.target.value)}
          />

          {/* Date range */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to
                    ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                    : format(dateRange.from, "LLL dd, y")
                ) : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {/* Margin */}
          <div className="space-y-2 lg:col-span-1">
            <Label>Filter by Margin (%): {marginRange[0]}% - {marginRange[1]}%</Label>
            <Slider value={marginRange} onValueChange={setMarginRange} min={0} max={100} step={1} />
          </div>

          {/* Multiselects */}
          <MultiSelect options={repOptions} selected={selectedReps} onChange={setSelectedReps} placeholder="Filter by Rep..." />
          <MultiSelect options={customerOptions} selected={selectedCustomers} onChange={setSelectedCustomers} placeholder="Filter by Customer..." />
          <MultiSelect options={jobDescriptionOptions} selected={selectedJobDescriptions} onChange={setSelectedJobDescriptions} placeholder="Filter by Job Type..." />
          <MultiSelect options={expenseItemOptions} selected={selectedExpenseItems} onChange={setSelectedExpenseItems} placeholder="Filter by Expense Item..." />
        </div>
      </Card>

      {/* Table / Graph */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>
            {reportTypes.find(rt => rt.value === selectedReport)?.label}
            <div className="text-sm font-normal text-muted-foreground">Viewing as {viewMode}</div>
          </CardTitle>
          <div className="flex space-x-2">
            <Button variant={viewMode === "table" ? "default" : "outline"} onClick={() => setViewMode("table")}>
              <TableIcon className="w-4 h-4 mr-2" /> Table
            </Button>
            <Button variant={viewMode === "graph" ? "default" : "outline"} onClick={() => setViewMode("graph")}>
              <BarChartIcon className="w-4 h-4 mr-2" /> Graph
            </Button>
            <Button variant="outline" onClick={() => downloadAsPdf(processedData)}>
              <FileDown className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" onClick={() => downloadAsCsv(processedData)}>
              <FileDown className="w-4 h-4 mr-2" /> CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {viewMode === "table" && (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {processedData.headers.map(h => (<TableHead key={h.key}>{h.label}</TableHead>))}
                    {(selectedReport === "summary_by_rep" || selectedReport === "detailed_entries") && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {processedData.data.map((row, index) => (
                    <TableRow key={index}>
                      {processedData.headers.map(h => (
                        <TableCell
                          key={h.key}
                          className={h.key === "margin" ? getMarginColor(Number(row[h.key])) : ""}
                        >
                          {["sales", "expenses", "total_customer", "total_expenses", "profit"].includes(h.key)
                            ? new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(row[h.key])
                            : h.key === "margin"
                              ? `${Number(row[h.key]).toFixed(2)}%`
                              : row[h.key]}
                        </TableCell>
                      ))}

                      {/* Actions */}
                      {selectedReport === "summary_by_rep" && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedRep(row.group); setIsRepDialogOpen(true); }}>
                            View Breakdown
                          </Button>
                        </TableCell>
                      )}

                      {selectedReport === "detailed_entries" && (
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedEntry(row); setIsEditDialogOpen(true); }} // same idea as ViewCostingsPage
                          >
                            Edit
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {viewMode === "graph" && processedData.data.length > 0 && (
            <div className="h-[400px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={processedData.data}
                    dataKey="profit"
                    nameKey={processedData.graphNameKey}
                    outerRadius={100}
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {processedData.data.map((_, i) => (
                      <Cell key={i} fill={["#4285F4", "#FBBC05", "#00C49F", "#9C27B0", "#03A9F4", "#8BC34A"][i % 6]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `R ${parseFloat(v).toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Edit Dialog — uses the SAME props pattern as ViewCostingsPage */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>Edit Costing Entry</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AddCostingPage
              isEditMode={true}
              costingData={selectedEntry}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                fetchData();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Rep Breakdown Dialog */}
      <Dialog open={isRepDialogOpen} onOpenChange={setIsRepDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rep Summary: {selectedRep}</DialogTitle>
          </DialogHeader>
          <div className="h-[300px] mt-4">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={repBreakdown || []}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={renderCustomLabel}
                  labelLine={false}
                >
                  <Cell fill="#4285F4" />
                  <Cell fill="#FB8C00" />
                  <Cell fill="#00C49F" />
                </Pie>
                <Tooltip formatter={(value) => `R ${parseFloat(value).toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CostingReports;
