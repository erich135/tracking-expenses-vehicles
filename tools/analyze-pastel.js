import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Pastel file
const filePath = path.join(__dirname, '../SLA Incomes/NOV INV.xlsx');
const workbook = XLSX.readFile(filePath);

console.log('=== PASTEL NOV INV.xlsx ANALYSIS ===\n');

const mainSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(mainSheet, { header: 1 });

// Parse invoices and credit notes
const invoices = [];
const creditNotes = [];
let invoiceTotal = 0;
let creditNoteTotal = 0;

for (const row of data) {
  const line = String(row[0] || '');
  const amountRaw = row[1];
  
  // Skip if no valid data
  if (amountRaw === undefined || amountRaw === null || amountRaw === '') continue;
  
  // Parse amount - could be a number or a string like "R759,315.25" or "-R71,230.00"
  let amount;
  if (typeof amountRaw === 'number') {
    amount = amountRaw;
  } else {
    // String format - parse out the number
    const amtStr = String(amountRaw);
    const amountMatch = amtStr.match(/-?R?([\d,]+\.?\d*)/);
    if (!amountMatch) continue;
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
    if (amtStr.startsWith('-') || amtStr.includes('-R')) amount = -amount;
  }
  
  // Tax Invoice - more flexible regex
  if (line.includes('Tax Invoice')) {
    const invNumMatch = line.match(/IN(\d+)/);
    const custMatch = line.match(/Customer\s*:\s*(\S+)\s+(.*)/i);
    if (invNumMatch) {
      invoices.push({
        type: 'Invoice',
        number: 'IN' + invNumMatch[1],
        customerCode: custMatch ? custMatch[1] : 'UNKNOWN',
        customerName: custMatch ? custMatch[2].trim() : 'Unknown',
        amount: amount
      });
      invoiceTotal += amount;
    }
    continue;
  }
  
  // Credit Note - more flexible regex
  if (line.includes('Credit Note')) {
    const cnNumMatch = line.match(/IC(\d+)/);
    const custMatch = line.match(/Customer\s*:\s*(\S+)\s+(.*)/i);
    if (cnNumMatch) {
      creditNotes.push({
        type: 'Credit Note',
        number: 'IC' + cnNumMatch[1],
        customerCode: custMatch ? custMatch[1] : 'UNKNOWN',
        customerName: custMatch ? custMatch[2].trim() : 'Unknown',
        amount: amount
      });
      creditNoteTotal += amount;
    }
    continue;
  }
}

const netTotal = invoiceTotal + creditNoteTotal;

console.log(`Tax Invoices: ${invoices.length}`);
console.log(`Invoice Total: R ${invoiceTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
console.log(`\nCredit Notes: ${creditNotes.length}`);
console.log(`Credit Note Total: R ${creditNoteTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
console.log(`\n*** NET TOTAL (Pastel): R ${netTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ***`);

// Write parsed data to JSON for comparison
const parsedData = {
  invoices,
  creditNotes,
  summary: {
    invoiceCount: invoices.length,
    invoiceTotal,
    creditNoteCount: creditNotes.length,
    creditNoteTotal,
    netTotal
  }
};

fs.writeFileSync(
  path.join(__dirname, '../SLA Incomes/pastel_parsed.json'), 
  JSON.stringify(parsedData, null, 2)
);
console.log('\nParsed data saved to: SLA Incomes/pastel_parsed.json');

// Show invoice number range
const invoiceNumbers = invoices.map(i => parseInt(i.number.replace('IN', '')));
console.log(`\nInvoice number range: IN${Math.min(...invoiceNumbers)} - IN${Math.max(...invoiceNumbers)}`);

// Show credit note details
console.log('\n=== CREDIT NOTES (these reduce the total) ===');
creditNotes.forEach(cn => {
  console.log(`  ${cn.number}: R ${cn.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} - ${cn.customerName}`);
});

// Group invoices by customer for analysis
const byCustomer = {};
invoices.forEach(inv => {
  const key = inv.customerCode;
  if (!byCustomer[key]) {
    byCustomer[key] = { name: inv.customerName, count: 0, total: 0 };
  }
  byCustomer[key].count++;
  byCustomer[key].total += inv.amount;
});

// Top 10 customers by value
console.log('\n=== TOP 10 CUSTOMERS BY VALUE ===');
Object.entries(byCustomer)
  .sort((a, b) => b[1].total - a[1].total)
  .slice(0, 10)
  .forEach(([code, data]) => {
    console.log(`  ${code}: R ${data.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} (${data.count} invoices) - ${data.name}`);
  });
