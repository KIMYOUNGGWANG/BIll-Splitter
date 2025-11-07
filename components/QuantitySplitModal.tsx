
import React, { useState, useEffect, useMemo } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { ReceiptItem } from '../types';

interface QuantitySplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quantities: { [person: string]: number }) => void;
  item: ReceiptItem;
  people: string[];
  currentQuantities: { [person: string]: number };
}

const QuantitySplitModal: React.FC<QuantitySplitModalProps> = ({ isOpen, onClose, onSave, item, people, currentQuantities }) => {
  const [quantities, setQuantities] = useState<{ [person: string]: number }>({});
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (isOpen) {
      const initialQuantities = people.reduce((acc, person) => {
        acc[person] = currentQuantities[person] || 0;
        return acc;
      }, {} as { [person: string]: number });
      setQuantities(initialQuantities);
    }
  }, [isOpen, people, currentQuantities]);

  const handleQuantityChange = (person: string, change: number) => {
    setQuantities(prev => {
      // Fix: Explicitly cast the quantity value to a number to prevent type errors.
      const currentVal = Number(prev[person]) || 0;
      const newVal = Math.max(0, currentVal + change);
      return { ...prev, [person]: newVal };
    });
  };

  const { assignedQuantity, remainingQuantity } = useMemo(() => {
    // Fix: Explicitly cast the quantity value to a number inside the reduce function.
    const assigned = Object.values(quantities).reduce((sum, q) => sum + (Number(q) || 0), 0);
    return {
      assignedQuantity: assigned,
      remainingQuantity: item.quantity - assigned,
    };
  }, [quantities, item.quantity]);

  const handleSave = () => {
    if (remainingQuantity >= 0) {
      // Filter out people with 0 quantity before saving
      const finalQuantities = Object.entries(quantities)
        // Fix: Cast quantity to a number for comparison.
        .filter(([, qty]) => Number(qty) > 0)
        .reduce((acc, [name, qty]) => {
            // Fix: Cast quantity to a number before assigning.
            acc[name] = Number(qty);
            return acc;
        }, {} as {[key: string]: number});
      onSave(finalQuantities);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quantity-split-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-surface dark:bg-surface-dark rounded-lg shadow-xl p-6 w-full max-w-md m-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="quantity-split-title" className="text-lg font-bold text-text-primary dark:text-text-primary-dark mb-2">
          Split Quantity for "{item.name}"
        </h3>
        <div className="flex justify-between items-baseline mb-4 text-sm">
            <span className="text-text-secondary dark:text-text-secondary-dark">Total Quantity: {item.quantity}</span>
            <span className={`font-medium ${remainingQuantity < 0 ? 'text-red-500' : 'text-green-600'}`}>
                Remaining: {remainingQuantity}
            </span>
        </div>
        
        <div className="space-y-2 max-h-60 overflow-y-auto border-y border-border dark:border-border-dark py-2 pr-2">
            {people.map(person => (
                <div key={person} className="flex items-center justify-between p-2 rounded-md hover:bg-background dark:hover:bg-background-dark">
                    <span className="text-text-primary dark:text-text-primary-dark">{person}</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleQuantityChange(person, -1)}
                            disabled={(quantities[person] || 0) === 0}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-lg font-bold text-text-secondary dark:text-text-secondary-dark hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Decrease quantity for ${person}`}
                        >
                            -
                        </button>
                        <span className="w-8 text-center font-mono text-base">{quantities[person] || 0}</span>
                        <button
                            onClick={() => handleQuantityChange(person, 1)}
                            disabled={remainingQuantity <= 0}
                            className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600 text-lg font-bold text-text-secondary dark:text-text-secondary-dark hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label={`Increase quantity for ${person}`}
                        >
                            +
                        </button>
                    </div>
                </div>
            ))}
        </div>

         {remainingQuantity < 0 && (
            <p className="text-xs text-red-500 text-center mt-2">
                Assigned quantity cannot exceed total quantity.
            </p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-text-secondary dark:text-text-secondary-dark bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={remainingQuantity < 0}
            className="px-4 py-2 text-sm font-semibold text-on-primary dark:text-on-primary-dark bg-primary dark:bg-primary-dark hover:bg-primary-focus dark:hover:bg-primary-focus-dark rounded-md transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Save Split
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuantitySplitModal;
