import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, FileDown, TableIcon, BarChartIcon } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Tooltip,
  Cell,
} from "recharts";
import { supabase } from "@/lib/customSupabaseClient";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectItem,
  SelectContent,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import AddCostingPage from "@/pages/AddCostingPage";
import MultiSelect from "@/components/ui/multi-select.jsx";
import { downloadAsCsv, downloadAsPdf } from "@/lib/exportUtils";

const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  value,
  name,
}) => {
  if (percent < 0.005) return null;

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
      fontSize={11}
    >
      {`${name}: ${(percent * 100).toFixed(0)}% (R ${Number(value).toLocaleString(
        "en-ZA",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )})`}
    </text>
  );
};

const CostingReports = () => {
  const [openChartModal, setOpenChartModal] = useState(false);
  const COLORS = ["#4285F4", "#FBBC05", "#00C49F", "#9C27B0", "#03A9F4", "#8BC34A", "#FF7043", "#9575CD", "#4DB6AC", "#FFCA28"];

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

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [isRepDialogOpen, setIsRepDialogOpen] = useState(false);
  const [selectedRep, setSelectedRep] = useState(null);
  const [isBranchDetailDialogOpen, setIsBranchDetailDialogOpen] = useState(false);
  const [selectedBranchDetails, setSelectedBranchDetails] = useState(null);

  // -------- Data fetch
  const fetchData = async () => {
    const { data, error } = await supabase
      .from("costing_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setAllEntries(data);
    else console.error("Error fetching costing data", error);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // -------- Report list
  const reportTypes = [
    { value: "summary_by_rep", label: "Summary by Rep" },
    { value: "summary_by_customer", label: "Summary by Customer" },
    { value: "summary_by_job_type", label: "Summary by Job Type" },
    { value: "comprehensive_summary", label: "Comprehensive Summary by Rep" },
    { value: "profit_by_item", label: "Profit by Item" },
    { value: "detailed_entries", label: "Detailed Costing Entries" },
  ];

  // -------- Filter dropdown options
  const repOptions = useMemo(() => {
    const unique = [...new Set(allEntries.map((e) => e.rep))];
    return unique.map((v) => ({ label: v, value: v }));
  }, [allEntries]);

  const customerOptions = useMemo(() => {
    const unique = [...new Set(allEntries.map((e) => e.customer))];
    return unique.map((v) => ({ label: v, value: v }));
  }, [allEntries]);

  const jobDescriptionOptions = useMemo(() => {
    const unique = [...new Set(allEntries.map((e) => e.job_description))];
    return unique.map((v) => ({ label: v, value: v }));
  }, [allEntries]);

  const expenseItemOptions = useMemo(() => {
    const names = allEntries.flatMap((e) => e.expense_items?.map((i) => i.name) || []);
    const unique = [...new Set(names)];
    return unique.map((v) => ({ label: v, value: v }));
  }, [allEntries]);

  // -------- Apply filters to data
  const filteredData = useMemo(() => {
    return allEntries.filter((entry) => {
      const inDateRange =
        (!dateRange?.from || new Date(entry.date) >= new Date(dateRange.from)) &&
        (!dateRange?.to || new Date(entry.date) <= new Date(dateRange.to));

      const inMarginRange =
        parseFloat(entry.margin || 0) >= marginRange[0] &&
        parseFloat(entry.margin || 0) <= marginRange[1];

      const jobMatch =
        jobNumberFilter === "" ||
        entry.job_number?.toLowerCase().includes(jobNumberFilter.toLowerCase());

      const repMatch = selectedReps.length === 0 || selectedReps.includes(entry.rep);
      const customerMatch =
        selectedCustomers.length === 0 || selectedCustomers.includes(entry.customer);
      const jobDescMatch =
        selectedJobDescriptions.length === 0 ||
        selectedJobDescriptions.includes(entry.job_description);

      const expenseItemMatch =
        selectedExpenseItems.length === 0 ||
        entry.expense_items?.some((i) => selectedExpenseItems.includes(i.name));

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
    selectedExpenseItems,
  ]);

  const getMarginColor = (margin) => {
    if (margin >= 60) return "text-green-600";
    if (margin >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const groupAndSummarize = (key) => {
    const groupMap = {};
    filteredData.forEach((entry) => {
      const groupKey = entry[key] || "Unknown";
      if (!groupMap[groupKey]) groupMap[groupKey] = { sales: 0, expenses: 0, profit: 0 };
      groupMap[groupKey].sales += parseFloat(entry.total_customer || 0);
      groupMap[groupKey].expenses += parseFloat(entry.total_expenses || 0);
      groupMap[groupKey].profit += parseFloat(entry.profit || 0);
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

  // -------- Build processed data
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

    if (selectedReport === "summary_by_job_type") {
      const data = groupAndSummarize("job_description");

      const totals = filteredData.reduce(
        (acc, e) => {
          const s = Number(e.total_customer || 0);
          const c = Number(e.total_expenses || 0);
          const p = Number(e.profit || 0);
          acc.sales += s;
          acc.expenses += c;
          acc.profit += p;
          if (s > 0) {
            acc.marginSum += (p / s) * 100;
            acc.marginCount += 1;
          }
          return acc;
        },
        { sales: 0, expenses: 0, profit: 0, marginSum: 0, marginCount: 0 }
      );

      const avgMargin =
        totals.marginCount > 0 ? Number((totals.marginSum / totals.marginCount).toFixed(2)) : 0;

      return {
        headers: [
          { key: "group", label: "Job Type" },
          { key: "sales", label: "Sales (R)" },
          { key: "expenses", label: "Cost (R)" },
          { key: "profit", label: "Profit (R)" },
          { key: "margin", label: "Profit %" },
        ],
        data,
        graphNameKey: "group",
        totals: {
          sales: totals.sales,
          expenses: totals.expenses,
          profit: totals.profit,
          avgMargin,
        },
      };
    }

    if (selectedReport === "comprehensive_summary") {
      const branchMap = {};
      
      filteredData.forEach((entry) => {
        const branch = entry.rep || "Unknown";
        
        if (!branchMap[branch]) {
          branchMap[branch] = {
            branch_code: branch,
            air_audit: 0,
            annual_service: 0,
            break_down: 0,
            call_out: 0,
            collection_delivery: 0,
            defect: 0,
            installation: 0,
            labour: 0,
            major_repair: 0,
            major_service: 0,
            minor_service: 0,
            new_equipment: 0,
            other: 0,
            pressure_test: 0,
            refurb: 0,
            rental: 0,
            sla_aotf: 0,
            supply: 0,
            trans_port: 0,
            total: 0,
          };
        }

        const jobType = (entry.job_description || "other").toLowerCase().replace(/\s+/g, "_");
        
        // FIXED: Use total_customer (SALES) instead of total_expenses (costs)
        const sales = parseFloat(entry.total_customer || 0);

        const categoryMapping = {
          "air_audit": "air_audit",
          "annual_service": "annual_service",
          "break_down": "break_down",
          "breakdown": "break_down",
          "call_out": "call_out",
          "callout": "call_out",
          "collection": "collection_delivery",
          "delivery": "collection_delivery",
          "collection/delivery": "collection_delivery",
          "defect": "defect",
          "installation": "installation",
          "instal": "installation",
          "labour": "labour",
          "labor": "labour",
          "major_repair": "major_repair",
          "major_service": "major_service",
          "minor_service": "minor_service",
          "new_equipment": "new_equipment",
          "new": "new_equipment",
          "pressure_test": "pressure_test",
          "refurb": "refurb",
          "refurbish": "refurb",
          "rental": "rental",
          "sla": "sla_aotf",
          "aotf": "sla_aotf",
          "sla/aotf": "sla_aotf",
          "supply": "supply",
          "transport": "trans_port",
          "trans_port": "trans_port",
        };

        const category = categoryMapping[jobType] || "other";
        branchMap[branch][category] += sales;
        branchMap[branch].total += sales;
      });

      const data = Object.values(branchMap);
      const totals = {
        branch_code: "TOTAL",
        air_audit: 0,
        annual_service: 0,
        break_down: 0,
        call_out: 0,
        collection_delivery: 0,
        defect: 0,
        installation: 0,
        labour: 0,
        major_repair: 0,
        major_service: 0,
        minor_service: 0,
        new_equipment: 0,
        other: 0,
        pressure_test: 0,
        refurb: 0,
        rental: 0,
        sla_aotf: 0,
        supply: 0,
        trans_port: 0,
        total: 0,
      };

      data.forEach((row) => {
        Object.keys(totals).forEach((key) => {
          if (key !== "branch_code") totals[key] += row[key];
        });
      });

      return {
        headers: [
          { key: "branch_code", label: "Rep" },
          { key: "air_audit", label: "Air Audit" },
          { key: "annual_service", label: "Annual Service" },
          { key: "break_down", label: "Break Down" },
          { key: "call_out", label: "Call Out" },
          { key: "collection_delivery", label: "Collection/Delivery" },
          { key: "defect", label: "Defect" },
          { key: "installation", label: "Installation" },
          { key: "labour", label: "Labour" },
          { key: "major_repair", label: "Major Repair" },
          { key: "major_service", label: "Major Service" },
          { key: "minor_service", label: "Minor Service" },
          { key: "new_equipment", label: "New Equipment" },
          { key: "other", label: "Other" },
          { key: "pressure_test", label: "Pressure Test" },
          { key: "refurb", label: "Refurb" },
          { key: "rental", label: "Rental" },
          { key: "sla_aotf", label: "SLA/AOTF" },
          { key: "supply", label: "Supply" },
          { key: "trans_port", label: "Transport" },
          { key: "total", label: "TOTAL" },
        ],
        data: [...data, totals],
        graphNameKey: "branch_code",
        totals,
      };
    }

    if (selectedReport === "profit_by_item") {
      const itemMap = {};
      filteredData.forEach((entry) => {
        (entry.expense_items || []).forEach((item) => {
          if (!itemMap[item.name]) itemMap[item.name] = 0;
          itemMap[item.name] += parseFloat(item.value || 0);
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

  const companyTotals = useMemo(() => {
    const totals = filteredData.reduce(
      (acc, entry) => {
        const s = parseFloat(entry.total_customer || 0);
        const c = parseFloat(entry.total_expenses || 0);
        const p = parseFloat(entry.profit || 0);
        acc.sales += s;
        acc.cost += c;
        acc.profit += p;
        if (s > 0) {
          acc.marginSum += (p / s) * 100;
          acc.marginCount += 1;
        }
        return acc;
      },
      { sales: 0, cost: 0, profit: 0, marginSum: 0, marginCount: 0 }
    );

    return {
      sales: totals.sales,
      cost: totals.cost,
      profit: totals.profit,
      margin: totals.marginCount > 0 ? parseFloat((totals.marginSum / totals.marginCount).toFixed(2)) : 0,
    };
  }, [filteredData]);

  const repBreakdown = useMemo(() => {
    if (!selectedRep) return null;
    const repEntries = filteredData.filter((e) => e.rep === selectedRep);
    const sales = repEntries.reduce((acc, e) => acc + Number(e.total_customer || 0), 0);
    const expenses = repEntries.reduce((acc, e) => acc + Number(e.total_expenses || 0), 0);
    const profit = repEntries.reduce((acc, e) => acc + Number(e.profit || 0), 0);
    return [
      { name: "Sales", value: sales },
      { name: "Cost", value: expenses },
      { name: "Profit", value: profit },
    ];
  }, [filteredData, selectedRep]);

  // Add function to get branch transaction details
  const getBranchDetails = (branchCode) => {
    const branchEntries = filteredData.filter((e) => (e.rep || "Unknown") === branchCode);
    
    return branchEntries.map(entry => ({
      date: entry.date,
      job_number: entry.job_number,
      customer: entry.customer,
      job_description: entry.job_description,
      total_expenses: parseFloat(entry.total_expenses || 0),
      total_customer: parseFloat(entry.total_customer || 0),
      profit: parseFloat(entry.profit || 0),
      margin: parseFloat(entry.margin || 0),
    }));
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Reports</CardTitle>
          <CardDescription>
            Use the filters below to refine your report.
          </CardDescription>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger>
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rep_asc">Rep Code A-Z</SelectItem>
              <SelectItem value="rep_desc">Rep Code Z-A</SelectItem>
              <SelectItem value="profit_asc">Profit (Lowest First)</SelectItem>
              <SelectItem value="profit_desc">Profit (Highest First)</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger>
              <SelectValue placeholder="Select a report type" />
            </SelectTrigger>
            <SelectContent>
              {reportTypes.map((report) => (
                <SelectItem key={report.value} value={report.value}>
                  {report.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Filter by Job Number..."
            value={jobNumberFilter}
            onChange={(e) => setJobNumberFilter(e.target.value)}
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    `${format(dateRange.from, "LLL dd, y")} - ${format(
                      dateRange.to,
                      "LLL dd, y"
                    )}`
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
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

          <div className="space-y-2 lg:col-span-1">
            <Label>
              Filter by Margin (%): {marginRange[0]}% - {marginRange[1]}%
            </Label>
            <Slider
              value={marginRange}
              onValueChange={setMarginRange}
              min={0}
              max={100}
              step={1}
            />
          </div>

          <MultiSelect
            options={repOptions}
            selected={selectedReps}
            onChange={setSelectedReps}
            placeholder="Filter by Rep..."
          />
          <MultiSelect
            options={customerOptions}
            selected={selectedCustomers}
            onChange={setSelectedCustomers}
            placeholder="Filter by Customer..."
          />
          <MultiSelect
            options={jobDescriptionOptions}
            selected={selectedJobDescriptions}
            onChange={setSelectedJobDescriptions}
            placeholder="Filter by Job Type..."
          />
          <MultiSelect
            options={expenseItemOptions}
            selected={selectedExpenseItems}
            onChange={setSelectedExpenseItems}
            placeholder="Filter by Expense Item..."
          />
        </div>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>
                  {
                    reportTypes.find((rt) => rt.value === selectedReport)
                      ?.label
                  }
                </CardTitle>
                <CardDescription>Viewing as {viewMode}</CardDescription>
              </div>

              <div className="flex space-x-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  onClick={() => setViewMode("table")}
                >
                  <TableIcon className="w-4 h-4 mr-2" />
                  Table
                </Button>
                <Button
                  variant={viewMode === "graph" ? "default" : "outline"}
                  onClick={() => setOpenChartModal(true)}
                >
                  <BarChartIcon className="w-4 h-4 mr-2" />
                  Graph
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!processedData || processedData.data.length === 0) {
                      alert("No data available to export to PDF.");
                      return;
                    }

                    const title =
                      reportTypes.find((r) => r.value === selectedReport)?.label || "Report";

                    const headers = processedData.headers.map((h) => h.label);
                    const dataRows = processedData.data.map((row) =>
                      processedData.headers.map((h) => row[h.key])
                    );

                    downloadAsPdf(title, headers, dataRows);
                  }}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  PDF
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    if (!processedData || processedData.data.length === 0) {
                      alert("No data available to export to CSV.");
                      return;
                    }

                    try {
                      const title = reportTypes.find((r) => r.value === selectedReport)?.label || "Report";
                      const headers = processedData.headers.map((h) => h.label);
                      const dataRows = processedData.data.map((row) =>
                        processedData.headers.map((h) => {
                          const value = row[h.key];
                          if (value === null || value === undefined) return '';
                          if (typeof value === 'number') return value.toFixed(2);
                          return String(value);
                        })
                      );

                      downloadAsCsv(title, headers, dataRows);
                    } catch (error) {
                      console.error('Export error:', error);
                      alert(`There was a problem generating the CSV file: ${error.message}`);
                    }
                  }}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </div>
            </div>

            {selectedReport === "detailed_entries" && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Sales (R)
                  </Label>
                  <div className="text-base font-medium">
                    {new Intl.NumberFormat("en-ZA", {
                      style: "currency",
                      currency: "ZAR",
                    }).format(companyTotals.sales)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Cost (R)
                  </Label>
                  <div className="text-base font-medium">
                    {new Intl.NumberFormat("en-ZA", {
                      style: "currency",
                      currency: "ZAR",
                    }).format(companyTotals.cost)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Profit (R)
                  </Label>
                  <div className="text-base font-medium">
                    {new Intl.NumberFormat("en-ZA", {
                      style: "currency",
                      currency: "ZAR",
                    }).format(companyTotals.profit)}
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Profit %
                  </Label>
                  <div
                    className={`text-base font-medium ${getMarginColor(
                      companyTotals.margin
                    )}`}
                  >
                    {companyTotals.margin.toFixed(2)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === "table" && (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {processedData.headers.map((h) => (
                      <TableHead 
                        key={h.key}
                        className={h.key === "total" ? "font-bold bg-muted" : ""}
                      >
                        {h.label}
                      </TableHead>
                    ))}
                    {(selectedReport === "summary_by_rep" ||
                      selectedReport === "detailed_entries" ||
                      selectedReport === "comprehensive_summary") && (
                      <TableHead className="text-right table-head-bold">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {processedData.data.map((row, index) => {
                    const isTotalsRow = selectedReport === "comprehensive_summary" && row.branch_code === "TOTAL";
                    
                    return (
                      <TableRow 
                        key={index}
                        className={isTotalsRow ? "font-bold bg-muted" : ""}
                      >
                        {processedData.headers.map((h) => (
                          <TableCell
                            key={h.key}
                            className={cn(
                              h.key === "margin" && getMarginColor(parseFloat(row[h.key])),
                              h.key === "total" && "font-bold"
                            )}
                          >
                            {selectedReport === "comprehensive_summary" && h.key !== "branch_code"
                              ? new Intl.NumberFormat("en-ZA", {
                                  style: "currency",
                                  currency: "ZAR",
                                }).format(row[h.key])
                              : ["sales", "expenses", "total_customer", "total_expenses", "profit"].includes(h.key)
                              ? new Intl.NumberFormat("en-ZA", {
                                  style: "currency",
                                  currency: "ZAR",
                                }).format(row[h.key])
                              : h.key === "margin"
                              ? `${parseFloat(row[h.key]).toFixed(2)}%`
                              : row[h.key]}
                          </TableCell>
                        ))}

                        {selectedReport === "summary_by_rep" && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRep(row.group);
                                setIsRepDialogOpen(true);
                              }}
                            >
                              View Breakdown
                            </Button>
                          </TableCell>
                        )}

                        {selectedReport === "comprehensive_summary" && !isTotalsRow && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const details = getBranchDetails(row.branch_code);
                                setSelectedBranchDetails({
                                  branchCode: row.branch_code,
                                  transactions: details
                                });
                                setIsBranchDetailDialogOpen(true);
                              }}
                            >
                              View Details
                            </Button>
                          </TableCell>
                        )}

                        {selectedReport === "detailed_entries" && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                let { data, error } = await supabase
                                  .from("costing_entries")
                                  .select("*")
                                  .eq("id", row.id)
                                  .single();

                                if (error || !data) {
                                  const res = await supabase
                                    .from("costing_entries")
                                    .select("*")
                                    .eq("job_number", row.job_number)
                                    .single();
                                  data = res.data;
                                  error = res.error;
                                }

                                if (error || !data) {
                                  console.error("Error fetching full entry:", error);
                                  return;
                                }

                                setSelectedEntry(data);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}

                  {selectedReport === "summary_by_job_type" &&
                    processedData.totals && (
                      <TableRow>
                        <TableCell className="font-semibold">Totals</TableCell>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat("en-ZA", {
                            style: "currency",
                            currency: "ZAR",
                          }).format(processedData.totals.sales)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat("en-ZA", {
                            style: "currency",
                            currency: "ZAR",
                          }).format(processedData.totals.expenses)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {new Intl.NumberFormat("en-ZA", {
                            style: "currency",
                            currency: "ZAR",
                          }).format(processedData.totals.profit)}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {processedData.totals.avgMargin.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    )}
                </TableBody>
              </Table>
            </div>
          )}

          {viewMode === "graph" && processedData.data.length > 0 && (
            <div className="h-[400px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={
                      selectedReport === "summary_by_rep"
                        ? repBreakdown || []
                        : processedData.data
                    }
                    dataKey={
                      selectedReport === "summary_by_rep" ? "value" : "profit"
                    }
                    nameKey={
                      selectedReport === "summary_by_rep"
                        ? "name"
                        : processedData.graphNameKey
                    }
                    outerRadius={100}
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {processedData.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      `R ${parseFloat(value).toLocaleString()}`
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>Edit Costing Entry</DialogTitle>
            <DialogDescription>
              Make changes to the costing entry below.
            </DialogDescription>
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

      <Dialog open={isRepDialogOpen} onOpenChange={setIsRepDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rep Summary: {selectedRep}</DialogTitle>
            <DialogDescription>
              Breakdown of sales, costs, and profit for this rep.
            </DialogDescription>
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
                <Tooltip
                  formatter={(value) =>
                    `R ${parseFloat(value).toLocaleString()}`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={openChartModal} onOpenChange={setOpenChartModal}>
        <DialogContent className="max-w-screen-lg h-[95vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Chart - {reportTypes.find(r => r.value === selectedReport)?.label}
            </DialogTitle>
            <DialogDescription>
              Visual representation of the {reportTypes.find(r => r.value === selectedReport)?.label.toLowerCase()} data.
            </DialogDescription>
          </DialogHeader>
          <div className="w-full h-[85vh]">
            {processedData.data.length === 0 ? (
              <p className="text-center mt-10 text-muted-foreground">No data to display in chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedData.data}
                    dataKey="profit"
                    nameKey={processedData.graphNameKey}
                    outerRadius={230}
                    label={renderCustomLabel}
                    labelLine={true}
                    paddingAngle={2}
                  >
                    {processedData.data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `R ${parseFloat(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Branch Details Dialog */}
      <Dialog open={isBranchDetailDialogOpen} onOpenChange={setIsBranchDetailDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              Transaction Details: {selectedBranchDetails?.branchCode}
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of all transactions for this branch.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedBranchDetails?.transactions.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Job #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Job Type</TableHead>
                      <TableHead className="text-right">Sales (R)</TableHead>
                      <TableHead className="text-right">Cost (R)</TableHead>
                      <TableHead className="text-right">Profit (R)</TableHead>
                      <TableHead className="text-right">Margin %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedBranchDetails.transactions.map((txn, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{txn.date}</TableCell>
                        <TableCell>{txn.job_number}</TableCell>
                        <TableCell>{txn.customer}</TableCell>
                        <TableCell>{txn.job_description}</TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(txn.total_customer)}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(txn.total_expenses)}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(txn.profit)}
                        </TableCell>
                        <TableCell className={cn("text-right", getMarginColor(txn.margin))}>
                          {txn.margin.toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-semibold bg-muted">
                      <TableCell colSpan={4}>Totals</TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
                          selectedBranchDetails.transactions.reduce((sum, txn) => sum + txn.total_customer, 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
                          selectedBranchDetails.transactions.reduce((sum, txn) => sum + txn.total_expenses, 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
                          selectedBranchDetails.transactions.reduce((sum, txn) => sum + txn.profit, 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(
                          (selectedBranchDetails.transactions.reduce(
                            (sum, txn) => sum + txn.profit,
                            0
                          ) /
                          selectedBranchDetails.transactions.reduce(
                            (sum, txn) => sum + txn.total_customer,
                            0
                          )) * 100
                        ).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">No transactions found for this branch.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CostingReports;
