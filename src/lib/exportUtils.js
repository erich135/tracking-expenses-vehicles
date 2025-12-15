import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';

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
    link.setAttribute('download', `${filename.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
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
    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
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
    
    const reportDate = new Date().toISOString().split('T')[0];
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
