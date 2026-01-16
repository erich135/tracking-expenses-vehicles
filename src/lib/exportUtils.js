import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { formatDateLocal } from './utils';

const DEFAULT_CHART_COLORS = [
  '#4285F4', '#FBBC05', '#34A853', '#EA4335', '#9C27B0', '#03A9F4', '#8BC34A',
  '#FF7043', '#9575CD', '#4DB6AC', '#FFCA28', '#E91E63', '#795548', '#607D8B'
];

const createPieChartPngDataUrl = async ({
  title,
  labels,
  values,
  colors = DEFAULT_CHART_COLORS,
  width = 720,
  height = 420,
}) => {
  if (typeof document === 'undefined') {
    throw new Error('Chart export is only supported in the browser');
  }

  const Chart = (await import('chart.js/auto')).default;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to create canvas context for chart export');
  }

  const chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: labels.map((_, idx) => colors[idx % colors.length]),
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        title: {
          display: Boolean(title),
          text: title || '',
          font: { size: 16, weight: 'bold' },
        },
        legend: {
          position: 'right',
          labels: { boxWidth: 12 },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || '';
              const val = Number(ctx.parsed || 0);
              return `${label}: ${val.toLocaleString('en-ZA', { style: 'currency', currency: 'ZAR' })}`;
            },
          },
        },
      },
    },
  });

  chart.update();
  await new Promise((r) => setTimeout(r, 0));
  const dataUrl = canvas.toDataURL('image/png');
  chart.destroy();
  return dataUrl;
};

/**
 * Download data as CSV file
 * @param {string} filename - Name of the file (without extension)
 * @param {string[]} headers - Array of column headers
 * @param {any[][]} data - 2D array of data rows
 */
export const downloadAsCsv = (filename, headers, data) => {
  try {
    // Create CSV content
    const csvRows = [headers.join(',')];

    data.forEach((row) => {
      const values = row.map((value) => {
        // Handle null/undefined
        if (value === null || value === undefined) {
          return '';
        }

        // Convert to string
        const stringValue = String(value);

        // Escape commas, quotes, and newlines
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }

        return stringValue;
      });

      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename.replace(/\s+/g, '_')}_${formatDateLocal(new Date())}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('CSV Export error:', error);
    throw new Error(`Failed to export CSV: ${error.message}`);
  }
};

/**
 * Download data as PDF file
 * @param {string} title - Title of the PDF document
 * @param {string[]} headers - Array of column headers
 * @param {any[][]} data - 2D array of data rows
 */
export const downloadAsPdf = (title, headers, data) => {
  try {
    const doc = new jsPDF('l', 'mm', 'a4'); // landscape, millimeters, A4 size

    // Add title
    doc.setFontSize(16);
    doc.text(title, 14, 15);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-ZA')}`, 14, 22);

    // Format data for PDF
    const formattedData = data.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return '';
        if (typeof cell === 'number') return cell.toFixed(2);
        return String(cell);
      })
    );

    // Generate table
    doc.autoTable({
      head: [headers],
      body: formattedData,
      startY: 28,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 133, 244],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { top: 28, left: 14, right: 14 },
    });

    // Save the PDF
    doc.save(`${title.replace(/\s+/g, '_')}_${formatDateLocal(new Date())}.pdf`);
  } catch (error) {
    console.error('PDF Export error:', error);
    throw new Error(`Failed to export PDF: ${error.message}`);
  }
};

/**
 * Generate monthly costing report as Excel file with professional formatting and charts
 * @param {Array} costingData - Array of costing entries
 * @param {Date} fromDate - Start date for the report
 * @param {Date} toDate - End date for the report
 * @param {string} monthName - Optional month name for the filename (e.g., "October")
 */
