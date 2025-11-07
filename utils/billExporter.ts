
import type { BillSummary, ParsedReceipt } from '../types';

function formatSummaryAsText(summary: BillSummary, receipt: ParsedReceipt | null, receiptName: string): string {
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  let text = `Bill Summary for [${receiptName}]\n`;
  text += '====================================\n\n';

  summary.forEach(person => {
    text += `--- ${person.name} --- Total: ${formatCurrency(person.total)} ---\n`;
    if (person.items.length > 0) {
      person.items.forEach(item => {
        text += `  - ${item.name}: ${formatCurrency(item.price)}\n`;
      });
    } else {
      text += '  - No items assigned.\n';
    }
    text += `  (Subtotal: ${formatCurrency(person.subtotal)}, Tax: ${formatCurrency(person.tax)}, Tip: ${formatCurrency(person.tip)})\n\n`;
  });

  if (receipt) {
    text += '====================================\n';
    text += 'Receipt Totals:\n';
    text += `Subtotal: ${formatCurrency(receipt.subtotal)}\n`;
    text += `Tax: ${formatCurrency(receipt.tax)}\n`;
    text += `Tip: ${formatCurrency(receipt.tip)}\n`;
    text += `GRAND TOTAL: ${formatCurrency(receipt.subtotal + receipt.tax + receipt.tip)}\n`;
    text += '====================================\n';
  }

  return text;
}

export function exportBillSummary(summary: BillSummary, receipt: ParsedReceipt | null, receiptName: string) {
  const text = formatSummaryAsText(summary, receipt, receiptName);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeFilename = receiptName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.download = `bill_summary_${safeFilename}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Fix: Implement and export the missing shareBillSummary function.
export async function shareBillSummary(summary: BillSummary, receipt: ParsedReceipt | null, receiptName: string): Promise<boolean> {
  const text = formatSummaryAsText(summary, receipt, receiptName);
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: `Bill Summary for [${receiptName}]`,
        text: text,
      });
      return true;
    } catch (err) {
      // The user cancelled the share operation, which is not an error.
      if (err instanceof DOMException && err.name === 'AbortError') {
        return false;
      }
      console.error('Error sharing:', err);
      return false;
    }
  } else {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text:', err);
      return false;
    }
  }
}
