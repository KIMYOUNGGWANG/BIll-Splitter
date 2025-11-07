
import type { ParsedReceipt, Assignments, PersonTotal, BillSummary, ReceiptSession } from '../types';

export function calculateBillSummary(
  receipt: ParsedReceipt | null,
  currentAssignments: Assignments,
  peopleList: string[],
  quantityAssignments: ReceiptSession['quantityAssignments']
): BillSummary {
  if (!receipt) return [];

  const personTotals: { [name: string]: PersonTotal } = {};

  // Initialize totals for all known people
  const allPeopleInvolved = new Set(peopleList);
  Object.values(currentAssignments).flat().forEach(name => allPeopleInvolved.add(name));

  allPeopleInvolved.forEach(name => {
    personTotals[name] = { name, items: [], subtotal: 0, tax: 0, tip: 0, total: 0 };
  });

  // Calculate item costs
  receipt.items.forEach(item => {
    const quantitySplit = quantityAssignments[item.id];
    const simpleSplit = currentAssignments[item.id];

    if (quantitySplit && Object.keys(quantitySplit).length > 0) {
      // Logic for quantity-based split
      const totalAssignedQuantity = Object.values(quantitySplit).reduce((sum, q) => sum + q, 0);
      if (totalAssignedQuantity === 0) return; // Skip if no one is assigned
      
      const baseQuantity = item.quantity > 0 ? item.quantity : totalAssignedQuantity;
      const pricePerUnit = item.price / baseQuantity;

      Object.entries(quantitySplit).forEach(([name, quantity]) => {
        if (quantity > 0) {
          const priceForPerson = pricePerUnit * quantity;
          if (personTotals[name]) {
            personTotals[name].subtotal += priceForPerson;
            personTotals[name].items.push({ name: `${item.name} (x${quantity})`, price: priceForPerson });
          }
        }
      });

    } else if (simpleSplit && simpleSplit.length > 0) {
      // Original logic for even split
      const pricePerPerson = item.price / simpleSplit.length;
      simpleSplit.forEach(name => {
        if (personTotals[name]) {
          personTotals[name].subtotal += pricePerPerson;
          personTotals[name].items.push({ name: item.name, price: pricePerPerson });
        }
      });
    }
  });


  // Calculate proportional tax and tip
  Object.keys(personTotals).forEach(name => {
    const person = personTotals[name];
    const subtotalSum = Object.values(personTotals).reduce((sum, p) => sum + p.subtotal, 0);

    if (subtotalSum > 0) {
      const proportion = person.subtotal / subtotalSum;
      person.tax = receipt.tax * proportion;
      person.tip = receipt.tip * proportion;
    } else {
      // If no items are assigned, split tax/tip evenly among all people
      const numPeople = allPeopleInvolved.size || 1;
      person.tax = receipt.tax / numPeople;
      person.tip = receipt.tip / numPeople;
    }
    person.total = person.subtotal + person.tax + person.tip;
  });

  return Object.values(personTotals).sort((a, b) => a.name.localeCompare(b.name));
}