export const generateMonthlyReport = async (costingData, fromDate, toDate, monthName = null) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FleetFlow';
    workbook.created = new Date();
    
    const reportDate = formatDateLocal(new Date());
    const month = monthName || new Date(fromDate).toLocaleDateString('en-US', { month: 'long' });
    const year = new Date(fromDate).getFullYear();

    // Color palette for charts and styling
    const colors = {
      primary: '4285F4',
      secondary: '34A853',
      warning: 'FBBC05',
      danger: 'EA4335',
      purple: '9C27B0',
      teal: '00BCD4',
      orange: 'FF9800',
      indigo: '3F51B5',
      pink: 'E91E63',
      cyan: '00BCD4',
      headerBg: '1F4E79',
      headerText: 'FFFFFF',
      totalRowBg: 'D9E2F3',
      alternateBg: 'F2F2F2'
    };

    const pieColors = ['4285F4', 'FBBC05', '00C49F', '9C27B0', '03A9F4', '8BC34A', 'FF7043', '9575CD', '4DB6AC', 'FFCA28', 'E91E63', '795548'];

    // Currency format for South African Rand
    const currencyFormat = 'R#,##0.00';
    const percentFormat = '0.00%';

    // ============= Prepare Data =============
    const jobTypeSummary = {};
    costingData.forEach(entry => {
      const jobType = entry.job_description || 'Other';
      if (!jobTypeSummary[jobType]) {
        jobTypeSummary[jobType] = { sales: 0, cost: 0, profit: 0 };
      }
      jobTypeSummary[jobType].sales += parseFloat(entry.total_customer || 0);
      jobTypeSummary[jobType].cost += parseFloat(entry.total_cost || 0);
      jobTypeSummary[jobType].profit += parseFloat(entry.profit || 0);
    });

    const allJobTypes = [...new Set(costingData.map(e => e.job_description || 'Other'))].sort();
    const allReps = [...new Set(costingData.map(e => e.rep || 'Unknown'))].sort();

    // ============= Sheet 1: Summary by Job Type =============
    const ws1 = workbook.addWorksheet(`Summary_by_Job_Type_${reportDate}`);
    
    // Title row
    ws1.mergeCells('A1:E1');
    const titleCell1 = ws1.getCell('A1');
    titleCell1.value = `Summary by Job Type - ${month} ${year}`;
    titleCell1.font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    titleCell1.alignment = { horizontal: 'center' };
    
    // Header row
    ws1.getRow(3).values = ['Job Type', 'Sales (R)', 'Cost (R)', 'Profit (R)', 'Profit %'];
    ws1.getRow(3).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
      cell.font = { bold: true, color: { argb: colors.headerText } };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    let rowIndex = 4;
    const jobTypeEntries = Object.entries(jobTypeSummary).sort((a, b) => b[1].sales - a[1].sales);
    
    jobTypeEntries.forEach(([jobType, values], idx) => {
      const profitPercent = values.sales > 0 ? values.profit / values.sales : 0;
      const row = ws1.getRow(rowIndex);
      row.values = [jobType, values.sales, values.cost, values.profit, profitPercent];
      
      // Alternate row coloring
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        });
      }
      
      // Format cells
      row.getCell(2).numFmt = currencyFormat;
      row.getCell(3).numFmt = currencyFormat;
      row.getCell(4).numFmt = currencyFormat;
      row.getCell(5).numFmt = percentFormat;
      
      // Color profit % based on value
      const profitCell = row.getCell(5);
      if (profitPercent < 0.30) {
        profitCell.font = { bold: true, color: { argb: colors.danger } };
      } else if (profitPercent < 0.40) {
        profitCell.font = { bold: true, color: { argb: 'DAA520' } };
      } else {
        profitCell.font = { bold: true, color: { argb: colors.secondary } };
      }
      
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      
      rowIndex++;
    });

    // Totals row
    const totalSales = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.sales, 0);
    const totalCost = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.cost, 0);
    const totalProfit = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.profit, 0);
    const totalProfitPercent = totalSales > 0 ? totalProfit / totalSales : 0;
    
    const totalsRow1 = ws1.getRow(rowIndex);
    totalsRow1.values = ['TOTAL', totalSales, totalCost, totalProfit, totalProfitPercent];
    totalsRow1.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalRowBg } };
      cell.font = { bold: true };
      cell.border = {
        top: { style: 'medium' }, bottom: { style: 'medium' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    totalsRow1.getCell(2).numFmt = currencyFormat;
    totalsRow1.getCell(3).numFmt = currencyFormat;
    totalsRow1.getCell(4).numFmt = currencyFormat;
    totalsRow1.getCell(5).numFmt = percentFormat;

    // Set column widths
    ws1.columns = [
      { width: 25 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }
    ];

    // Add Pie Chart for Job Type Distribution
    // ExcelJS doesn't have native chart support, but we can add the data for Excel to create charts

    // ============= Sheet 2: Costing Pivot =============
    const ws2 = workbook.addWorksheet('Costing');
    
    // Title
    ws2.mergeCells(1, 1, 1, allJobTypes.length + 2);
    const titleCell2 = ws2.getCell('A1');
    titleCell2.value = `Sales by Rep & Job Type - ${month} ${year}`;
    titleCell2.font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    titleCell2.alignment = { horizontal: 'center' };

    // Headers
    const pivotHeaders = ['Rep', ...allJobTypes, 'TOTAL'];
    ws2.getRow(3).values = pivotHeaders;
    ws2.getRow(3).eachCell((cell, colNumber) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
      cell.font = { bold: true, color: { argb: colors.headerText }, size: 9 };
      cell.alignment = { horizontal: 'center', textRotation: colNumber > 1 && colNumber <= allJobTypes.length + 1 ? 45 : 0 };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });

    rowIndex = 4;
    allReps.forEach((rep, idx) => {
      const rowData = [rep];
      let repTotal = 0;
      
      allJobTypes.forEach(jobType => {
        const sales = costingData
          .filter(e => (e.rep || 'Unknown') === rep && (e.job_description || 'Other') === jobType)
          .reduce((sum, e) => sum + parseFloat(e.total_customer || 0), 0);
        rowData.push(sales);
        repTotal += sales;
      });
      rowData.push(repTotal);
      
      const row = ws2.getRow(rowIndex);
      row.values = rowData;
      
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        });
      }
      
      // Format currency cells
      for (let i = 2; i <= rowData.length; i++) {
        row.getCell(i).numFmt = currencyFormat;
        row.getCell(i).alignment = { horizontal: 'right' };
      }
      
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' }
        };
      });
      
      // Highlight TOTAL column
      row.getCell(rowData.length).font = { bold: true };
      row.getCell(rowData.length).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } };
      
      rowIndex++;
    });

    // Totals row for pivot
    const pivotTotalsRow = ['TOTAL'];
    let grandTotal = 0;
    allJobTypes.forEach(jobType => {
      const jobTypeTotal = costingData
        .filter(e => (e.job_description || 'Other') === jobType)
        .reduce((sum, e) => sum + parseFloat(e.total_customer || 0), 0);
      pivotTotalsRow.push(jobTypeTotal);
      grandTotal += jobTypeTotal;
    });
    pivotTotalsRow.push(grandTotal);
    
    const pivotTotals = ws2.getRow(rowIndex);
    pivotTotals.values = pivotTotalsRow;
    pivotTotals.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalRowBg } };
      cell.font = { bold: true };
      cell.border = {
        top: { style: 'medium' }, bottom: { style: 'medium' },
        left: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    for (let i = 2; i <= pivotTotalsRow.length; i++) {
      pivotTotals.getCell(i).numFmt = currencyFormat;
    }

    // Set column widths for pivot
    ws2.columns = [{ width: 10 }, ...allJobTypes.map(() => ({ width: 14 })), { width: 16 }];

    // ============= Sheet 3: Sales Area Pie Data =============
    const ws3 = workbook.addWorksheet('Sales Area Pie');
    
    ws3.mergeCells('A1:D1');
    ws3.getCell('A1').value = `Sales by Rep - ${month} ${year}`;
    ws3.getCell('A1').font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    ws3.getCell('A1').alignment = { horizontal: 'center' };
    
    ws3.getRow(3).values = ['Rep', 'Total Sales', 'Percentage', 'Color'];
    ws3.getRow(3).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
      cell.font = { bold: true, color: { argb: colors.headerText } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    rowIndex = 4;
    const repSales = allReps.map(rep => ({
      rep,
      total: costingData.filter(e => (e.rep || 'Unknown') === rep).reduce((sum, e) => sum + parseFloat(e.total_customer || 0), 0)
    })).filter(r => r.total > 0).sort((a, b) => b.total - a.total);

    const totalRepSales = repSales.reduce((sum, r) => sum + r.total, 0);
    
    repSales.forEach((item, idx) => {
      const row = ws3.getRow(rowIndex);
      const percentage = totalRepSales > 0 ? item.total / totalRepSales : 0;
      const color = pieColors[idx % pieColors.length];
      
      row.values = [item.rep, item.total, percentage, ''];
      row.getCell(2).numFmt = currencyFormat;
      row.getCell(3).numFmt = percentFormat;
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
      
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      if (idx % 2 === 1) {
        for (let i = 1; i <= 3; i++) {
          row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        }
      }
      
      rowIndex++;
    });

    // Add total
    const salesTotalRow = ws3.getRow(rowIndex);
    salesTotalRow.values = ['TOTAL', totalRepSales, 1, ''];
    salesTotalRow.getCell(2).numFmt = currencyFormat;
    salesTotalRow.getCell(3).numFmt = percentFormat;
    salesTotalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalRowBg } };
      cell.font = { bold: true };
      cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    ws3.columns = [{ width: 12 }, { width: 18 }, { width: 14 }, { width: 10 }];

    // ============= Sheet 4: Comp Pie (Job Type) =============
    const ws4 = workbook.addWorksheet('Comp Pie');
    
    ws4.mergeCells('A1:D1');
    ws4.getCell('A1').value = `Sales by Job Type - ${month} ${year}`;
    ws4.getCell('A1').font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    ws4.getCell('A1').alignment = { horizontal: 'center' };
    
    ws4.getRow(3).values = ['Job Type', 'Sales', 'Percentage', 'Color'];
    ws4.getRow(3).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
      cell.font = { bold: true, color: { argb: colors.headerText } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    rowIndex = 4;
    jobTypeEntries.forEach(([jobType, values], idx) => {
      if (values.sales > 0) {
        const row = ws4.getRow(rowIndex);
        const percentage = totalSales > 0 ? values.sales / totalSales : 0;
        const color = pieColors[idx % pieColors.length];
        
        row.values = [jobType, values.sales, percentage, ''];
        row.getCell(2).numFmt = currencyFormat;
        row.getCell(3).numFmt = percentFormat;
        row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        
        row.eachCell((cell) => {
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        });
        
        if (idx % 2 === 1) {
          for (let i = 1; i <= 3; i++) {
            row.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
          }
        }
        
        rowIndex++;
      }
    });

    const compTotalRow = ws4.getRow(rowIndex);
    compTotalRow.values = ['TOTAL', totalSales, 1, ''];
    compTotalRow.getCell(2).numFmt = currencyFormat;
    compTotalRow.getCell(3).numFmt = percentFormat;
    compTotalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalRowBg } };
      cell.font = { bold: true };
      cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    ws4.columns = [{ width: 25 }, { width: 18 }, { width: 14 }, { width: 10 }];

    // ============= Sheet 5: Rep Performance Summary =============
    const ws5 = workbook.addWorksheet('Rep Pies');
    
    ws5.mergeCells('A1:F1');
    ws5.getCell('A1').value = `Rep Performance Summary - ${month} ${year}`;
    ws5.getCell('A1').font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    ws5.getCell('A1').alignment = { horizontal: 'center' };
    
    ws5.getRow(3).values = ['Rep', 'Sales', 'Cost', 'Profit', 'Margin %', 'Jobs'];
    ws5.getRow(3).eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
      cell.font = { bold: true, color: { argb: colors.headerText } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    rowIndex = 4;
    const repPerformance = allReps.map(rep => {
      const repEntries = costingData.filter(e => (e.rep || 'Unknown') === rep);
      return {
        rep,
        sales: repEntries.reduce((sum, e) => sum + parseFloat(e.total_customer || 0), 0),
        cost: repEntries.reduce((sum, e) => sum + parseFloat(e.total_cost || 0), 0),
        profit: repEntries.reduce((sum, e) => sum + parseFloat(e.profit || 0), 0),
        jobs: repEntries.length
      };
    }).sort((a, b) => b.sales - a.sales);

    repPerformance.forEach((item, idx) => {
      const margin = item.sales > 0 ? item.profit / item.sales : 0;
      const row = ws5.getRow(rowIndex);
      row.values = [item.rep, item.sales, item.cost, item.profit, margin, item.jobs];
      
      row.getCell(2).numFmt = currencyFormat;
      row.getCell(3).numFmt = currencyFormat;
      row.getCell(4).numFmt = currencyFormat;
      row.getCell(5).numFmt = percentFormat;
      
      // Color margin based on value
      const marginCell = row.getCell(5);
      if (margin < 0.30) {
        marginCell.font = { bold: true, color: { argb: colors.danger } };
      } else if (margin < 0.40) {
        marginCell.font = { bold: true, color: { argb: 'DAA520' } };
      } else {
        marginCell.font = { bold: true, color: { argb: colors.secondary } };
      }
      
      row.eachCell((cell) => {
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });
      
      if (idx % 2 === 1) {
        row.eachCell((cell, colNum) => {
          if (colNum !== 5) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        });
      }
      
      rowIndex++;
    });

    // Totals
    const repTotalRow = ws5.getRow(rowIndex);
    const totalRepCost = repPerformance.reduce((sum, r) => sum + r.cost, 0);
    const totalRepProfit = repPerformance.reduce((sum, r) => sum + r.profit, 0);
    const totalRepJobs = repPerformance.reduce((sum, r) => sum + r.jobs, 0);
    const totalMargin = totalRepSales > 0 ? totalRepProfit / totalRepSales : 0;
    
    repTotalRow.values = ['TOTAL', totalRepSales, totalRepCost, totalRepProfit, totalMargin, totalRepJobs];
    repTotalRow.getCell(2).numFmt = currencyFormat;
    repTotalRow.getCell(3).numFmt = currencyFormat;
    repTotalRow.getCell(4).numFmt = currencyFormat;
    repTotalRow.getCell(5).numFmt = percentFormat;
    repTotalRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalRowBg } };
      cell.font = { bold: true };
      cell.border = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });

    ws5.columns = [{ width: 12 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 8 }];

    // ============= Generate base Excel file =============
    const buffer = await workbook.xlsx.writeBuffer();
    
    // ============= Add Pie Charts using JSZip =============
    const zip = await JSZip.loadAsync(buffer);
    
    // Helper function to generate pie chart XML
    const generatePieChartXML = (chartId, title, categories, values, colors) => {
      const dataPoints = categories.map((cat, idx) => {
        const color = colors[idx % colors.length];
        return `
          <c:dPt>
            <c:idx val="${idx}"/>
            <c:bubble3D val="0"/>
            <c:spPr>
              <a:solidFill>
                <a:srgbClr val="${color}"/>
              </a:solidFill>
              <a:ln>
                <a:solidFill>
                  <a:srgbClr val="FFFFFF"/>
                </a:solidFill>
              </a:ln>
            </c:spPr>
          </c:dPt>`;
      }).join('');

      const catPts = categories.map((cat, idx) => 
        `<c:pt idx="${idx}"><c:v>${cat}</c:v></c:pt>`
      ).join('');

      const valPts = values.map((val, idx) => 
        `<c:pt idx="${idx}"><c:v>${val}</c:v></c:pt>`
      ).join('');

      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:date1904 val="0"/>
  <c:lang val="en-US"/>
  <c:roundedCorners val="0"/>
  <c:chart>
    <c:title>
      <c:tx>
        <c:rich>
          <a:bodyPr/>
          <a:lstStyle/>
          <a:p>
            <a:pPr>
              <a:defRPr sz="1400" b="1"/>
            </a:pPr>
            <a:r>
              <a:rPr lang="en-US" sz="1400" b="1"/>
              <a:t>${title}</a:t>
            </a:r>
          </a:p>
        </c:rich>
      </c:tx>
      <c:overlay val="0"/>
    </c:title>
    <c:autoTitleDeleted val="0"/>
    <c:view3D>
      <c:rotX val="30"/>
      <c:rotY val="70"/>
      <c:depthPercent val="100"/>
      <c:rAngAx val="0"/>
      <c:perspective val="30"/>
    </c:view3D>
    <c:plotArea>
      <c:layout/>
      <c:pie3DChart>
        <c:varyColors val="1"/>
        <c:ser>
          <c:idx val="0"/>
          <c:order val="0"/>
          <c:tx>
            <c:v>Sales</c:v>
          </c:tx>
          ${dataPoints}
          <c:dLbls>
            <c:showLegendKey val="0"/>
            <c:showVal val="0"/>
            <c:showCatName val="1"/>
            <c:showSerName val="0"/>
            <c:showPercent val="1"/>
            <c:showBubbleSize val="0"/>
            <c:separator>
</c:separator>
            <c:showLeaderLines val="1"/>
          </c:dLbls>
          <c:cat>
            <c:strRef>
              <c:strCache>
                <c:ptCount val="${categories.length}"/>
                ${catPts}
              </c:strCache>
            </c:strRef>
          </c:cat>
          <c:val>
            <c:numRef>
              <c:numCache>
                <c:formatCode>R#,##0.00</c:formatCode>
                <c:ptCount val="${values.length}"/>
                ${valPts}
              </c:numCache>
            </c:numRef>
          </c:val>
        </c:ser>
      </c:pie3DChart>
    </c:plotArea>
    <c:legend>
      <c:legendPos val="r"/>
      <c:overlay val="0"/>
    </c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
  <c:printSettings>
    <c:headerFooter/>
    <c:pageMargins b="0.75" l="0.7" r="0.7" t="0.75" header="0.3" footer="0.3"/>
    <c:pageSetup/>
  </c:printSettings>
</c:chartSpace>`;
    };

    // Generate drawing XML for embedding chart
    const generateDrawingXML = (chartRIds, positions) => {
      const drawings = chartRIds.map((rId, idx) => {
        const pos = positions[idx];
        return `
    <xdr:twoCellAnchor>
      <xdr:from>
        <xdr:col>${pos.fromCol}</xdr:col>
        <xdr:colOff>0</xdr:colOff>
        <xdr:row>${pos.fromRow}</xdr:row>
        <xdr:rowOff>0</xdr:rowOff>
      </xdr:from>
      <xdr:to>
        <xdr:col>${pos.toCol}</xdr:col>
        <xdr:colOff>0</xdr:colOff>
        <xdr:row>${pos.toRow}</xdr:row>
        <xdr:rowOff>0</xdr:rowOff>
      </xdr:to>
      <xdr:graphicFrame macro="">
        <xdr:nvGraphicFramePr>
          <xdr:cNvPr id="${idx + 2}" name="Chart ${idx + 1}"/>
          <xdr:cNvGraphicFramePr/>
        </xdr:nvGraphicFramePr>
        <xdr:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
        </xdr:xfrm>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
            <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${rId}"/>
          </a:graphicData>
        </a:graphic>
      </xdr:graphicFrame>
      <xdr:clientData/>
    </xdr:twoCellAnchor>`;
      }).join('');

      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
${drawings}
</xdr:wsDr>`;
    };

    // Prepare chart data
    const chartColors = ['4285F4', 'FBBC05', '34A853', '9C27B0', '03A9F4', '8BC34A', 'FF7043', '9575CD', '4DB6AC', 'FFCA28', 'E91E63', '795548', 'FF5722', '607D8B'];
    
    // Create Sales Area Pie chart data
    const salesAreaCategories = repSales.map(r => r.rep);
    const salesAreaValues = repSales.map(r => r.total);
    
    // Create Comp Pie (Job Type) chart data
    const compCategories = jobTypeEntries.filter(([, v]) => v.sales > 0).map(([k]) => k);
    const compValues = jobTypeEntries.filter(([, v]) => v.sales > 0).map(([, v]) => v.sales);

    // Create Rep Pie charts data (one for each rep showing their job type breakdown)
    const repPieCharts = [];
    allReps.forEach(rep => {
      const repJobData = {};
      costingData.filter(e => (e.rep || 'Unknown') === rep).forEach(e => {
        const jt = e.job_description || 'Other';
        repJobData[jt] = (repJobData[jt] || 0) + parseFloat(e.total_customer || 0);
      });
      
      const entries = Object.entries(repJobData).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
      if (entries.length > 0) {
        repPieCharts.push({
          rep,
          categories: entries.map(([k]) => k),
          values: entries.map(([, v]) => v)
        });
      }
    });

    // Add charts to the zip
    // Chart 1: Sales Area Pie (on Sales Area Pie sheet)
    zip.file('xl/charts/chart1.xml', generatePieChartXML(1, `Sales by Rep - ${month} ${year}`, salesAreaCategories, salesAreaValues, chartColors));
    
    // Chart 2: Comp Pie (on Comp Pie sheet)  
    zip.file('xl/charts/chart2.xml', generatePieChartXML(2, `Sales by Job Type - ${month} ${year}`, compCategories, compValues, chartColors));

    // Charts for each rep
    repPieCharts.forEach((chart, idx) => {
      zip.file(`xl/charts/chart${idx + 3}.xml`, generatePieChartXML(idx + 3, chart.rep, chart.categories, chart.values, chartColors));
    });

    // Update [Content_Types].xml to include charts
    let contentTypes = await zip.file('[Content_Types].xml').async('string');
    const chartOverrides = [
      '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>',
      '<Override PartName="/xl/charts/chart2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>',
      ...repPieCharts.map((_, idx) => 
        `<Override PartName="/xl/charts/chart${idx + 3}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`
      ),
      '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>',
      '<Override PartName="/xl/drawings/drawing2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>',
      '<Override PartName="/xl/drawings/drawing3.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
    ].join('\n');
    
    contentTypes = contentTypes.replace('</Types>', chartOverrides + '\n</Types>');
    zip.file('[Content_Types].xml', contentTypes);

    // Create drawing files for sheets with charts
    // Drawing 1 for Sales Area Pie sheet (sheet 3)
    zip.file('xl/drawings/drawing1.xml', generateDrawingXML(['rId1'], [{ fromCol: 5, fromRow: 2, toCol: 15, toRow: 22 }]));
    
    // Drawing 2 for Comp Pie sheet (sheet 4)
    zip.file('xl/drawings/drawing2.xml', generateDrawingXML(['rId1'], [{ fromCol: 5, fromRow: 2, toCol: 15, toRow: 22 }]));
    
    // Drawing 3 for Rep Pies sheet (sheet 5) - multiple charts in grid
    const repChartPositions = repPieCharts.map((_, idx) => {
      const row = Math.floor(idx / 3);
      const col = idx % 3;
      return {
        fromCol: col * 8,
        fromRow: row * 15 + 2,
        toCol: col * 8 + 7,
        toRow: row * 15 + 16
      };
    });
    const repChartRIds = repPieCharts.map((_, idx) => `rId${idx + 1}`);
    zip.file('xl/drawings/drawing3.xml', generateDrawingXML(repChartRIds, repChartPositions));

    // Create drawing rels files
    zip.file('xl/drawings/_rels/drawing1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`);

    zip.file('xl/drawings/_rels/drawing2.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart2.xml"/>
</Relationships>`);

    const repDrawingRels = repPieCharts.map((_, idx) => 
      `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${idx + 3}.xml"/>`
    ).join('\n');
    zip.file('xl/drawings/_rels/drawing3.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${repDrawingRels}
</Relationships>`);

    // Update worksheet rels to reference drawings
    // Sheet 3 (Sales Area Pie) - need to find the right sheet file
    const sheet3Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
    zip.file('xl/worksheets/_rels/sheet3.xml.rels', sheet3Rels);

    const sheet4Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing2.xml"/>
</Relationships>`;
    zip.file('xl/worksheets/_rels/sheet4.xml.rels', sheet4Rels);

    const sheet5Rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing3.xml"/>
</Relationships>`;
    zip.file('xl/worksheets/_rels/sheet5.xml.rels', sheet5Rels);

    // Update the worksheet XML files to reference the drawings
    for (let sheetNum = 3; sheetNum <= 5; sheetNum++) {
      let sheetXml = await zip.file(`xl/worksheets/sheet${sheetNum}.xml`).async('string');
      if (!sheetXml.includes('<drawing')) {
        // Insert drawing reference before </worksheet>
        sheetXml = sheetXml.replace('</worksheet>', '<drawing r:id="rId1"/></worksheet>');
        // Ensure namespace is present
        if (!sheetXml.includes('xmlns:r=')) {
          sheetXml = sheetXml.replace('<worksheet', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"');
        }
        zip.file(`xl/worksheets/sheet${sheetNum}.xml`, sheetXml);
      }
    }

    // Generate final blob
    const finalBuffer = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(finalBuffer);
    const link = document.createElement('a');
    const fileName = `${month}_reports_${year}.xlsx`;
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return { success: true, fileName };
  } catch (error) {
    console.error('Excel Export error:', error);
    throw new Error(`Failed to generate monthly report: ${error.message}`);
  }
};

/**
 * Generate comprehensive monthly report with 6 tabs for all data types (Costing, Rental, SLA)
 * @param {Object} params - Parameters object
 * @param {Array} params.costingData - Costing entries
 * @param {Array} params.rentalData - Rental income entries
 * @param {Array} params.slaData - SLA income entries
 * @param {string} params.month - Month name (e.g., "December")
 * @param {number} params.year - Year (e.g., 2025)
 * @param {Array} params.selectedJobTypes - Filtered job types
 */
export const generateComprehensiveMonthlyReport = async ({
  costingData,
  rentalData,
  slaData,
  month,
  year,
  selectedJobTypes = []
}) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'FleetFlow';
    workbook.created = new Date();

    // Color palette
    const colors = {
      primary: '4285F4',
      secondary: '34A853',
      warning: 'FBBC05',
      danger: 'EA4335',
      headerBg: '1F4E79',
      headerText: 'FFFFFF',
      totalRowBg: 'D9E2F3',
      alternateBg: 'F2F2F2'
    };

    const currencyFormat = 'R#,##0.00';
    const percentFormat = '0.00%';

    // Merge all data sources
    const allEntriesRaw = [
      ...costingData.map(e => ({
        ...e,
        source: 'Costing',
        sales: parseFloat(e.total_customer || 0),
        cost: parseFloat(e.total_expenses || 0),
        profit: parseFloat(e.profit || 0),
        job_type: e.job_description || 'Other',
        rep: e.rep || 'Unknown',
        customer: e.customer || '-',
        job_number: e.job_number || '-',
        invoice_number: e.invoice_number || '-',
        date: e.date || '',
      })),
      ...rentalData.map(e => ({
        ...e,
        source: 'Rental',
        sales: parseFloat(e.amount || 0),
        cost: 0,
        profit: parseFloat(e.amount || 0),
        job_type: 'Rental',
        rep: e.rep || 'SLA/Rental',
        customer: e.equipment_name || '-',
        job_number: '-',
        invoice_number: e.invoice_number || '-',
        date: e.date || '',
      })),
      ...slaData.map(e => ({
        ...e,
        source: 'SLA',
        sales: parseFloat(e.amount || 0),
        cost: 0,
        profit: parseFloat(e.amount || 0),
        job_type: 'SLA',
        rep: e.rep || 'SLA/Rental',
        customer: e.unit_name || '-',
        job_number: '-',
        invoice_number: e.invoice_number || '-',
        date: e.date || '',
      })),
    ];

    // Filter by selected job types if provided
    const allEntries = selectedJobTypes.length > 0
      ? allEntriesRaw.filter(e => selectedJobTypes.includes(e.job_type))
      : allEntriesRaw;

    // Calculate summaries
    const jobTypeSummary = {};
    allEntries.forEach(entry => {
      const jobType = entry.job_type || 'Other';
      if (!jobTypeSummary[jobType]) {
        jobTypeSummary[jobType] = { sales: 0, cost: 0, profit: 0, count: 0 };
      }
      jobTypeSummary[jobType].sales += entry.sales;
      jobTypeSummary[jobType].cost += entry.cost;
      jobTypeSummary[jobType].profit += entry.profit;
      jobTypeSummary[jobType].count += 1;
    });

    const repSummary = {};
    allEntries.forEach(entry => {
      const rep = entry.rep || 'Unknown';
      if (!repSummary[rep]) {
        repSummary[rep] = { sales: 0, cost: 0, profit: 0, count: 0, jobTypes: {} };
      }
      repSummary[rep].sales += entry.sales;
      repSummary[rep].cost += entry.cost;
      repSummary[rep].profit += entry.profit;
      repSummary[rep].count += 1;
      const jt = entry.job_type || 'Other';
      repSummary[rep].jobTypes[jt] = (repSummary[rep].jobTypes[jt] || 0) + entry.sales;
    });

    const totalSales = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.sales, 0);
    const totalCost = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.cost, 0);
    const totalProfit = Object.values(jobTypeSummary).reduce((sum, v) => sum + v.profit, 0);

    // Helper function to style header row
    const styleHeaderRow = (row) => {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
        cell.font = { bold: true, color: { argb: colors.headerText } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    };

    const styleTotalRow = (row) => {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.totalRowBg } };
        cell.font = { bold: true };
        cell.border = {
          top: { style: 'medium' },
          bottom: { style: 'medium' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    };

    // ============= Sheet 1: Cover Page =============
    const ws1 = workbook.addWorksheet('Cover');
    ws1.mergeCells('A2:E6');
    const coverTitle = ws1.getCell('A2');
    coverTitle.value = `Monthly Costing Report\n${month} ${year}`;
    coverTitle.font = { size: 24, bold: true, color: { argb: colors.primary } };
    coverTitle.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    ws1.mergeCells('A8:E9');
    const coverSystem = ws1.getCell('A8');
    coverSystem.value = 'FleetFlow Management System';
    coverSystem.font = { size: 14, italic: true };
    coverSystem.alignment = { horizontal: 'center', vertical: 'middle' };

    ws1.mergeCells('A11:B11');
    ws1.getCell('A11').value = 'Total Sales:';
    ws1.getCell('A11').font = { bold: true };
    ws1.getCell('C11').value = totalSales;
    ws1.getCell('C11').numFmt = currencyFormat;
    ws1.getCell('C11').font = { bold: true, color: { argb: colors.primary } };

    ws1.mergeCells('A12:B12');
    ws1.getCell('A12').value = 'Total Cost:';
    ws1.getCell('A12').font = { bold: true };
    ws1.getCell('C12').value = totalCost;
    ws1.getCell('C12').numFmt = currencyFormat;
    ws1.getCell('C12').font = { bold: true, color: { argb: colors.danger } };

    ws1.mergeCells('A13:B13');
    ws1.getCell('A13').value = 'Total Profit:';
    ws1.getCell('A13').font = { bold: true };
    ws1.getCell('C13').value = totalProfit;
    ws1.getCell('C13').numFmt = currencyFormat;
    ws1.getCell('C13').font = { bold: true, color: { argb: colors.secondary } };

    ws1.mergeCells('A14:B14');
    ws1.getCell('A14').value = 'Overall Margin:';
    ws1.getCell('A14').font = { bold: true };
    const overallMargin = totalSales > 0 ? totalProfit / totalSales : 0;
    ws1.getCell('C14').value = overallMargin;
    ws1.getCell('C14').numFmt = percentFormat;
    ws1.getCell('C14').font = { bold: true };

    ws1.mergeCells('A16:B16');
    ws1.getCell('A16').value = 'Total Entries:';
    ws1.getCell('A16').font = { bold: true };
    ws1.getCell('C16').value = allEntries.length;
    ws1.getCell('C16').font = { bold: true };

    ws1.mergeCells('A18:E19');
    const generatedText = ws1.getCell('A18');
    generatedText.value = `Generated on ${new Date().toLocaleDateString('en-ZA')}\nat ${new Date().toLocaleTimeString('en-ZA')}`;
    generatedText.font = { size: 10, color: { argb: '808080' } };
    generatedText.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    ws1.columns = [{ width: 15 }, { width: 15 }, { width: 20 }, { width: 15 }, { width: 15 }];

    // ============= Sheet 2: Detailed Entries =============
    const ws2 = workbook.addWorksheet('Detailed Entries');
    ws2.mergeCells('A1:J1');
    const detailTitle = ws2.getCell('A1');
    detailTitle.value = `Detailed Entries - ${month} ${year}`;
    detailTitle.font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    detailTitle.alignment = { horizontal: 'center' };

    const detailHeaders = ['Date', 'Source', 'Rep', 'Customer', 'Job Type', 'Job #', 'Invoice #', 'Sales', 'Cost', 'Profit', 'Margin %'];
    ws2.getRow(3).values = detailHeaders;
    styleHeaderRow(ws2.getRow(3));

    let rowIdx = 4;
    allEntries.forEach((entry, idx) => {
      const margin = entry.sales > 0 ? (entry.profit / entry.sales) * 100 : 0;
      const row = ws2.getRow(rowIdx);
      row.values = [
        entry.date ? new Date(entry.date) : '',
        entry.source,
        entry.rep,
        entry.customer,
        entry.job_type,
        entry.job_number,
        entry.invoice_number,
        entry.sales,
        entry.cost,
        entry.profit,
        margin / 100
      ];

      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        });
      }

      row.getCell(1).numFmt = 'yyyy-mm-dd';
      row.getCell(8).numFmt = currencyFormat;
      row.getCell(9).numFmt = currencyFormat;
      row.getCell(10).numFmt = currencyFormat;
      row.getCell(11).numFmt = percentFormat;

      // Color margin
      const marginCell = row.getCell(11);
      if (margin <= 30) {
        marginCell.font = { bold: true, color: { argb: colors.danger } };
      } else if (margin < 40) {
        marginCell.font = { bold: true, color: { argb: 'DAA520' } };
      } else {
        marginCell.font = { bold: true, color: { argb: colors.secondary } };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      rowIdx++;
    });

    // Totals
    const detailTotal = ws2.getRow(rowIdx);
    detailTotal.values = ['', '', '', '', '', '', 'TOTAL', totalSales, totalCost, totalProfit, overallMargin];
    styleTotalRow(detailTotal);
    detailTotal.getCell(8).numFmt = currencyFormat;
    detailTotal.getCell(9).numFmt = currencyFormat;
    detailTotal.getCell(10).numFmt = currencyFormat;
    detailTotal.getCell(11).numFmt = percentFormat;

    ws2.columns = [
      { width: 12 }, { width: 10 }, { width: 12 }, { width: 20 }, { width: 15 },
      { width: 12 }, { width: 12 }, { width: 15 }, { width: 15 }, { width: 15 }, { width: 10 }
    ];

    // ============= Sheet 3: Summary by Job Type =============
    const ws3 = workbook.addWorksheet('Summary by Job Type');
    ws3.mergeCells('A1:F1');
    const summaryTitle = ws3.getCell('A1');
    summaryTitle.value = `Summary by Job Type - ${month} ${year}`;
    summaryTitle.font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    summaryTitle.alignment = { horizontal: 'center' };

    ws3.getRow(3).values = ['Job Type', 'Sales', 'Cost', 'Profit', 'Margin %', 'Count'];
    styleHeaderRow(ws3.getRow(3));

    rowIdx = 4;
    const jobTypeEntries = Object.entries(jobTypeSummary).sort((a, b) => b[1].sales - a[1].sales);

    jobTypeEntries.forEach(([jobType, values], idx) => {
      const margin = values.sales > 0 ? values.profit / values.sales : 0;
      const row = ws3.getRow(rowIdx);
      row.values = [jobType, values.sales, values.cost, values.profit, margin, values.count];

      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        });
      }

      row.getCell(2).numFmt = currencyFormat;
      row.getCell(3).numFmt = currencyFormat;
      row.getCell(4).numFmt = currencyFormat;
      row.getCell(5).numFmt = percentFormat;

      const marginCell = row.getCell(5);
      if (margin < 0.30) {
        marginCell.font = { bold: true, color: { argb: colors.danger } };
      } else if (margin < 0.40) {
        marginCell.font = { bold: true, color: { argb: 'DAA520' } };
      } else {
        marginCell.font = { bold: true, color: { argb: colors.secondary } };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      rowIdx++;
    });

    const summaryTotal = ws3.getRow(rowIdx);
    summaryTotal.values = ['TOTAL', totalSales, totalCost, totalProfit, overallMargin, allEntries.length];
    styleTotalRow(summaryTotal);
    summaryTotal.getCell(2).numFmt = currencyFormat;
    summaryTotal.getCell(3).numFmt = currencyFormat;
    summaryTotal.getCell(4).numFmt = currencyFormat;
    summaryTotal.getCell(5).numFmt = percentFormat;

    ws3.columns = [{ width: 25 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 10 }];

    // ============= Sheet 4: Sales by Rep =============
    const ws4 = workbook.addWorksheet('Sales by Rep');
    ws4.mergeCells('A1:G1');
    const repTitle = ws4.getCell('A1');
    repTitle.value = `Sales by Rep - ${month} ${year}`;
    repTitle.font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    repTitle.alignment = { horizontal: 'center' };

    ws4.getRow(3).values = ['Rep', 'Sales', 'Cost', 'Profit', 'Margin %', 'Jobs', 'Avg Job Value'];
    styleHeaderRow(ws4.getRow(3));

    rowIdx = 4;
    const repEntries = Object.entries(repSummary).sort((a, b) => b[1].sales - a[1].sales);

    repEntries.forEach(([rep, values], idx) => {
      const margin = values.sales > 0 ? values.profit / values.sales : 0;
      const avgJob = values.count > 0 ? values.sales / values.count : 0;
      const row = ws4.getRow(rowIdx);
      row.values = [rep, values.sales, values.cost, values.profit, margin, values.count, avgJob];

      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        });
      }

      row.getCell(2).numFmt = currencyFormat;
      row.getCell(3).numFmt = currencyFormat;
      row.getCell(4).numFmt = currencyFormat;
      row.getCell(5).numFmt = percentFormat;
      row.getCell(7).numFmt = currencyFormat;

      const marginCell = row.getCell(5);
      if (margin < 0.30) {
        marginCell.font = { bold: true, color: { argb: colors.danger } };
      } else if (margin < 0.40) {
        marginCell.font = { bold: true, color: { argb: 'DAA520' } };
      } else {
        marginCell.font = { bold: true, color: { argb: colors.secondary } };
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      rowIdx++;
    });

    const repTotal = ws4.getRow(rowIdx);
    const avgJobOverall = allEntries.length > 0 ? totalSales / allEntries.length : 0;
    repTotal.values = ['TOTAL', totalSales, totalCost, totalProfit, overallMargin, allEntries.length, avgJobOverall];
    styleTotalRow(repTotal);
    repTotal.getCell(2).numFmt = currencyFormat;
    repTotal.getCell(3).numFmt = currencyFormat;
    repTotal.getCell(4).numFmt = currencyFormat;
    repTotal.getCell(5).numFmt = percentFormat;
    repTotal.getCell(7).numFmt = currencyFormat;

    ws4.columns = [{ width: 15 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 8 }, { width: 15 }];

    // ============= Sheet 5: Rep Breakdown (Rep x Job Type Matrix) =============
    const ws5 = workbook.addWorksheet('Rep Breakdown');
    ws5.mergeCells('A1:H1');
    const breakdownTitle = ws5.getCell('A1');
    breakdownTitle.value = `Rep Breakdown by Job Type - ${month} ${year}`;
    breakdownTitle.font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    breakdownTitle.alignment = { horizontal: 'center' };

    const allJobTypes = [...new Set(allEntries.map(e => e.job_type))].sort();
    const breakdownHeaders = ['Rep', ...allJobTypes, 'Total'];
    ws5.getRow(3).values = breakdownHeaders;
    styleHeaderRow(ws5.getRow(3));

    rowIdx = 4;
    const allReps = Object.keys(repSummary).sort();

    allReps.forEach((rep, idx) => {
      const rowData = [rep];
      let repTotal = 0;

      allJobTypes.forEach(jobType => {
        const amount = repSummary[rep].jobTypes[jobType] || 0;
        rowData.push(amount);
        repTotal += amount;
      });
      rowData.push(repTotal);

      const row = ws5.getRow(rowIdx);
      row.values = rowData;

      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        });
      }

      for (let i = 2; i <= rowData.length; i++) {
        row.getCell(i).numFmt = currencyFormat;
        row.getCell(i).alignment = { horizontal: 'right' };
      }

      row.getCell(rowData.length).font = { bold: true };
      row.getCell(rowData.length).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E2EFDA' }
      };

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      rowIdx++;
    });

    const breakdownTotalRow = ['TOTAL'];
    let grandTotal = 0;
    allJobTypes.forEach(jobType => {
      const jobTypeTotal = jobTypeSummary[jobType]?.sales || 0;
      breakdownTotalRow.push(jobTypeTotal);
      grandTotal += jobTypeTotal;
    });
    breakdownTotalRow.push(grandTotal);

    const breakdownTotal = ws5.getRow(rowIdx);
    breakdownTotal.values = breakdownTotalRow;
    styleTotalRow(breakdownTotal);
    for (let i = 2; i <= breakdownTotalRow.length; i++) {
      breakdownTotal.getCell(i).numFmt = currencyFormat;
    }

    ws5.columns = [{ width: 15 }, ...allJobTypes.map(() => ({ width: 14 })), { width: 16 }];

    // ============= Sheet 6: Performance Comparison =============
    const ws6 = workbook.addWorksheet('Performance');
    ws6.mergeCells('A1:F1');
    const perfTitle = ws6.getCell('A1');
    perfTitle.value = `Performance Metrics - ${month} ${year}`;
    perfTitle.font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    perfTitle.alignment = { horizontal: 'center' };

    // Top performers by sales
    ws6.mergeCells('A3:F3');
    ws6.getCell('A3').value = 'Top Performers by Sales';
    ws6.getCell('A3').font = { size: 14, bold: true };
    ws6.getCell('A3').alignment = { horizontal: 'left' };

    ws6.getRow(4).values = ['Rank', 'Rep', 'Sales', 'Profit', 'Margin %', 'Jobs'];
    styleHeaderRow(ws6.getRow(4));

    rowIdx = 5;
    const topReps = repEntries.slice(0, 10);
    topReps.forEach(([rep, values], idx) => {
      const margin = values.sales > 0 ? values.profit / values.sales : 0;
      const row = ws6.getRow(rowIdx);
      row.values = [idx + 1, rep, values.sales, values.profit, margin, values.count];

      row.getCell(3).numFmt = currencyFormat;
      row.getCell(4).numFmt = currencyFormat;
      row.getCell(5).numFmt = percentFormat;

      if (idx < 3) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD700' } };
          cell.font = { bold: true };
        });
      } else if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      rowIdx++;
    });

    rowIdx += 2;

    // Top job types by profitability
    ws6.mergeCells(`A${rowIdx}:F${rowIdx}`);
    ws6.getCell(`A${rowIdx}`).value = 'Top Job Types by Profitability';
    ws6.getCell(`A${rowIdx}`).font = { size: 14, bold: true };
    ws6.getCell(`A${rowIdx}`).alignment = { horizontal: 'left' };

    rowIdx++;
    ws6.getRow(rowIdx).values = ['Rank', 'Job Type', 'Sales', 'Profit', 'Margin %', 'Count'];
    styleHeaderRow(ws6.getRow(rowIdx));

    rowIdx++;
    const topJobTypes = jobTypeEntries.slice(0, 10);
    topJobTypes.forEach(([jobType, values], idx) => {
      const margin = values.sales > 0 ? values.profit / values.sales : 0;
      const row = ws6.getRow(rowIdx);
      row.values = [idx + 1, jobType, values.sales, values.profit, margin, values.count];

      row.getCell(3).numFmt = currencyFormat;
      row.getCell(4).numFmt = currencyFormat;
      row.getCell(5).numFmt = percentFormat;

      if (idx < 3) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD700' } };
          cell.font = { bold: true };
        });
      } else if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
        });
      }

      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      rowIdx++;
    });

    ws6.columns = [{ width: 8 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 10 }];

    // ============= Sheet 7: Charts (embedded images) =============
    // Note: ExcelJS doesn't create native Excel charts; we embed PNG images instead.
    const ws7 = workbook.addWorksheet('Charts');
    ws7.mergeCells('A1:K1');
    const chartsTitle = ws7.getCell('A1');
    chartsTitle.value = `Charts - ${month} ${year}`;
    chartsTitle.font = { size: 16, bold: true, color: { argb: colors.headerBg } };
    chartsTitle.alignment = { horizontal: 'center' };

    // Build chart data
    const repChartData = repEntries
      .map(([rep, values]) => ({ rep, sales: values.sales }))
      .filter((r) => r.sales > 0);

    const jobTypeChartData = jobTypeEntries
      .map(([jobType, values]) => ({ jobType, sales: values.sales }))
      .filter((j) => j.sales > 0);

    // Embed: Sales by Rep pie
    if (repChartData.length > 0) {
      const repPieUrl = await createPieChartPngDataUrl({
        title: 'Sales by Rep',
        labels: repChartData.map((r) => r.rep),
        values: repChartData.map((r) => r.sales),
      });
      const repImgId = workbook.addImage({ base64: repPieUrl, extension: 'png' });
      ws7.addImage(repImgId, {
        tl: { col: 0, row: 2 },
        ext: { width: 520, height: 320 },
      });
    }

    // Embed: Sales by Job Type pie
    if (jobTypeChartData.length > 0) {
      const jtPieUrl = await createPieChartPngDataUrl({
        title: 'Sales by Job Type',
        labels: jobTypeChartData.map((j) => j.jobType),
        values: jobTypeChartData.map((j) => j.sales),
      });
      const jtImgId = workbook.addImage({ base64: jtPieUrl, extension: 'png' });
      ws7.addImage(jtImgId, {
        tl: { col: 7, row: 2 },
        ext: { width: 520, height: 320 },
      });
    }

    // Embed: Rep breakdown pies (up to 15 reps by sales)
    const topRepBreakdowns = repEntries
      .slice(0, 15)
      .map(([rep, values]) => ({ rep, jobTypes: values.jobTypes || {} }))
      .filter((r) => Object.keys(r.jobTypes).length > 0);

    // Layout grid: 3 across
    const repTileCols = 5;
    const repTileRows = 22;
    for (let i = 0; i < topRepBreakdowns.length; i++) {
      const item = topRepBreakdowns[i];
      const entries = Object.entries(item.jobTypes)
        .map(([k, v]) => ({ k, v: Number(v || 0) }))
        .filter((e) => e.v > 0)
        .sort((a, b) => b.v - a.v);

      if (entries.length === 0) continue;

      const repBreakdownUrl = await createPieChartPngDataUrl({
        title: item.rep,
        labels: entries.map((e) => e.k),
        values: entries.map((e) => e.v),
        width: 520,
        height: 340,
      });
      const imgId = workbook.addImage({ base64: repBreakdownUrl, extension: 'png' });

      const gridRow = Math.floor(i / 3);
      const gridCol = i % 3;
      const tileStartCol = gridCol * repTileCols;
      const tileStartRow = 20 + gridRow * repTileRows;
      ws7.addImage(imgId, {
        tl: { col: tileStartCol, row: tileStartRow },
        ext: { width: 360, height: 240 },
      });

      // Table under the chart: top job types + (optional) Other
      const total = entries.reduce((sum, e) => sum + e.v, 0);
      const topN = 5;
      const topEntries = entries.slice(0, topN);
      const otherSum = entries.slice(topN).reduce((sum, e) => sum + e.v, 0);

      const tableRows = [
        ...topEntries,
        ...(otherSum > 0 ? [{ k: 'Other', v: otherSum }] : []),
      ];

      const tableStart = tileStartRow + 16;

      // Rep label
      ws7.getCell(tableStart, tileStartCol + 1).value = item.rep;
      ws7.getCell(tableStart, tileStartCol + 1).font = { bold: true };

      // Header
      const headerRow = ws7.getRow(tableStart + 1);
      headerRow.getCell(tileStartCol + 1).value = 'Job Type';
      headerRow.getCell(tileStartCol + 2).value = 'Sales';
      headerRow.getCell(tileStartCol + 3).value = '%';
      [tileStartCol + 1, tileStartCol + 2, tileStartCol + 3].forEach((col) => {
        const cell = headerRow.getCell(col);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.headerBg } };
        cell.font = { bold: true, color: { argb: colors.headerText }, size: 9 };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      // Body
      for (let r = 0; r < Math.min(tableRows.length, 6); r++) {
        const row = ws7.getRow(tableStart + 2 + r);
        const entry = tableRows[r];
        row.getCell(tileStartCol + 1).value = entry.k;
        row.getCell(tileStartCol + 2).value = entry.v;
        row.getCell(tileStartCol + 3).value = total > 0 ? entry.v / total : 0;

        row.getCell(tileStartCol + 2).numFmt = currencyFormat;
        row.getCell(tileStartCol + 3).numFmt = percentFormat;
        [tileStartCol + 1, tileStartCol + 2, tileStartCol + 3].forEach((col) => {
          const cell = row.getCell(col);
          if (r % 2 === 1) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.alternateBg } };
          }
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' },
          };
        });
        row.getCell(tileStartCol + 1).alignment = { horizontal: 'left' };
        row.getCell(tileStartCol + 2).alignment = { horizontal: 'right' };
        row.getCell(tileStartCol + 3).alignment = { horizontal: 'right' };
      }
    }

    ws7.columns = Array.from({ length: 12 }).map(() => ({ width: 12 }));

    // Generate and download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `${month}_${year}_Monthly_Report.xlsx`;
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true, fileName };
  } catch (error) {
    console.error('Comprehensive Excel Export error:', error);
    throw new Error(`Failed to generate comprehensive monthly report: ${error.message}`);
  }
};
