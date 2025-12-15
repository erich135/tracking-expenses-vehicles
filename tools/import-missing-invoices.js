/**
 * Import missing Pastel invoices into the system
 * Run: node tools/import-missing-invoices.js
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

// Missing invoices from Pastel (from comparison analysis)
const missingInvoices = [
  { number: 'IN116645', amount: 601650.00, customer: 'Sealed Air Africa (Pty) Ltd', customerCode: 'SEA001' },
  { number: 'IN116792', amount: 436714.00, customer: 'Indabingi Sithole (Pty) Ltd t/a Gayatri', customerCode: 'GAY000' },
  { number: 'IN116715', amount: 377342.00, customer: 'New Era Labels (BOPS) PTY LTD', customerCode: 'GOL004' },
  { number: 'IN116727', amount: 332997.33, customer: 'Cash Sales', customerCode: 'CAS001' },
  { number: 'IN116676', amount: 142495.90, customer: 'Eland Platinum (Pty) Ltd', customerCode: 'NOR003' },
  { number: 'IN116713', amount: 132478.96, customer: 'Astral Operations LTD t/a Goldi a Div', customerCode: 'AST001' },
  { number: 'IN116738', amount: 115275.60, customer: 'Engen Refinery A Division of Engen', customerCode: 'ENG002' },
  { number: 'IN116789', amount: 110000.00, customer: 'KIC SA (Pty) Ltd', customerCode: 'KIC001' },
  { number: 'IN116672', amount: 76139.56, customer: 'Khulasonke Rebuild (Pty) Ltd', customerCode: 'KHU001' },
  { number: 'IN116729', amount: 69286.65, customer: 'Cash Sales', customerCode: 'CAS001' },
  { number: 'IN116801', amount: 66048.90, customer: 'Ingrain SA (Pty) Ltd', customerCode: 'ING001' },
  { number: 'IN116712', amount: 56083.50, customer: 'Barloworld Equipment (Pty) Ltd', customerCode: 'BAR001' },
  { number: 'IN116802', amount: 44010.44, customer: 'Ingrain SA (Pty) Ltd', customerCode: 'ING001' },
  { number: 'IN116803', amount: 43092.40, customer: 'Cash Sales', customerCode: 'CAS001' },
  { number: 'IN116711', amount: 35203.50, customer: 'Barloworld Equipment (Pty) Ltd', customerCode: 'BAR001' },
  { number: 'IN116793', amount: 33781.03, customer: 'Gayatri Cans (Pty) Ltd', customerCode: 'GAY001' },
  { number: 'IN116790', amount: 31984.00, customer: 'Ukhuni Business Furniture (Pty) Ltd', customerCode: 'UKH001' },
  { number: 'IN116794', amount: 26256.91, customer: 'Gayatri Cans (Pty) Ltd', customerCode: 'GAY001' },
  { number: 'IN116665', amount: 24851.40, customer: 'Sappi Southern Africa Limited', customerCode: 'SAP001' },
  { number: 'IN116730', amount: 22190.00, customer: 'Ingrain SA (Pty) Ltd', customerCode: 'ING001' },
  { number: 'IN116791', amount: 21490.00, customer: 'Ukhuni Business Furniture (Pty) Ltd', customerCode: 'UKH001' },
  { number: 'IN116740', amount: 20959.60, customer: 'Spress Rentals (Pty) Ltd', customerCode: 'SPR001' },
  { number: 'IN116728', amount: 12002.02, customer: 'Cash Sales', customerCode: 'CAS001' },
  { number: 'IN116757', amount: 11995.14, customer: 'Cash Sales', customerCode: 'CAS001' },
  { number: 'IN116788', amount: 10720.21, customer: 'Machinery Contractors (Pty) Ltd', customerCode: 'MAC004' },
];

async function main() {
  console.log('=== IMPORT MISSING INVOICES ===\n');
  console.log(`Found ${missingInvoices.length} invoices to import`);
  console.log(`Total value: R ${missingInvoices.reduce((s, i) => s + i.amount, 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}\n`);

  // Get the default rep from existing November entries (most common one)
  const { data: existingEntries } = await supabase
    .from('costing_entries')
    .select('rep')
    .gte('date', '2025-11-01')
    .lte('date', '2025-11-30');
  
  // Find most common rep
  const repCounts = {};
  existingEntries?.forEach(e => {
    if (e.rep) repCounts[e.rep] = (repCounts[e.rep] || 0) + 1;
  });
  const defaultRep = Object.entries(repCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'AP001';
  console.log(`Using default rep: ${defaultRep}`);

  // Prepare entries for insertion
  const entriesToInsert = missingInvoices.map(inv => ({
    invoice_number: inv.number,
    customer: inv.customer,
    total_customer: inv.amount,
    total_expenses: 0, // We don't have cost data from Pastel
    profit: inv.amount, // With 0 expenses, profit = sales
    margin: 100, // 100% margin when no expenses
    date: '2025-11-15', // Mid-November as default date
    job_description: 'New Sale', // Default job type
    rep: defaultRep,
    job_number: `PASTEL-${inv.number.replace('IN', '')}`, // Generate job number
    customer_items: [{
      id: Date.now(),
      part: `Pastel Import - ${inv.number}`,
      price: inv.amount.toString(),
      quantity: 1
    }],
    expense_items: [],
    total_discount: 0,
  }));

  console.log('\nInvoices to insert:');
  entriesToInsert.forEach(e => {
    console.log(`  ${e.invoice_number}: R ${e.total_customer.toLocaleString('en-ZA')} - ${e.customer}`);
  });

  // Confirm before inserting
  console.log('\n⚠️  Ready to insert. Run with --confirm to actually insert.');
  
  if (process.argv.includes('--confirm')) {
    console.log('\nInserting into database...');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const entry of entriesToInsert) {
      const { data, error } = await supabase
        .from('costing_entries')
        .insert(entry)
        .select();
      
      if (error) {
        console.error(`  ❌ ${entry.invoice_number}: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ✅ ${entry.invoice_number}: Inserted`);
        successCount++;
      }
    }
    
    console.log(`\n=== COMPLETE ===`);
    console.log(`Successful: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
  } else {
    console.log('\nTo insert, run: node tools/import-missing-invoices.js --confirm');
  }
}

main().catch(console.error);
