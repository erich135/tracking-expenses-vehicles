/**
 * Fix amount mismatches - update system to match Pastel
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wvbmgdrsxqsmlvpzxqrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Ym1nZHJzeHFzbWx2cHp4cXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NjI3NzYsImV4cCI6MjA2ODEzODc3Nn0.hrSGvFWAcr6SUWmZzW7TjW9nqif90SORx3t2a8udgqg';
const supabase = createClient(supabaseUrl, supabaseKey);

// Amount mismatches to fix (Pastel is the source of truth)
const mismatches = [
  { invoice: 'IN116658', pastelAmount: 111401.29, systemAmount: 55700.65 },
  { invoice: 'IN116675', pastelAmount: 937458.66, systemAmount: 986798.59 },
  { invoice: 'IN116704', pastelAmount: 19971.82, systemAmount: 19973.82 },
  { invoice: 'IN116743', pastelAmount: 544068.45, systemAmount: 579068.45 },
  { invoice: 'IN116744', pastelAmount: 8689.66, systemAmount: 8912.47 },
  { invoice: 'IN116749', pastelAmount: 43076.58, systemAmount: 44181.1 },
];

async function main() {
  console.log('=== FIXING AMOUNT MISMATCHES ===\n');
  console.log('Updating system amounts to match Pastel...\n');

  for (const mismatch of mismatches) {
    // First get the current entry to calculate new profit
    const { data: current, error: fetchError } = await supabase
      .from('costing_entries')
      .select('*')
      .eq('invoice_number', mismatch.invoice)
      .single();

    if (fetchError || !current) {
      console.log(`❌ ${mismatch.invoice}: Not found in costing_entries, checking other tables...`);
      
      // Try rental_incomes
      const { data: rental } = await supabase
        .from('rental_incomes')
        .select('*')
        .eq('invoice_number', mismatch.invoice)
        .single();
      
      if (rental) {
        const { error: updateError } = await supabase
          .from('rental_incomes')
          .update({ amount: mismatch.pastelAmount })
          .eq('invoice_number', mismatch.invoice);
        
        if (updateError) {
          console.log(`❌ ${mismatch.invoice} (rental): ${updateError.message}`);
        } else {
          console.log(`✅ ${mismatch.invoice} (rental): R ${mismatch.systemAmount.toLocaleString()} → R ${mismatch.pastelAmount.toLocaleString()}`);
        }
        continue;
      }

      // Try sla_incomes
      const { data: sla } = await supabase
        .from('sla_incomes')
        .select('*')
        .eq('invoice_number', mismatch.invoice)
        .single();
      
      if (sla) {
        const { error: updateError } = await supabase
          .from('sla_incomes')
          .update({ amount: mismatch.pastelAmount })
          .eq('invoice_number', mismatch.invoice);
        
        if (updateError) {
          console.log(`❌ ${mismatch.invoice} (sla): ${updateError.message}`);
        } else {
          console.log(`✅ ${mismatch.invoice} (sla): R ${mismatch.systemAmount.toLocaleString()} → R ${mismatch.pastelAmount.toLocaleString()}`);
        }
        continue;
      }

      console.log(`❌ ${mismatch.invoice}: Not found in any table`);
      continue;
    }

    // Calculate new profit (new sales - existing expenses)
    const expenses = parseFloat(current.total_expenses || 0);
    const newProfit = mismatch.pastelAmount - expenses;
    const newMargin = mismatch.pastelAmount > 0 ? (newProfit / mismatch.pastelAmount) * 100 : 0;

    // Update the entry
    const { error: updateError } = await supabase
      .from('costing_entries')
      .update({
        total_customer: mismatch.pastelAmount,
        profit: newProfit,
        margin: newMargin
      })
      .eq('invoice_number', mismatch.invoice);

    if (updateError) {
      console.log(`❌ ${mismatch.invoice}: ${updateError.message}`);
    } else {
      const diff = mismatch.pastelAmount - mismatch.systemAmount;
      console.log(`✅ ${mismatch.invoice}: R ${mismatch.systemAmount.toLocaleString()} → R ${mismatch.pastelAmount.toLocaleString()} (${diff >= 0 ? '+' : ''}R ${diff.toLocaleString()})`);
    }
  }

  console.log('\n=== COMPLETE ===');
}

main().catch(console.error);
