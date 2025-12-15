/**
 * Compare Pastel invoices with system data to find missing entries
 * Run from command line: node tools/compare-invoices.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection
const supabaseUrl = 'https://wvbmgdrsxqsmlvpzxqrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Ym1nZHJzeHFzbWx2cHp4cXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NjI3NzYsImV4cCI6MjA2ODEzODc3Nn0.hrSGvFWAcr6SUWmZzW7TjW9nqif90SORx3t2a8udgqg';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== PASTEL vs SYSTEM COMPARISON ===\n');
  console.log('Connecting to Supabase...');

  // Read Pastel parsed data
  const pastelDataPath = path.join(__dirname, '../SLA Incomes/pastel_parsed.json');
  const pastelData = JSON.parse(fs.readFileSync(pastelDataPath, 'utf8'));

  // Create lookup maps for Pastel data
  const pastelInvoiceMap = {};
  pastelData.invoices.forEach(inv => {
    pastelInvoiceMap[inv.number] = inv;
  });

  // Fetch November 2025 data from all three tables
  console.log('Fetching costing_entries...');
  const { data: costingData, error: costingError } = await supabase
    .from('costing_entries')
    .select('id, invoice_number, total_customer, total_expenses, profit, customer, date, job_description, rep')
    .gte('date', '2025-11-01')
    .lte('date', '2025-11-30');

  if (costingError) {
    console.error('Error fetching costing_entries:', costingError);
    return;
  }

  console.log('Fetching rental_incomes...');
  const { data: rentalData, error: rentalError } = await supabase
    .from('rental_incomes')
    .select('id, invoice_number, amount, date')
    .gte('date', '2025-11-01')
    .lte('date', '2025-11-30');

  if (rentalError) {
    console.error('Error fetching rental_incomes:', rentalError);
    return;
  }

  console.log('Fetching sla_incomes...');
  const { data: slaData, error: slaError } = await supabase
    .from('sla_incomes')
    .select('id, invoice_number, amount, date')
    .gte('date', '2025-11-01')
    .lte('date', '2025-11-30');

  if (slaError) {
    console.error('Error fetching sla_incomes:', slaError);
    return;
  }

  // Calculate system totals
  const costingTotal = costingData.reduce((sum, e) => sum + parseFloat(e.total_customer || 0), 0);
  const rentalTotal = rentalData.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const slaTotal = slaData.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const systemTotal = costingTotal + rentalTotal + slaTotal;

  console.log('\n=== SYSTEM DATA (November 2025) ===');
  console.log(`Costing Entries: ${costingData.length} records, Total: R ${costingTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
  console.log(`Rental Incomes:  ${rentalData.length} records, Total: R ${rentalTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
  console.log(`SLA Incomes:     ${slaData.length} records, Total: R ${slaTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
  console.log(`SYSTEM TOTAL:    R ${systemTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);

  console.log('\n=== PASTEL DATA (November 2025) ===');
  console.log(`Invoices:        ${pastelData.summary.invoiceCount} records`);
  console.log(`Invoice Total:   R ${pastelData.summary.invoiceTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
  console.log(`Credit Notes:    ${pastelData.summary.creditNoteCount} records`);
  console.log(`Credit Total:    R ${pastelData.summary.creditNoteTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
  console.log(`PASTEL NET:      R ${pastelData.summary.netTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);

  const discrepancy = pastelData.summary.netTotal - systemTotal;
  console.log('\n=== DISCREPANCY ===');
  console.log(`Pastel - System = R ${discrepancy.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);

  // Build system invoice lookup (normalize invoice numbers)
  const systemInvoiceMap = {};
  
  // From costing entries
  costingData.forEach(e => {
    if (e.invoice_number) {
      const normalized = e.invoice_number.toString().trim().toUpperCase();
      systemInvoiceMap[normalized] = {
        source: 'Costing',
        amount: parseFloat(e.total_customer || 0),
        customer: e.customer,
        date: e.date,
        id: e.id
      };
    }
  });

  // From rental incomes
  rentalData.forEach(e => {
    if (e.invoice_number) {
      const normalized = e.invoice_number.toString().trim().toUpperCase();
      systemInvoiceMap[normalized] = {
        source: 'Rental',
        amount: parseFloat(e.amount || 0),
        date: e.date,
        id: e.id
      };
    }
  });

  // From SLA incomes
  slaData.forEach(e => {
    if (e.invoice_number) {
      const normalized = e.invoice_number.toString().trim().toUpperCase();
      systemInvoiceMap[normalized] = {
        source: 'SLA',
        amount: parseFloat(e.amount || 0),
        date: e.date,
        id: e.id
      };
    }
  });

  console.log(`\nSystem has ${Object.keys(systemInvoiceMap).length} entries with invoice numbers`);

  // Find missing invoices (in Pastel but not in system)
  const missingInvoices = [];
  const matchedInvoices = [];
  const amountMismatches = [];

  pastelData.invoices.forEach(pastelInv => {
    const normalized = pastelInv.number.trim().toUpperCase();
    const systemEntry = systemInvoiceMap[normalized];

    if (!systemEntry) {
      missingInvoices.push(pastelInv);
    } else {
      matchedInvoices.push({ pastel: pastelInv, system: systemEntry });
      // Check for amount mismatches (allow small rounding differences)
      const diff = Math.abs(pastelInv.amount - systemEntry.amount);
      if (diff > 1) {
        amountMismatches.push({
          invoice: pastelInv.number,
          pastelAmount: pastelInv.amount,
          systemAmount: systemEntry.amount,
          difference: pastelInv.amount - systemEntry.amount
        });
      }
    }
  });

  const missingTotal = missingInvoices.reduce((sum, i) => sum + i.amount, 0);

  console.log('\n=== MISSING INVOICES (In Pastel, NOT in System) ===');
  console.log(`Count: ${missingInvoices.length}`);
  console.log(`Total Value: R ${missingTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);

  if (missingInvoices.length > 0) {
    console.log('\nMissing invoices (sorted by value):');
    missingInvoices
      .sort((a, b) => b.amount - a.amount)
      .forEach(inv => {
        console.log(`  ${inv.number}: R ${inv.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 }).padStart(15)} - ${inv.customerName}`);
      });
  }

  if (amountMismatches.length > 0) {
    console.log('\n=== AMOUNT MISMATCHES ===');
    amountMismatches.forEach(m => {
      console.log(`  ${m.invoice}: Pastel R ${m.pastelAmount.toLocaleString('en-ZA')} vs System R ${m.systemAmount.toLocaleString('en-ZA')} (diff: R ${m.difference.toLocaleString('en-ZA')})`);
    });
  }

  // Find entries in system without invoice numbers (potential matches)
  const noInvoiceEntries = costingData.filter(e => !e.invoice_number);
  const noInvoiceTotal = noInvoiceEntries.reduce((sum, e) => sum + parseFloat(e.total_customer || 0), 0);
  
  console.log('\n=== SYSTEM ENTRIES WITHOUT INVOICE NUMBERS ===');
  console.log(`Count: ${noInvoiceEntries.length}`);
  console.log(`Total Value: R ${noInvoiceTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);

  // Export missing invoices to CSV
  const missingCsvPath = path.join(__dirname, '../SLA Incomes/missing_invoices.csv');
  const missingCsv = [
    'Invoice Number,Amount,Customer Code,Customer Name',
    ...missingInvoices.map(i => `${i.number},${i.amount},${i.customerCode},"${i.customerName}"`)
  ].join('\n');
  fs.writeFileSync(missingCsvPath, missingCsv);
  console.log(`\nMissing invoices exported to: SLA Incomes/missing_invoices.csv`);

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Matched invoices: ${matchedInvoices.length}`);
  console.log(`Missing from system: ${missingInvoices.length} (R ${missingTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })})`);
  console.log(`Amount mismatches: ${amountMismatches.length}`);
  console.log(`\nThis accounts for R ${missingTotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} of the R ${discrepancy.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} discrepancy`);
}

main().catch(console.error);
