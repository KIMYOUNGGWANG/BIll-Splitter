
import React, { useState, useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, price: number, quantity: number) => void;
}

const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const modalRef = useFocusTrap<HTMLDivElement>(isOpen);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPrice('');
      setQuantity('1');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceValue = parseFloat(price);
    const quantityValue = parseInt(quantity, 10);
    if (name.trim() && !isNaN(priceValue) && priceValue >= 0 && !isNaN(quantityValue) && quantityValue > 0) {
      onConfirm(name.trim(), priceValue, quantityValue);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-item-title"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="bg-surface dark:bg-surface-dark rounded-lg shadow-xl p-6 w-full max-w-sm m-4 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="add-item-title" className="text-lg font-bold text-text-primary dark:text-text-primary-dark mb-4">
          Add New Item
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="item-name" className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark">Item Name</label>
            <input
              type="text"
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary dark:focus:ring-primary-dark focus:border-primary dark:focus:border-primary-dark sm:text-sm"
            />
          </div>
          <div className="flex gap-4">
            <div className="flex-grow">
              <label htmlFor="item-price" className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark">Price</label>
              <input
                type="text"
                id="item-price"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
                pattern="[0-9]*[.,]?[0-9]+"
                className="mt-1 block w-full px-3 py-2 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary dark:focus:ring-primary-dark focus:border-primary dark:focus:border-primary-dark sm:text-sm"
              />
            </div>
            <div>
              <label htmlFor="item-quantity" className="block text-sm font-medium text-text-secondary dark:text-text-secondary-dark">Quantity</label>
              <input
                type="number"
                id="item-quantity"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="1"
                className="mt-1 block w-full px-3 py-2 bg-background dark:bg-background-dark border border-border dark:border-border-dark rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary dark:focus:ring-primary-dark focus:border-primary dark:focus:border-primary-dark sm:text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-text-secondary dark:text-text-secondary-dark bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-on-primary dark:text-on-primary-dark bg-primary dark:bg-primary-dark hover:bg-primary-focus dark:hover:bg-primary-focus-dark rounded-md transition-colors"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
