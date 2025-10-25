import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

/**
 * Downloads tabular data as a PDF file.
 *
 * @param {string} title - The title of the PDF document and filename.
 * @param {Array} headers - An array of header objects with a 'label' property.
 * @param {Array} data - A 2D array representing table rows.
 */
export const downloadAsPdf = (title, headers, data) => {
  if (!Array.isArray(data) || data.length === 0) {
    console.error('PDF Export failed: data is invalid or empty:', data);
    alert('No data available to export to PDF.');
    return;
  }

  const doc = new jsPDF();
  doc.text(title, 14, 16);
  doc.autoTable({
    head: [headers.map(h => h.label)],
    body: data,
    startY: 20,
  });
  doc.save(`${title}.pdf`);
};

/**
 * Downloads tabular data as a CSV file.
 *
 * @param {string} filename - The desired filename for the CSV.
 * @param {Array} data - The data to convert and download.
 */
export const downloadAsCsv = (filename, data) => {
  if (!Array.isArray(data) || data.length === 0) {
    console.error('CSV Export failed: data is invalid or empty:', data);
    alert('No data available to export to CSV.');
    return;
  }

  let csv;
  try {
    csv = Papa.unparse(data);
  } catch (err) {
    console.error('CSV export failed during parsing:', err, data);
    alert('There was a problem generating the CSV file.');
    return;
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Add this function before the return statement

const handleCsvExport = () => {
  if (!processedData || processedData.data.length === 0) {
    alert("No data available to export to CSV.");
    return;
  }

  try {
    const title = reportTypes.find((r) => r.value === selectedReport)?.label || "Report";
    const headers = processedData.headers.map((h) => h.label);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...processedData.data.map(row =>
        processedData.headers.map(h => {
          const value = row[h.key];
          if (selectedReport === "comprehensive_summary" && h.key !== "branch_code") {
            return typeof value === 'number' ? value.toFixed(2) : '0.00';
          }
          return typeof value === 'number' ? value.toString() : (value || '');
        }).join(',')
      )
    ].join('\n');

    // Download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Export error:', error);
    alert("There was a problem generating the CSV file. Please try again.");
  }
};

// ...existing code...

// Replace the CSV button onClick with:
onClick={handleCsvExport}

// ...existing code...
