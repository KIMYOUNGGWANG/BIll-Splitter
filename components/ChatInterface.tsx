
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, BillSummary, ReceiptSession } from '../types';
import { exportBillSummary, shareBillSummary } from '../utils/billExporter';
import { useToast } from '../context/ToastContext';
import ConfirmationModal from './ConfirmationModal';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface BillSummaryProps {
  summary: BillSummary;
  receipt: ReceiptSession['parsedReceipt'];
  receiptName: string;
  isInteractive: boolean;
  onEditPersonName: (oldName: string, newName: string) => void;
  assignedItemsCount: number;
  totalItemsCount: number;
  isInsideBubble: boolean;
}


const PersonSummaryRow: React.FC<{ person: BillSummary[0]; isInteractive: boolean; onEditPersonName: (oldName: string, newName: string) => void; }> = React.memo(({ person, isInteractive, onEditPersonName }) => {
    const [editingName, setEditingName] = useState<string | null>(null);
    const [expandedName, setExpandedName] = useState<string | null>(null);
    const [newNameInput, setNewNameInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const animatedTotal = useAnimatedNumber(person.total, 500);

    useEffect(() => {
        if (editingName && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingName]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const handleEditClick = useCallback((name: string) => {
        setEditingName(name);
        setNewNameInput(name);
        setExpandedName(null);
    }, []);

    const handleCancel = useCallback(() => {
        setEditingName(null);
        setNewNameInput('');
    }, []);

    const handleSave = useCallback(() => {
        if (editingName && newNameInput.trim() && editingName !== newNameInput.trim()) {
            onEditPersonName(editingName, newNameInput.trim());
        }
        handleCancel();
    }, [editingName, newNameInput, onEditPersonName, handleCancel]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'Enter') handleSave();
        else if (event.key === 'Escape') handleCancel();
    }, [handleSave, handleCancel]);

    return (
        <div className="p-3 bg-surface dark:bg-surface-dark rounded-md shadow-sm">
            {editingName === person.name ? (
                <div>
                    <div className="flex justify-between items-center font-bold">
                        <input
                            ref={inputRef}
                            type="text"
                            value={newNameInput}
                            onChange={(e) => setNewNameInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={handleSave}
                            className="text-primary dark:text-primary-dark bg-background dark:bg-background-dark focus:bg-white dark:focus:bg-gray-800 p-1 rounded-md border-b-2 border-primary dark:border-primary-dark focus:outline-none w-full mr-2"
                            aria-label={`Edit name for ${person.name}`}
                        />
                        <div className="flex items-center gap-2">
                             <button onClick={handleSave} aria-label="Save name" className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.052-.143Z" clipRule="evenodd" /></svg>
                            </button>
                             <button onClick={handleCancel} aria-label="Cancel editing" className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300">
                               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                 <div>
                    <div
                        className="group flex justify-between items-center font-bold cursor-pointer"
                        onClick={() => setExpandedName(expandedName === person.name ? null : person.name)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setExpandedName(expandedName === person.name ? null : person.name) } }}
                        aria-expanded={expandedName === person.name}
                        aria-controls={`summary-details-${person.name}`}
                    >
                        <div className="flex items-center">
                            <span className="text-primary dark:text-primary-dark">{person.name}</span>
                            {isInteractive && (
                                <button onClick={(e) => { e.stopPropagation(); handleEditClick(person.name) }} className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 ml-1" aria-label={`Edit name for ${person.name}`}>
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-text-secondary dark:text-text-secondary-dark"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 0 0 .65.65l3.154-1.262a.5.5 0 0 0 .31-.245l11.359-11.359a.5.5 0 0 0 0-.707l-2.121-2.121a.5.5 0 0 0-.707 0L2.94 14.453a.5.5 0 0 0-.245.31Z" /></svg>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center">
                            <span className="text-lg font-mono text-primary dark:text-primary-dark ml-2">{formatCurrency(animatedTotal)}</span>
                             <svg className={`w-5 h-5 ml-2 text-text-secondary dark:text-text-secondary-dark transition-transform transform ${expandedName === person.name ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </div>
                    </div>
                    <div id={`summary-details-${person.name}`} className={`grid transition-all duration-300 ease-in-out ${expandedName === person.name ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]'}`}>
                        <div className="overflow-hidden">
                            <div className="pt-3 border-t border-border dark:border-border-dark">
                                <h4 className="text-sm font-semibold text-text-secondary dark:text-text-secondary-dark mb-1">Item Breakdown:</h4>
                                {person.items.length > 0 ? (
                                    <ul className="text-xs text-text-secondary dark:text-text-secondary-dark space-y-1 pl-2">
                                        {person.items.map((item, index) => (
                                            <li key={index} className="flex justify-between">
                                                <span className="truncate pr-2">{item.name}</span>
                                                <span className="font-mono flex-shrink-0">{formatCurrency(item.price)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-xs text-text-secondary dark:text-text-secondary-dark italic pl-2">No items assigned.</p>
                                )}
                                <div className="text-xs text-text-secondary dark:text-text-secondary-dark space-y-1 mt-3 pt-2 border-t border-dashed border-border dark:border-border-dark">
                                    <div className="flex justify-between"><span>Subtotal share:</span> <span className="font-mono">{formatCurrency(person.subtotal)}</span></div>
                                    <div className="flex justify-between"><span>Tax share:</span> <span className="font-mono">{formatCurrency(person.tax)}</span></div>
                                    <div className="flex justify-between"><span>Tip share:</span> <span className="font-mono">{formatCurrency(person.tip)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
});


const BillSummaryDisplay: React.FC<BillSummaryProps> = React.memo(({ summary, receipt, receiptName, isInteractive, onEditPersonName, assignedItemsCount, totalItemsCount, isInsideBubble }) => {
    const { addToast } = useToast();

    const handleShare = useCallback(async () => {
      const success = await shareBillSummary(summary, receipt, receiptName);
      if (success && !navigator.share) {
          addToast('Summary copied to clipboard!', 'success');
      }
    }, [summary, receipt, receiptName, addToast]);

    const progressPercentage = totalItemsCount > 0 ? (assignedItemsCount / totalItemsCount) * 100 : 0;
    const isComplete = totalItemsCount > 0 && assignedItemsCount === totalItemsCount;

    if (summary.length === 0) {
        return (
            <div className="p-4 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark text-center">
                <p className="text-text-secondary dark:text-text-secondary-dark">Enter the names of the people splitting the bill to see the summary.</p>
            </div>
        );
    }

    const containerClasses = isInsideBubble 
        ? "p-4 space-y-3"
        : "p-4 rounded-lg bg-background dark:bg-background-dark border border-border dark:border-border-dark space-y-3";

    return (
        <div className={containerClasses}>
             {!isInsideBubble && (
                 <div className="flex justify-between items-center gap-2">
                     <h3 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">Who Owes What</h3>
                 </div>
             )}
            
            <div className="flex items-center gap-2">
                 <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 flex-grow">
                    <div className={`h-2 rounded-full transition-width duration-500 ease-in-out ${isComplete ? 'bg-green-500' : 'bg-primary dark:bg-primary-dark'}`} style={{ width: `${progressPercentage}%` }}></div>
                </div>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-medium text-text-secondary dark:text-text-secondary-dark">{assignedItemsCount}/{totalItemsCount}</span>
                    <button onClick={handleShare} className="p-1 rounded-full text-text-secondary dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600" aria-label={navigator.share ? 'Share summary' : 'Copy summary'}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M13 4.5a2.5 2.5 0 1 1 .702 4.864l-3.5 3.5a2.5 2.5 0 1 1-3.536-3.536l2.05-2.05a.75.75 0 0 1 1.06 1.06l-2.05 2.05a1 1 0 1 0 1.414 1.414l3.5-3.5a1 1 0 0 0-1.414-1.414L10.91 8.586A2.5 2.5 0 0 1 13 4.5ZM7 15.5a2.5 2.5 0 1 1-.702-4.864l3.5-3.5a2.5 2.5 0 1 1 3.536 3.536l-2.05 2.05a.75.75 0 0 1-1.06-1.06l2.05-2.05a1 1 0 1 0-1.414-1.414l-3.5 3.5a1 1 0 0 0 1.414 1.414L9.09 11.414A2.5 2.5 0 0 1 7 15.5Z" /></svg>
                    </button>
                     <button onClick={() => exportBillSummary(summary, receipt, receiptName)} className="p-1 rounded-full text-text-secondary dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600" aria-label="Export summary">
                       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
                    </button>
                </div>
            </div>
            
            {isComplete && (
                <div className="text-green-600 dark:text-green-400 text-xs font-semibold flex items-center justify-center gap-1 -mt-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.84-9.44a.75.75 0 0 0-1.18-.94l-2.65 3.18-1.47-1.47a.75.75 0 1 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l3.25-3.88Z" clipRule="evenodd" /></svg>
                    <span>All items assigned!</span>
                </div>
            )}
            
            {summary.map(person => (
                <PersonSummaryRow 
                    key={person.name}
                    person={person}
                    isInteractive={isInteractive}
                    onEditPersonName={onEditPersonName}
                />
            ))}
        </div>
    );
});


interface ChatInterfaceProps {
  messages: ChatMessage[];
  summary: BillSummary;
  activeSession: ReceiptSession | null;
  onSendMessage: (message: string) => void;
  onSetPeople: (names: string) => void;
  onEditPersonName: (oldName: string, newName: string) => void;
  onClearChat: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, summary, activeSession, onSendMessage, onSetPeople, onEditPersonName, onClearChat }) => {
  const [input, setInput] = useState('');
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  useEffect(scrollToBottom, [messages, summary, scrollToBottom]);
  
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !activeSession) return;

    if (activeSession.status === 'awaiting_names') {
        onSetPeople(input.trim());
    } else if (activeSession.status === 'ready' || activeSession.status === 'assigning') {
        onSendMessage(input.trim());
    }
    setInput('');
  }, [input, activeSession, onSetPeople, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleConfirmClearChat = useCallback(() => {
    onClearChat();
    setIsClearConfirmOpen(false);
  }, [onClearChat]);

  const getPlaceholderText = () => {
    if (!activeSession) return "Loading...";
    switch (activeSession.status) {
        case 'awaiting_names':
            return 'Enter names, e.g., "Sue, Dhruv, Sarah"';
        case 'ready':
            return 'e.g., "Dhruv had the nachos" (Shift+Enter for newline)';
        case 'assigning':
            return 'Thinking...';
        default:
            return 'Waiting for receipt...';
    }
  };

  const isInputDisabled = !activeSession || (activeSession.status !== 'ready' && activeSession.status !== 'awaiting_names');
  const isNameEditingEnabled = activeSession?.status === 'ready';

  const totalItemsCount = activeSession?.parsedReceipt?.items.length ?? 0;
  const assignedItemsCount = activeSession?.parsedReceipt?.items.filter(item => 
      activeSession.assignments[item.id] && activeSession.assignments[item.id].length > 0
  ).length ?? 0;


  return (
    <>
        <div className="bg-surface dark:bg-surface-dark rounded-lg shadow-md border border-border dark:border-border-dark h-full flex flex-col p-4">
          <div className="flex justify-between items-center gap-2 mb-4 pb-4 border-b border-border dark:border-border-dark">
              <h2 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">Smart Chat & Summary</h2>
              {messages.length > 0 && (
                <button 
                    onClick={() => setIsClearConfirmOpen(true)} 
                    className="p-2 rounded-full text-text-secondary dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-600" 
                    aria-label="Clear chat history"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4.5h8V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6ZM5.25 5.25a.75.75 0 0 0-.75.75v.01c0 .414.336.75.75.75H14.75a.75.75 0 0 0 .75-.75V6a.75.75 0 0 0-.75-.75H5.25Z" clipRule="evenodd" />
                      <path d="M5.057 7.443a.75.75 0 0 0-1.06 1.06l1.75 1.75a.75.75 0 1 0 1.06-1.06l-1.75-1.75Zm9.943 0a.75.75 0 1 0-1.06 1.06l1.75 1.75a.75.75 0 1 0 1.06-1.06l-1.75-1.75Z" />
                      <path fillRule="evenodd" d="M3.5 10a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 0 1.5H4.25A.75.75 0 0 1 3.5 10Z" clipRule="evenodd" />
                    </svg>
                </button>
              )}
          </div>
          
          <div className="flex-grow overflow-y-auto mb-4 pr-2 space-y-4">
            {messages.map((msg, index) => {
               if (msg.sender === 'system') {
                    return (
                        <div key={index} className="text-center">
                            <span className="text-xs text-text-secondary dark:text-text-secondary-dark bg-background dark:bg-background-dark px-2 py-1 rounded-full">{msg.text}</span>
                        </div>
                    )
               }
               return (
                <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender !== 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary dark:bg-primary-dark flex items-center justify-center text-on-primary dark:text-on-primary-dark text-sm font-bold flex-shrink-0">AI</div>
                    )}
                    <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-lg shadow-sm ${
                        msg.sender === 'user' ? 'bg-primary dark:bg-primary-dark text-on-primary dark:text-on-primary-dark' : 'bg-background dark:bg-background-dark text-text-primary dark:text-text-primary-dark'
                    }`}>
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.text}</p>
                    </div>
                </div>
               );
            })}
             {activeSession?.status === 'assigning' && (
                 <div className="flex items-end gap-2 justify-start">
                     <div className="w-8 h-8 rounded-full bg-primary dark:bg-primary-dark flex items-center justify-center text-white dark:text-black text-sm font-bold flex-shrink-0">AI</div>
                     <div className="px-4 py-2 rounded-lg bg-background dark:bg-background-dark text-text-primary dark:text-text-primary-dark shadow-sm">
                        <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-primary dark:bg-primary-dark rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-primary dark:bg-primary-dark rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-primary dark:bg-primary-dark rounded-full animate-bounce"></div>
                        </div>
                     </div>
                 </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {activeSession && (
             <div className="mb-4">
                {summary.length > 0 ? (
                    <div className="flex items-end gap-2 justify-start">
                        <div className="w-8 h-8 rounded-full bg-primary dark:bg-primary-dark flex items-center justify-center text-on-primary dark:text-on-primary-dark text-sm font-bold flex-shrink-0 self-start">AI</div>
                        <div className="w-full max-w-full rounded-lg shadow-sm bg-background dark:bg-background-dark text-text-primary dark:text-text-primary-dark">
                            <BillSummaryDisplay 
                                summary={summary} 
                                receipt={activeSession.parsedReceipt}
                                receiptName={activeSession.name}
                                isInteractive={isNameEditingEnabled} 
                                onEditPersonName={onEditPersonName}
                                assignedItemsCount={assignedItemsCount}
                                totalItemsCount={totalItemsCount}
                                isInsideBubble={true}
                            />
                        </div>
                    </div>
                ) : (
                    <BillSummaryDisplay 
                        summary={summary} 
                        receipt={activeSession.parsedReceipt}
                        receiptName={activeSession.name}
                        isInteractive={isNameEditingEnabled} 
                        onEditPersonName={onEditPersonName}
                        assignedItemsCount={assignedItemsCount}
                        totalItemsCount={totalItemsCount}
                        isInsideBubble={false}
                    />
                )}
            </div>
          )}


          <form onSubmit={handleSubmit} className="mt-auto flex gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholderText()}
              disabled={isInputDisabled}
              className="flex-grow p-3 border border-border dark:border-border-dark rounded-lg focus:ring-2 focus:ring-primary dark:focus:ring-primary-dark focus:outline-none transition-shadow disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed bg-white dark:bg-gray-900 text-text-primary dark:text-text-primary-dark resize-none"
              aria-label="Chat input"
            />
            <button
              type="submit"
              disabled={isInputDisabled || !input.trim()}
              className="bg-secondary dark:bg-secondary-dark hover:bg-secondary-focus dark:hover:bg-secondary-focus-dark text-on-secondary dark:text-on-secondary-dark font-bold py-3 px-5 rounded-lg transition-colors disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center self-end"
              aria-label="Send message"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M3.105 3.105a.75.75 0 0 1 .814-.156l14.682 6.206a.75.75 0 0 1 0 1.302L3.919 17.051a.75.75 0 0 1-.814-.156l-.619-.62a.75.75 0 0 1 .157-.814L6.9 12 2.64 8.535a.75.75 0 0 1-.157-.814l.62-.619Z" />
              </svg>
            </button>
          </form>
          <div className="text-xs text-text-secondary dark:text-text-secondary-dark text-center pt-2 mt-2 flex items-center justify-center gap-4 border-t border-border dark:border-border-dark">
            <span className="flex items-center gap-1">
                <kbd className="px-2 py-1.5 text-xs font-sans font-semibold text-text-secondary dark:text-text-secondary-dark bg-background dark:bg-background-dark rounded border border-b-2 border-border dark:border-border-dark">
                Ctrl
                </kbd>
                <span>+</span>
                <kbd className="px-2 py-1.5 text-xs font-sans font-semibold text-text-secondary dark:text-text-secondary-dark bg-background dark:bg-background-dark rounded border border-b-2 border-border dark:border-border-dark">
                K
                </kbd>
                <span className="ml-1">to focus</span>
            </span>
            <span className="flex items-center gap-1">
                <kbd className="px-2 py-1.5 text-xs font-sans font-semibold text-text-secondary dark:text-text-secondary-dark bg-background dark:bg-background-dark rounded border border-b-2 border-border dark:border-border-dark">
                Ctrl
                </kbd>
                <span>+</span>
                <kbd className="px-2 py-1.5 text-xs font-sans font-semibold text-text-secondary dark:text-text-secondary-dark bg-background dark:bg-background-dark rounded border border-b-2 border-border dark:border-border-dark">
                Z
                </kbd>
                <span className="ml-1">to undo</span>
            </span>
          </div>
        </div>
        <ConfirmationModal
            isOpen={isClearConfirmOpen}
            onClose={() => setIsClearConfirmOpen(false)}
            onConfirm={handleConfirmClearChat}
            title="Clear Chat History"
            message="Are you sure you want to clear the chat history for this receipt? This action cannot be undone, but item assignments will not be affected."
        />
    </>
  );
};

export default ChatInterface;
