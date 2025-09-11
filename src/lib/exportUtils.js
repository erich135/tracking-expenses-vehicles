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
