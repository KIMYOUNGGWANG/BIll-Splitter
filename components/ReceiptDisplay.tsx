
import React, { useState, useMemo, useCallback, useRef, TouchEvent } from 'react';
import { ParsedReceipt, Assignments, ReceiptItem } from '../types';
import ConfirmationModal from './ConfirmationModal';
import ImageZoomModal from './ImageZoomModal';
import EditableField from './EditableField';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';
import { useFocusTrap } from '../hooks/useFocusTrap';

const SWIPE_THRESHOLD = 60; // Pixels
const SWIPE_MAX_TRANSLATE = 140; // Total width of action buttons

interface SwipeableReceiptItemProps {
  children: React.ReactNode;
  onSplit: () => void;
  onClear: () => void;
  isInteractive: boolean;
}

const SwipeableReceiptItem: React.FC<SwipeableReceiptItemProps> = ({ children, onSplit, onClear, isInteractive }) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiped, setIsSwiped] = useState(false);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const resetSwipe = useCallback(() => {
    setTranslateX(0);
    setIsSwiped(false);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (translateX < -SWIPE_THRESHOLD) {
      setTranslateX(-SWIPE_MAX_TRANSLATE);
      setIsSwiped(true);
    } else {
      resetSwipe();
    }
  }, [translateX, resetSwipe]);
  
  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isDragging.current || !isInteractive) return;
    const currentX = e.clientX;
    const deltaX = currentX - startX.current;
    
    if (deltaX < 0) { // Only allow left swipe
        setTranslateX(Math.max(deltaX, -SWIPE_MAX_TRANSLATE - 20)); // Allow some overdrag
    }
  }, [isInteractive]);

  const handleMouseUp = useCallback(() => {
      if (!isDragging.current) return;
      isDragging.current = false;
      
      if (translateX < -SWIPE_THRESHOLD) {
        setTranslateX(-SWIPE_MAX_TRANSLATE);
        setIsSwiped(true);
      } else {
        resetSwipe();
      }
      
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
  }, [translateX, resetSwipe, handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isInteractive || e.button !== 0) return; // Only for left click
    startX.current = e.clientX;
    isDragging.current = true;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!isInteractive) return;
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current || !isInteractive) return;
    const currentX = e.touches[0].clientX;
    const deltaX = currentX - startX.current;
    
    if (deltaX < 0) { // Only allow left swipe
        setTranslateX(Math.max(deltaX, -SWIPE_MAX_TRANSLATE - 20)); // Allow some overdrag
    }
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };
  
  const handleAction = (action: 'split' | 'clear') => {
      if (action === 'split') onSplit();
      if (action === 'clear') onClear();
      resetSwipe();
  }

  return (
    <div className="relative overflow-hidden rounded-md">
        <div className="absolute top-0 right-0 h-full flex items-center z-0">
            <button onClick={() => handleAction('split')} className="h-full px-4 bg-blue-500 text-white flex flex-col items-center justify-center transition-colors hover:bg-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M7.25 2a.75.75 0 0 0-1.5 0v1.559a2.25 2.25 0 0 0-1.22.453L3.155 3.155a.75.75 0 0 0-1.06 1.06l.858.858A2.25 2.25 0 0 0 2 6.293V4.75a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .75.75h3.5a.75.75 0 0 0 0-1.5H3.207a2.249 2.249 0 0 0 1.22-.453l.858.858a.75.75 0 0 0 1.06-1.06l-.858-.858A2.25 2.25 0 0 0 6.293 5H7.85a.75.75 0 0 0 0-1.5H6.293A2.249 2.249 0 0 0 5 3.207V2.75a.75.75 0 0 0 1.5 0V4.31a2.25 2.25 0 0 0 .453 1.22l.858.858a.75.75 0 0 0 1.06-1.06l-.858-.858A2.25 2.25 0 0 0 7.25 3.207V2ZM8.75 8a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5H9.793a2.249 2.249 0 0 1-1.22.453l-.858-.858a.75.75 0 0 1-1.06 1.06l.858.858A2.25 2.25 0 0 1 8.146 11h-1.56a.75.75 0 0 1 0-1.5h1.56a2.249 2.249 0 0 1 1.22-.453l.858-.858a.75.75 0 0 1 1.06-1.06l-.858.858A2.25 2.25 0 0 1 9.707 9H11.25a.75.75 0 0 1 .75.75v1.559a2.25 2.25 0 0 1 1.22-.453l1.375.858a.75.75 0 0 1-.53 1.408l-1.375-.858a2.25 2.25 0 0 1-1.22.453V13.25a.75.75 0 0 1-1.5 0v-1.56a2.25 2.25 0 0 1-.453-1.22l-.858-.858a.75.75 0 0 1 1.06-1.06l.858.858A2.25 2.25 0 0 1 11.25 8h.75Z" /></svg>
                <span className="text-xs mt-1">Split</span>
            </button>
            <button onClick={() => handleAction('clear')} className="h-full px-4 bg-red-500 text-white flex flex-col items-center justify-center transition-colors hover:bg-red-600">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M5.75 3a.75.75 0 0 0-1.5 0v1.5H2.5a.75.75 0 0 0 0 1.5h1.75v1.5a.75.75 0 0 0 1.5 0v-1.5h1.5a.75.75 0 0 0 0-1.5h-1.5V3Zm4.5 0a.75.75 0 0 0-1.5 0v1.5H7a.75.75 0 0 0 0 1.5h1.75v1.5a.75.75 0 0 0 1.5 0v-1.5h1.5a.75.75 0 0 0 0-1.5h-1.5V3Z" clipRule="evenodd" /><path d="M2 10a2 2 0 0 0-2 2v.25a.75.75 0 0 0 1.5 0V12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 .5.5v.25a.75.75 0 0 0 1.5 0V12a2 2 0 0 0-2-2H2Z" /></svg>
                <span className="text-xs mt-1">Clear</span>
            </button>
        </div>
      <div
        className="relative z-10 touch-pan-y"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: `translateX(${translateX}px)`, transition: isDragging.current ? 'none' : 'transform 0.2s ease-out', cursor: isInteractive ? 'grab' : 'default' }}
      >
        {children}
      </div>
    </div>
  );
};


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
  onSplitItem: (itemId: string) => void;
  onClearItem: (itemId: string) => void;
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
  onSplitItem,
  onClearItem,
}) => {
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [isUnassignConfirmOpen, setIsUnassignConfirmOpen] = useState(false);
  
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
  
  return (
    <>
      <SwipeableReceiptItem onSplit={() => onSplitItem(item.id)} onClear={() => onClearItem(item.id)} isInteractive={isInteractive && !isEditing}>
        <div className={`p-3 border border-border dark:border-border-dark transition-all duration-300 bg-surface dark:bg-surface-dark ${isEditing ? 'bg-primary/5 dark:bg-primary-dark/10 ring-2 ring-primary dark:ring-primary-dark rounded-md' : ''} ${isAssigned && !isEditing ? 'opacity-70' : ''}`}>
          <div 
            className="flex justify-between items-start gap-2"
            role="button"
            tabIndex={isInteractive ? 0 : -1}
            onClick={onZoomRequest}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onZoomRequest()}
            aria-label={`Zoom on ${item.name}`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <div 
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${isAssigned ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`}
                    title={isAssigned ? 'Assigned' : 'Unassigned'}
                ></div>
                <EditableField
                  initialValue={item.name}
                  onSave={(newName) => onEditItem(item.id, newName, item.price)}
                  isInteractive={isInteractive}
                  className="font-semibold text-text-primary dark:text-text-primary-dark"
                  ariaLabel={`Edit item name for ${item.name}`}
                />
                {item.quantity > 1 && (
                  <div className="flex items-center gap-1">
                    <span className="text-text-secondary dark:text-text-secondary-dark text-sm">(x{item.quantity})</span>
                    {isInteractive && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onSplitItem(item.id); }}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900"
                            aria-label={`Split ${item.name} evenly`}
                        >
                            Split
                        </button>
                    )}
                  </div>
                )}
            </div>
             <EditableField
              initialValue={item.price}
              onSave={(newPrice) => onEditItem(item.id, item.name, parseFloat(newPrice))}
              isInteractive={isInteractive}
              type="number"
              formatter={formatCurrency}
              className="font-mono text-text-primary dark:text-text-primary-dark flex-shrink-0"
              ariaLabel={`Edit price for ${item.name}`}
            />
          </div>

          {isEditing ? (
            <div className="mt-2 animate-fade-in" id={`edit-assignment-${item.id}`}>
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
                          e.preventDefault(); // Prevents label from toggling checkbox
                          setSelectedNames([person]); // Assigns to only this person
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
          ) : (
            <div className="text-xs font-medium mt-1 flex items-center">
              <span className="text-text-secondary dark:text-text-secondary-dark mr-1">Assigned:</span>
              <button
                onClick={handleEdit}
                disabled={!isInteractive}
                className={`text-left p-1 -ml-1 rounded transition-colors disabled:cursor-default ${isInteractive ? 'text-primary dark:text-primary-dark hover:bg-primary/10 dark:hover:bg-primary-dark/10 cursor-pointer' : 'text-text-secondary dark:text-text-secondary-dark'}`}
                aria-label={`Edit assignment for ${item.name}. Currently assigned to: ${getAssignedNamesText()}`}
                aria-expanded={isEditing}
                aria-controls={`edit-assignment-${item.id}`}
              >
                {getAssignedNamesText()}
              </button>
            </div>
          )}
        </div>
      </SwipeableReceiptItem>
      <ConfirmationModal
          isOpen={isUnassignConfirmOpen}
          onClose={() => setIsUnassignConfirmOpen(false)}
          onConfirm={handleConfirmUnassign}
          title="Unassign Item"
          message={`Are you sure you want to unassign "${item.name}" from everyone?`}
          variant="destructive"
      />
    </>
  );
});


interface ReceiptDisplayProps {
  receipt: ParsedReceipt;
  assignments: Assignments;
  people: string[];
  receiptImage: string | null;
  isUndoable: boolean;
  onUpdateAssignment: (itemId: string, newNames: string[]) => void;
  onAssignAllUnassigned: (personName: string) => void;
  onSplitAllEqually: () => void;
  onUndoLastAssignment: () => void;
  isInteractive: boolean;
  onEditItem: (itemId: string, newName: string, newPrice: number) => void;
  onEditTotals: (newSubtotal: number, newTax: number, newTip: number) => void;
  onSplitItem: (itemId: string) => void;
  onClearItem: (itemId: string) => void;
}

const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({ receipt, assignments, people, receiptImage, isUndoable, onUpdateAssignment, onAssignAllUnassigned, onSplitAllEqually, onUndoLastAssignment, isInteractive, onEditItem, onEditTotals, onSplitItem, onClearItem }) => {
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAssignAllModalOpen, setIsAssignAllModalOpen] = useState(false);
  const [isSplitAllModalOpen, setIsSplitAllModalOpen] = useState(false);
  const [isZoomModalOpen, setZoomModalOpen] = useState(false);
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
                            onSplitItem={onSplitItem}
                            onClearItem={onClearItem}
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
    </>
  );
};

export default ReceiptDisplay;
