
import type { ParsedReceipt, Assignments, PersonTotal, BillSummary } from '../types';

export function calculateBillSummary(
  receipt: ParsedReceipt | null,
  currentAssignments: Assignments,
  peopleList: string[]
): BillSummary {
  if (!receipt) return [];

  const personTotals: { [name: string]: PersonTotal } = {};

  // Initialize totals for all known people
  const allPeopleInvolved = new Set(peopleList);
  Object.values(currentAssignments).flat().forEach(name => allPeopleInvolved.add(name));

  allPeopleInvolved.forEach(name => {
    personTotals[name] = { name, items: [], subtotal: 0, tax: 0, tip: 0, total: 0 };
  });

  // Calculate item costs for assigned people
  Object.entries(currentAssignments).forEach(([itemId, names]) => {
    if (names.length > 0) {
      const item = receipt.items.find(i => i.id === itemId);
      if (!item) return;

      const pricePerPerson = item.price / names.length;

      names.forEach(name => {
        if (!personTotals[name]) {
             personTotals[name] = { name, items: [], subtotal: 0, tax: 0, tip: 0, total: 0 };
        }
        personTotals[name].subtotal += pricePerPerson;
        personTotals[name].items.push({ name: item.name, price: pricePerPerson });
      });
    }
  });

  // Calculate proportional tax and tip
  Object.keys(personTotals).forEach(name => {
    const person = personTotals[name];
    if (receipt.subtotal > 0) {
      const proportion = person.subtotal / receipt.subtotal;
      person.tax = receipt.tax * proportion;
      person.tip = receipt.tip * proportion;
    } else {
      person.tax = 0;
      person.tip = 0;
    }
    person.total = person.subtotal + person.tax + person.tip;
  });

  return Object.values(personTotals).sort((a, b) => a.name.localeCompare(b.name));
}
