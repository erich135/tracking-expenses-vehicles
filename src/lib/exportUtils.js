import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
