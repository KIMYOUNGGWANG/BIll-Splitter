
import React, { useState, useMemo } from 'react';
import { ParsedReceipt, Assignments, ReceiptItem } from '../types';

interface ReceiptItemViewProps {
  item: ReceiptItem;
  assignments: Assignments;
  people: string[];
  isInteractive: boolean;
  editingItemId: string | null;
  onEditClick: (itemId: string) => void;
  onUpdateAssignment: (itemId: string, newNames: string[]) => void;
  onCancelEdit: () => void;
}

const ReceiptItemView: React.FC<ReceiptItemViewProps> = React.memo(({
  item,
  assignments,
  people,
  isInteractive,
  editingItemId,
  onEditClick,
  onUpdateAssignment,
  onCancelEdit
}) => {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  
  const isEditing = editingItemId === item.id;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  const assignedNames = assignments[item.id];
  const isAssigned = assignedNames && assignedNames.length > 0;

  const getAssignedNamesText = () => {
    if (!isAssigned) {
      return 'Unassigned';
    }
    return assignedNames.join(', ');
  };

  const handleEdit = () => {
    setSelectedNames(assignments[item.id] || []);
    onEditClick(item.id);
  };

  const handleSave = () => {
    onUpdateAssignment(item.id, selectedNames);
  };

  const handleUnassign = () => {
    onUpdateAssignment(item.id, []);
  };
  
  return (
    <div className={`p-3 rounded-md border border-border dark:border-border-dark transition-colors ${isEditing ? 'bg-primary/5 dark:bg-primary-dark/10 ring-2 ring-primary dark:ring-primary-dark' : 'bg-background dark:bg-background-dark'}`}>
      <div className="flex justify-between items-start gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <div 
                className={`w-2 h-2 rounded-full flex-shrink-0 ${isAssigned ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                title={isAssigned ? 'Assigned' : 'Unassigned'}
            ></div>
            <span className="font-semibold text-text-primary dark:text-text-primary-dark truncate">{item.name} {item.quantity > 1 ? `(x${item.quantity})` : ''}</span>
        </div>
        <span className="font-mono text-text-primary dark:text-text-primary-dark flex-shrink-0">{formatCurrency(item.price)}</span>
      </div>

      {isEditing ? (
        <div className="mt-2 animate-fade-in" id={`edit-assignment-${item.id}`}>
          <fieldset>
            <legend className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark mb-1">Assign to:</legend>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {people.map(person => (
                <label key={person} className="flex items-center text-sm cursor-pointer p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary dark:text-primary-dark bg-gray-100 dark:bg-gray-900 focus:ring-primary dark:focus:ring-primary-dark"
                    checked={selectedNames.includes(person)}
                    onChange={(e) => {
                      setSelectedNames(
                        e.target.checked
                          ? [...selectedNames, person]
                          : selectedNames.filter(name => name !== person)
                      );
                    }}
                  />
                  <span className="ml-2 text-text-primary dark:text-text-primary-dark">{person}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={handleUnassign} className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 rounded-md transition-colors">
              Unassign
            </button>
            <div className="flex-grow"></div>
            <button onClick={onCancelEdit} className="px-2 py-1 text-xs font-semibold text-text-secondary dark:text-text-secondary-dark bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-md transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-2 py-1 text-xs font-semibold text-on-primary dark:text-on-primary-dark bg-primary dark:bg-primary-dark hover:bg-primary-focus dark:hover:bg-primary-focus-dark rounded-md transition-colors">
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="text-xs font-medium mt-1 flex items-center">
          <span className="text-text-secondary dark:text-text-secondary-dark mr-1">Assigned to:</span>
          <button
            onClick={handleEdit}
            disabled={!isInteractive}
            className={`text-left p-1 -ml-1 rounded transition-colors disabled:cursor-default ${isInteractive ? 'text-primary dark:text-primary-dark hover:bg-primary/10 dark:hover:bg-primary-dark/10 cursor-pointer' : 'text-text-secondary dark:text-text-secondary-dark'}`}
            aria-label={`Edit assignment for ${item.name}`}
            aria-expanded={isEditing}
            aria-controls={`edit-assignment-${item.id}`}
          >
            {getAssignedNamesText()}
          </button>
        </div>
      )}
    </div>
  );
});


interface ReceiptDisplayProps {
  receipt: ParsedReceipt;
  assignments: Assignments;
  people: string[];
  onUpdateAssignment: (itemId: string, newNames: string[]) => void;
  onAssignAllUnassigned: (personName: string) => void;
  isInteractive: boolean;
}

const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({ receipt, assignments, people, onUpdateAssignment, onAssignAllUnassigned, isInteractive }) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAssignAllModalOpen, setIsAssignAllModalOpen] = useState(false);
  const [selectedPersonForAssignAll, setSelectedPersonForAssignAll] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState('');
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  const handleUpdateAssignment = (itemId: string, newNames: string[]) => {
    onUpdateAssignment(itemId, newNames);
    setEditingItemId(null);
  };
  
  const handleConfirmAssignAll = () => {
    if (selectedPersonForAssignAll) {
      onAssignAllUnassigned(selectedPersonForAssignAll);
      setIsAssignAllModalOpen(false);
    }
  };
  
  const hasUnassignedItems = receipt.items.some(item => !assignments[item.id] || assignments[item.id].length === 0);

  const filteredItems = useMemo(() =>
    receipt.items.filter(item =>
      item.name.toLowerCase().includes(filterQuery.toLowerCase())
    ), [receipt.items, filterQuery]);

  return (
    <div className="bg-surface dark:bg-surface-dark rounded-lg shadow-md border border-border dark:border-border-dark h-full flex flex-col">
      <div className="p-4 border-b border-border dark:border-border-dark space-y-3">
        <div className="flex justify-between items-center gap-2">
          <h2 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">Receipt Details</h2>
          {isInteractive && hasUnassignedItems && (
              <button 
                  onClick={() => {
                      setSelectedPersonForAssignAll('');
                      setIsAssignAllModalOpen(true);
                  }}
                  className="px-2 py-1 text-xs font-semibold text-primary dark:text-primary-dark bg-primary/10 dark:bg-primary-dark/10 hover:bg-primary/20 dark:hover:bg-primary-dark/20 rounded-md transition-colors flex-shrink-0"
                  aria-label="Assign all unassigned items to one person"
              >
                  Assign All Unassigned...
              </button>
          )}
        </div>
         <div className="relative">
            <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter items..."
                className="w-full p-2 pl-8 border border-border dark:border-border-dark rounded-md focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark focus:outline-none bg-background dark:bg-background-dark text-text-primary dark:text-text-primary-dark"
                aria-label="Filter receipt items"
            />
             <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400 dark:text-gray-500">
                   <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                 </svg>
            </div>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {filteredItems.map((item) => (
          <ReceiptItemView
            key={item.id}
            item={item}
            assignments={assignments}
            people={people}
            isInteractive={isInteractive}
            editingItemId={editingItemId}
            onEditClick={setEditingItemId}
            onUpdateAssignment={handleUpdateAssignment}
            onCancelEdit={() => setEditingItemId(null)}
          />
        ))}
        {filteredItems.length === 0 && (
            <div className="text-center text-text-secondary dark:text-text-secondary-dark py-8">
                <p>No items match your filter.</p>
            </div>
        )}
      </div>
      <div className="p-4 border-t border-border dark:border-border-dark bg-background/50 dark:bg-background-dark/50 rounded-b-lg mt-auto flex-shrink-0">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary dark:text-text-secondary-dark">Subtotal</span>
            <span className="font-mono">{formatCurrency(receipt.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary dark:text-text-secondary-dark">Tax</span>
            <span className="font-mono">{formatCurrency(receipt.tax)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary dark:text-text-secondary-dark">Tip</span>
            <span className="font-mono">{formatCurrency(receipt.tip)}</span>
          </div>
          <div className="flex justify-between font-bold text-base pt-2 border-t border-border dark:border-border-dark mt-2">
            <span className="text-text-primary dark:text-text-primary-dark">Total</span>
            <span className="font-mono text-primary dark:text-primary-dark">{formatCurrency(receipt.subtotal + receipt.tax + receipt.tip)}</span>
          </div>
        </div>
      </div>
      
      {isAssignAllModalOpen && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="assign-all-title">
            <div className="bg-surface dark:bg-surface-dark rounded-lg shadow-xl p-6 w-full max-w-sm m-4">
                <h3 id="assign-all-title" className="text-lg font-bold text-text-primary dark:text-text-primary-dark mb-4">Assign All Unassigned Items</h3>
                <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-4">Select a person to assign all remaining unassigned items to.</p>
                <fieldset>
                    <legend className="sr-only">People list</legend>
                    <div className="space-y-2 max-h-48 overflow-y-auto border-y border-border dark:border-border-dark py-2">
                        {people.map(person => (
                            <label key={person} className="flex items-center p-2 rounded-md hover:bg-background dark:hover:bg-background-dark cursor-pointer">
                                <input
                                    type="radio"
                                    name="assign-all-person"
                                    value={person}
                                    checked={selectedPersonForAssignAll === person}
                                    onChange={(e) => setSelectedPersonForAssignAll(e.target.value)}
                                    className="h-4 w-4 text-primary dark:text-primary-dark focus:ring-primary dark:focus:ring-primary-dark border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800"
                                />
                                <span className="ml-3 text-text-primary dark:text-text-primary-dark">{person}</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div className="flex justify-end gap-2 mt-6">
                    <button 
                        onClick={() => setIsAssignAllModalOpen(false)}
                        className="px-4 py-2 text-sm font-semibold text-text-secondary dark:text-text-secondary-dark bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-md transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmAssignAll}
                        disabled={!selectedPersonForAssignAll}
                        className="px-4 py-2 text-sm font-semibold text-on-primary dark:text-on-primary-dark bg-primary dark:bg-primary-dark hover:bg-primary-focus dark:hover:bg-primary-focus-dark rounded-md transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptDisplay;
