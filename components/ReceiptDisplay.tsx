
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ParsedReceipt, Assignments, ReceiptItem, ReceiptSession } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ImageZoomModal from './ImageZoomModal';
import EditableField from './EditableField';
import AddItemModal from './AddItemModal';
import QuantitySplitModal from './QuantitySplitModal';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface ReceiptItemViewProps {
  item: ReceiptItem;
  assignments: Assignments;
  people: string[];
  isInteractive: boolean;
  editingItemId: string | null;
  onEditClick: (itemId: string) => void;
  onUpdateAssignment: (itemId: string, newNames: string[]) => void;
  onCancelEdit: () => void;
  onZoomRequest: () => void;
  onEditItem: (itemId: string, newName: string, newPrice: number) => void;
  onSplitItemRequest: (item: ReceiptItem) => void;
  onClearItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

const ReceiptItemView: React.FC<ReceiptItemViewProps> = React.memo(({
  item,
  assignments,
  people,
  isInteractive,
  editingItemId,
  onEditClick,
  onUpdateAssignment,
  onCancelEdit,
  onZoomRequest,
  onEditItem,
  onSplitItemRequest,
  onClearItem,
  onDeleteItem,
}) => {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [isUnassignConfirmOpen, setIsUnassignConfirmOpen] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  const isEditing = editingItemId === item.id;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  const assignedNames = assignments[item.id];
  const isAssigned = assignedNames && assignedNames.length > 0;

  const getAssignedNamesText = useCallback(() => {
    if (!isAssigned) {
      return 'Unassigned';
    }
    return assignedNames.join(', ');
  }, [isAssigned, assignedNames]);

  const handleEdit = useCallback(() => {
    setSelectedNames(assignments[item.id] || []);
    onEditClick(item.id);
  }, [assignments, item.id, onEditClick]);

  const handleSave = useCallback(() => {
    onUpdateAssignment(item.id, selectedNames);
  }, [item.id, selectedNames, onUpdateAssignment]);

  const handleConfirmUnassign = useCallback(() => {
    onUpdateAssignment(item.id, []);
    setIsUnassignConfirmOpen(false);
  }, [item.id, onUpdateAssignment]);

  const handleConfirmDelete = useCallback(() => {
    onDeleteItem(item.id);
    setDeleteConfirmOpen(false);
  }, [item.id, onDeleteItem]);
  
  return (
    <>
      <div className={`transition-all duration-300 bg-surface dark:bg-slate-800 rounded-lg shadow-sm ${isEditing ? 'ring-2 ring-primary dark:ring-primary-dark' : 'border border-transparent'}`}>
        <div className="flex items-stretch min-h-[76px]">
          {/* Left Side: Info */}
          <div 
            className={`flex-grow p-3 rounded-l-lg transition-opacity ${isAssigned && !isEditing ? 'opacity-70' : ''}`}
            role="button"
            tabIndex={isInteractive && !isEditing ? 0 : -1}
            onClick={!isEditing && isInteractive ? onZoomRequest : undefined}
            onKeyDown={(e) => !isEditing && isInteractive && (e.key === 'Enter' || e.key === ' ') && onZoomRequest()}
            aria-label={`Zoom on ${item.name}`}
            style={{ cursor: isInteractive && !isEditing ? 'pointer' : 'default' }}
          >
            <div className="flex items-start gap-2">
              <div 
                  className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${isAssigned ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                  title={isAssigned ? 'Assigned' : 'Unassigned'}
              ></div>
              <div className="flex-grow">
                <EditableField
                  initialValue={item.name}
                  onSave={(newName) => onEditItem(item.id, newName, item.price)}
                  isInteractive={isInteractive}
                  className="font-bold text-text-primary dark:text-slate-100"
                  ariaLabel={`Edit item name for ${item.name}`}
                />
              </div>
               {isInteractive && (
                <button 
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="p-1 -mr-1 -mt-1 rounded-full text-text-secondary dark:text-text-secondary-dark hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600 dark:hover:text-red-400 opacity-50 hover:opacity-100 focus:opacity-100 transition-all"
                  aria-label={`Delete item ${item.name}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" /></svg>
                </button>
              )}
            </div>
            <div className="text-sm font-medium mt-1 flex items-center pl-[18px]">
              <span className="text-text-secondary dark:text-slate-400 mr-1">Assigned:</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleEdit(); }}
                disabled={!isInteractive}
                className={`text-left p-1 -ml-1 rounded transition-colors disabled:cursor-default ${isInteractive ? 'text-primary dark:text-purple-300 hover:bg-primary/10 dark:hover:bg-purple-300/10 cursor-pointer font-semibold' : 'text-text-secondary dark:text-slate-400'}`}
                aria-label={`Edit assignment for ${item.name}. Currently assigned to: ${getAssignedNamesText()}`}
                aria-expanded={isEditing}
                aria-controls={`edit-assignment-${item.id}`}
              >
                {getAssignedNamesText()}
              </button>
            </div>
          </div>

          {/* Right Side: Actions */}
          {isInteractive && !isEditing && (
            <div className="flex-shrink-0 flex rounded-r-lg overflow-hidden">
              <button onClick={(e) => { e.stopPropagation(); onSplitItemRequest(item); }} className="w-[70px] bg-blue-600 text-white flex flex-col items-center justify-center transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-inset">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-5 h-5"><path d="M7.25 2a.75.75 0 0 0-1.5 0v1.559a2.25 2.25 0 0 0-1.22.453L3.155 3.155a.75.75 0 0 0-1.06 1.06l.858.858A2.25 2.25 0 0 0 2 6.293V4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .75.75h3.5a.75.75 0 0 0 0-1.5H3.207a2.249 2.249 0 0 0 1.22-.453l.858.858a.75.75 0 0 0 1.06-1.06l-.858-.858A2.25 2.25 0 0 0 6.293 5H7.85a.75.75 0 0 0 0-1.5H6.293A2.249 2.249 0 0 0 5 3.207V2.75a.75.75 0 0 0 1.5 0V4.31a2.25 2.25 0 0 0 .453 1.22l.858.858a.75.75 0 0 0 1.06-1.06l-.858-.858A2.25 2.25 0 0 0 7.25 3.207V2ZM8.75 8a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5H9.793a2.249 2.249 0 0 1-1.22.453l-.858-.858a.75.75 0 0 1-1.06 1.06l.858.858A2.25 2.25 0 0 1 8.146 11h-1.56a.75.75 0 0 1 0-1.5h1.56a2.249 2.249 0 0 1 1.22-.453l.858-.858a.75.75 0 0 1 1.06-1.06l-.858.858A2.25 2.25 0 0 1 9.707 9H11.25a.75.75 0 0 1 .75.75v1.559a2.25 2.25 0 0 1 1.22-.453l1.375.858a.75.75 0 0 1-.53 1.408l-1.375-.858a2.25 2.25 0 0 1-1.22.453V13.25a.75.75 0 0 1-1.5 0v-1.56a2.25 2.25 0 0 1-.453-1.22l-.858-.858a.75.75 0 0 1 1.06-1.06l.858.858A2.25 2.25 0 0 1 11.25 8h.75Z" /></svg>
                  <span className="text-xs mt-1 font-semibold">Split</span>
              </button>
              <div className="w-[80px] bg-red-700/80 text-white flex flex-col items-center justify-center">
                 <EditableField
                    initialValue={item.price}
                    onSave={(newPrice) => onEditItem(item.id, item.name, parseFloat(newPrice))}
                    isInteractive={isInteractive}
                    type="number"
                    formatter={formatCurrency}
                    className="font-mono text-slate-100 text-lg text-center"
                    ariaLabel={`Edit price for ${item.name}`}
                  />
                  <button onClick={(e) => { e.stopPropagation(); onClearItem(item.id); }} className="text-xs mt-1 text-red-300 hover:text-white font-semibold focus:outline-none focus:underline">Clear</button>
              </div>
            </div>
          )}
        </div>
        
        {isEditing && (
          <div className="animate-fade-in p-3 border-t border-border dark:border-slate-700" id={`edit-assignment-${item.id}`}>
              <fieldset>
                 <div className="flex justify-between items-center mb-1">
                    <legend className="text-sm font-medium text-text-secondary dark:text-text-secondary-dark">Assign to:</legend>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedNames(people)} className="px-2 py-0.5 text-xs font-semibold text-primary dark:text-primary-dark bg-primary/10 hover:bg-primary/20 rounded-md transition-colors">All</button>
                        <button onClick={() => setSelectedNames([])} className="px-2 py-0.5 text-xs font-semibold text-text-secondary dark:text-text-secondary-dark bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-md transition-colors">None</button>
                    </div>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto border-y border-border dark:border-border-dark py-1">
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
                       <span
                        className="ml-2 text-text-primary dark:text-text-primary-dark flex-grow"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedNames([person]);
                        }}
                      >
                        {person}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="flex items-center gap-2 mt-3">
                <button onClick={() => setIsUnassignConfirmOpen(true)} className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 rounded-md transition-colors">
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
        )}
      </div>
      <ConfirmationModal
          isOpen={isUnassignConfirmOpen}
          onClose={() => setIsUnassignConfirmOpen(false)}
          onConfirm={handleConfirmUnassign}
          title="Unassign Item"
          message={`Are you sure you want to unassign "${item.name}" from everyone?`}
          variant="destructive"
      />
      <ConfirmationModal
          isOpen={isDeleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Delete Item"
          message={`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`}
          variant="destructive"
      />
    </>
  );
});


interface ReceiptDisplayProps {
  session: ReceiptSession;
  isUndoable: boolean;
  onUpdateAssignment: (itemId: string, newNames: string[]) => void;
  onAssignAllUnassigned: (personName: string) => void;
  onSplitAllEqually: () => void;
  onUndoLastAssignment: () => void;
  isInteractive: boolean;
  onAddItem: (name: string, price: number, quantity: number) => void;
  onDeleteItem: (itemId: string) => void;
  onSetQuantityAssignment: (itemId: string, quantities: { [person: string]: number }) => void;
  onEditItem: (itemId: string, newName: string, newPrice: number) => void;
  onEditTotals: (newSubtotal: number, newTax: number, newTip: number) => void;
  onSplitItemEvenly: (itemId: string) => void;
  onClearItem: (itemId: string) => void;
}

const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({ session, isUndoable, onUpdateAssignment, onAssignAllUnassigned, onSplitAllEqually, onUndoLastAssignment, isInteractive, onAddItem, onDeleteItem, onSetQuantityAssignment, onEditItem, onEditTotals, onSplitItemEvenly, onClearItem }) => {
  const { parsedReceipt: receipt, assignments, people, receiptImage, quantityAssignments } = session;
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAssignAllModalOpen, setIsAssignAllModalOpen] = useState(false);
  const [isSplitAllModalOpen, setIsSplitAllModalOpen] = useState(false);
  const [isZoomModalOpen, setZoomModalOpen] = useState(false);
  const [isAddItemModalOpen, setAddItemModalOpen] = useState(false);
  const [itemForQuantitySplit, setItemForQuantitySplit] = useState<ReceiptItem | null>(null);
  const [selectedPersonForAssignAll, setSelectedPersonForAssignAll] = useState<string>('');
  const [filterQuery, setFilterQuery] = useState('');
  const [isItemListVisible, setIsItemListVisible] = useState(true);
  const assignAllModalRef = useFocusTrap<HTMLDivElement>(isAssignAllModalOpen);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };
  
  const handleUpdateAssignment = useCallback((itemId: string, newNames: string[]) => {
    onUpdateAssignment(itemId, newNames);
    setEditingItemId(null);
  }, [onUpdateAssignment]);
  
  const handleConfirmAssignAll = useCallback(() => {
    if (selectedPersonForAssignAll) {
      onAssignAllUnassigned(selectedPersonForAssignAll);
      setIsAssignAllModalOpen(false);
    }
  }, [selectedPersonForAssignAll, onAssignAllUnassigned]);

  const handleConfirmSplitAll = useCallback(() => {
    onSplitAllEqually();
    setIsSplitAllModalOpen(false);
  }, [onSplitAllEqually]);

  const handleCancelEdit = useCallback(() => {
    setEditingItemId(null);
  }, []);

  const handleAddItemConfirm = (name: string, price: number, quantity: number) => {
    onAddItem(name, price, quantity);
    setAddItemModalOpen(false);
  };

  const handleQuantitySplitSave = (quantities: { [person: string]: number }) => {
    if (itemForQuantitySplit) {
      onSetQuantityAssignment(itemForQuantitySplit.id, quantities);
    }
    setItemForQuantitySplit(null);
  };

  const handleSplitItemRequest = (item: ReceiptItem) => {
    if (people.length === 0) return;
    if (item.quantity > 1) {
        setItemForQuantitySplit(item);
    } else {
        // For items with quantity 1, just split evenly
        onSplitItemEvenly(item.id);
    }
  };
  
  const hasUnassignedItems = useMemo(() => 
    receipt.items.some(item => !assignments[item.id] || assignments[item.id].length === 0),
    [receipt.items, assignments]
  );

  const filteredItems = useMemo(() =>
    receipt.items.filter(item =>
      item.name.toLowerCase().includes(filterQuery.toLowerCase())
    ), [receipt.items, filterQuery]);
    
  const animatedTotal = useAnimatedNumber(receipt.subtotal + receipt.tax + receipt.tip, 500);

  return (
    <>
        <div className="bg-surface dark:bg-surface-dark rounded-lg shadow-md border border-border dark:border-border-dark h-full flex flex-col">
          <div className="p-4 border-b border-border dark:border-border-dark space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
               <div
                  className="flex items-center gap-2 cursor-pointer group"
                  onClick={() => setIsItemListVisible(!isItemListVisible)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setIsItemListVisible(!isItemListVisible)}
                  aria-expanded={isItemListVisible}
                  aria-controls="receipt-item-list"
                >
                  <h2 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">Receipt Details</h2>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-6 h-6 text-text-secondary dark:text-text-secondary-dark transition-transform transform group-hover:text-text-primary dark:group-hover:text-text-primary-dark ${isItemListVisible ? 'rotate-180' : ''}`}>
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end">
                  {isInteractive && (
                    <button onClick={() => setAddItemModalOpen(true)} className="px-2 py-1 text-xs font-semibold text-primary dark:text-primary-dark bg-primary/10 dark:bg-primary-dark/10 hover:bg-primary/20 dark:hover:bg-primary-dark/20 rounded-md transition-colors flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                        Add Item
                    </button>
                  )}
                  {isInteractive && (
                      <button 
                          onClick={onUndoLastAssignment}
                          disabled={!isUndoable}
                          className="px-2 py-1 text-xs font-semibold text-primary dark:text-primary-dark bg-primary/10 dark:bg-primary-dark/10 hover:bg-primary/20 dark:hover:bg-primary-dark/20 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          aria-label="Undo last assignment"
                      >
                           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.06.025Z" clipRule="evenodd" />
                           </svg>
                          Undo
                      </button>
                  )}
                  {isInteractive && people.length > 0 && (
                      <button 
                          onClick={() => setIsSplitAllModalOpen(true)}
                          className="px-2 py-1 text-xs font-semibold text-primary dark:text-primary-dark bg-primary/10 dark:bg-primary-dark/10 hover:bg-primary/20 dark:hover:bg-primary-dark/20 rounded-md transition-colors"
                          aria-label="Split all items equally"
                      >
                          Split All Equally
                      </button>
                  )}
                  {isInteractive && hasUnassignedItems && people.length > 0 && (
                      <button 
                          onClick={() => {
                              setSelectedPersonForAssignAll('');
                              setIsAssignAllModalOpen(true);
                          }}
                          className="px-2 py-1 text-xs font-semibold text-primary dark:text-primary-dark bg-primary/10 dark:bg-primary-dark/10 hover:bg-primary/20 dark:hover:bg-primary-dark/20 rounded-md transition-colors"
                          aria-label="Assign all unassigned items"
                      >
                          Assign All Unassigned...
                      </button>
                  )}
              </div>
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
           <div id="receipt-item-list" className={`grid transition-all duration-300 ease-in-out ${isItemListVisible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'} flex-grow min-h-0`}>
                <div className="overflow-y-auto">
                    <div className="p-4 space-y-2">
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
                            onCancelEdit={handleCancelEdit}
                            onZoomRequest={() => setZoomModalOpen(true)}
                            onEditItem={onEditItem}
                            onSplitItemRequest={handleSplitItemRequest}
                            onClearItem={onClearItem}
                            onDeleteItem={onDeleteItem}
                          />
                        ))}
                        {filteredItems.length === 0 && (
                            <div className="text-center text-text-secondary dark:text-text-secondary-dark py-8">
                                <p>No items match your filter.</p>
                            </div>
                        )}
                    </div>
                </div>
           </div>
          <div className="p-4 border-t border-border dark:border-border-dark bg-background/50 dark:bg-background-dark/50 rounded-b-lg mt-auto flex-shrink-0">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary-dark">Subtotal</span>
                 <EditableField
                    initialValue={receipt.subtotal}
                    onSave={(val) => onEditTotals(parseFloat(val), receipt.tax, receipt.tip)}
                    isInteractive={isInteractive}
                    type="number"
                    formatter={formatCurrency}
                    className="font-mono"
                    ariaLabel="Edit subtotal"
                 />
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary-dark">Tax</span>
                <EditableField
                    initialValue={receipt.tax}
                    onSave={(val) => onEditTotals(receipt.subtotal, parseFloat(val), receipt.tip)}
                    isInteractive={isInteractive}
                    type="number"
                    formatter={formatCurrency}
                    className="font-mono"
                    ariaLabel="Edit tax"
                 />
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary dark:text-text-secondary-dark">Tip</span>
                <EditableField
                    initialValue={receipt.tip}
                    onSave={(val) => onEditTotals(receipt.subtotal, receipt.tax, parseFloat(val))}
                    isInteractive={isInteractive}
                    type="number"
                    formatter={formatCurrency}
                    className="font-mono"
                    ariaLabel="Edit tip"
                 />
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-border dark:border-border-dark mt-2">
                <span className="text-text-primary dark:text-text-primary-dark">Total</span>
                <span className="font-mono text-primary dark:text-primary-dark">{formatCurrency(animatedTotal)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {isAssignAllModalOpen && (
            <div
              className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 animate-fade-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="assign-all-title"
              onClick={() => setIsAssignAllModalOpen(false)}
            >
                <div
                    ref={assignAllModalRef}
                    tabIndex={-1}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-surface dark:bg-surface-dark rounded-lg shadow-xl p-6 w-full max-w-sm m-4 focus:outline-none">
                    <h3 id="assign-all-title" className="text-lg font-bold text-text-primary dark:text-text-primary-dark mb-4">Assign All Unassigned</h3>
                    <p className="text-sm text-text-secondary dark:text-text-secondary-dark mb-4">Select a person to assign all remaining unassigned items to.</p>
                    <fieldset>
                        <legend className="sr-only">List of people</legend>
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

        <ConfirmationModal
            isOpen={isSplitAllModalOpen}
            onClose={() => setIsSplitAllModalOpen(false)}
            onConfirm={handleConfirmSplitAll}
            title="Split All Items Equally"
            message={`Are you sure you want to assign ALL items on this receipt to everyone (${people.length} people)? This will overwrite all current assignments.`}
            variant="primary"
        />
        <ImageZoomModal
            isOpen={isZoomModalOpen}
            onClose={() => setZoomModalOpen(false)}
            imageUrl={receiptImage}
        />
        <AddItemModal
            isOpen={isAddItemModalOpen}
            onClose={() => setAddItemModalOpen(false)}
            onConfirm={handleAddItemConfirm}
        />
        {itemForQuantitySplit && (
            <QuantitySplitModal
                isOpen={!!itemForQuantitySplit}
                onClose={() => setItemForQuantitySplit(null)}
                onSave={handleQuantitySplitSave}
                item={itemForQuantitySplit}
                people={people}
                currentQuantities={quantityAssignments?.[itemForQuantitySplit.id] || {}}
            />
        )}
    </>
  );
};

export default ReceiptDisplay;