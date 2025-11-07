
import React, { useReducer, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import SessionSidebar from './components/SessionSidebar';
import ReceiptDisplay from './components/ReceiptDisplay';
import ChatInterface from './components/ChatInterface';
import CameraCapture from './components/CameraCapture';
import BottomNavBar from './components/BottomNavBar';
import ReceiptSkeleton from './components/ReceiptSkeleton';
import WelcomeScreen from './components/WelcomeScreen';
import { parseReceipt, updateAssignments } from './services/geminiService';
import { calculateBillSummary } from './utils/billCalculator';
import { formatAssignmentMessage, formatAssignmentUpdateMessage } from './utils/messageFormatter';
import { triggerHapticFeedback } from './utils/haptics';
import { useToast } from './context/ToastContext';
import type { AppState, AppAction, Assignments, ReceiptSession, ChatMessage } from './types';

const initialState: AppState = {
  sessions: [],
  activeSessionId: null,
};

const MAX_UNDO_HISTORY = 10;
const LOCAL_STORAGE_KEY = 'splitly-ai-sessions';


function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_SESSIONS':
      return action.payload;
    
    case 'ADD_SESSIONS':
      return {
        ...state,
        sessions: [...state.sessions, ...action.payload.sessions],
        activeSessionId: action.payload.makeActiveId,
      };

    case 'SET_SESSION_IMAGE':
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.payload.sessionId ? {
          ...s,
          receiptImage: action.payload.imageUrl
        } : s),
      };

    case 'UPLOAD_SUCCESS':
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.payload.sessionId ? {
          ...s,
          status: 'awaiting_names',
          parsedReceipt: action.payload.receipt,
          assignments: action.payload.initialAssignments,
          chatHistory: [{
            sender: 'bot',
            text: "I've analyzed the receipt! First, tell me who is splitting the bill. Please enter their names separated by commas (e.g., Alice, Bob, Charlie)."
          }]
        } : s),
      };

    case 'UPLOAD_ERROR':
      return {
        ...state,
        sessions: state.sessions.map(s => s.id === action.payload.sessionId ? {
          ...s,
          status: 'error',
          errorMessage: action.payload.message,
          chatHistory: [{ sender: 'system', text: `Receipt parsing failed: ${action.payload.message}`}]
        } : s),
      };

    case 'SWITCH_SESSION':
      return { ...state, activeSessionId: action.payload };
      
    case 'DELETE_SESSION': {
      const newSessions = state.sessions.filter(s => s.id !== action.payload);
      let newActiveId = state.activeSessionId;
      if (state.activeSessionId === action.payload) {
        newActiveId = newSessions.length > 0 ? newSessions[0].id : null;
      }
      return {
        ...state,
        sessions: newSessions,
        activeSessionId: newActiveId,
      };
    }

    case 'GO_HOME':
        return {
            ...state,
            activeSessionId: null,
        };

    case 'RESET_APP':
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        return initialState;

    default: {
        const getSessionId = (act: typeof action): string | null => {
            if ('payload' in act && act.payload && typeof act.payload === 'object' && 'sessionId' in act.payload) {
                return (act.payload as any).sessionId;
            }
            return null;
        }
        const sessionId = getSessionId(action);
        if (!sessionId) return state;

        return {
            ...state,
            sessions: state.sessions.map(session => {
                if (session.id !== sessionId) return session;

                const pushToHistory = (currentAssignments: Assignments, history: Assignments[]): Assignments[] => {
                    const newHistory = [...history, currentAssignments];
                    if (newHistory.length > MAX_UNDO_HISTORY) {
                        newHistory.shift();
                    }
                    return newHistory;
                };
                
                switch (action.type) {
                  case 'RETRY_PARSING_START':
                    return {
                      ...session,
                      status: 'parsing',
                      errorMessage: null,
                      chatHistory: [{ sender: 'system', text: 'Re-parsing receipt...' }],
                    };
                  case 'SET_PEOPLE': {
                    const uniqueNames = [...new Set([...session.people, ...action.payload.names])];
                    return { ...session, status: 'ready', people: uniqueNames,
                      chatHistory: [ ...session.chatHistory, { sender: 'user', text: action.payload.userInput }, { sender: 'bot', text: `Got it! I've added ${uniqueNames.join(', ')}. Now you can tell me who had what, or click on items to assign them directly.` }]
                    };
                  }
                  case 'SEND_MESSAGE_START':
                    return { ...session, status: 'assigning', chatHistory: [...session.chatHistory, { sender: 'user', text: action.payload.message }] };

                  case 'SEND_MESSAGE_SUCCESS': {
                    triggerHapticFeedback();
                    const { update, newPeople } = action.payload;
                    const oldAssignments = session.assignments;
                    const newAssignments = update.newAssignments;

                    const changedItemNames: string[] = [];
                    const allItemIds = new Set([...Object.keys(oldAssignments), ...Object.keys(newAssignments)]);

                    allItemIds.forEach(itemId => {
                        const oldNames = new Set(oldAssignments[itemId] || []);
                        const newNamesSet = new Set(newAssignments[itemId] || []);

                        if (oldNames.size !== newNamesSet.size || ![...oldNames].every(name => newNamesSet.has(name))) {
                            const item = session.parsedReceipt?.items.find(i => i.id === itemId);
                            if (item) changedItemNames.push(item.name);
                        }
                    });
                    
                    const newMessages: ChatMessage[] = [{ sender: 'bot', text: update.botResponse }];
                    if (changedItemNames.length > 0) {
                        newMessages.push({ sender: 'system', text: formatAssignmentUpdateMessage(changedItemNames) });
                    }

                    const updatedPeople = [...new Set([...session.people, ...newPeople])];
                    const newHistory = pushToHistory(oldAssignments, session.assignmentsHistory);

                    return { ...session, status: 'ready', assignments: newAssignments, assignmentsHistory: newHistory, people: updatedPeople, chatHistory: [...session.chatHistory, ...newMessages] };
                  }
                  
                  case 'SEND_MESSAGE_ERROR':
                    return { ...session, status: 'ready', chatHistory: [...session.chatHistory, { sender: 'system', text: `Error: ${action.payload.message}` }]};
                  
                  case 'DIRECT_ASSIGNMENT': {
                    triggerHapticFeedback();
                    const { itemId, newNames } = action.payload;
                    const item = session.parsedReceipt?.items.find(i => i.id === itemId);
                    if (!item) return session;
                    
                    const message = formatAssignmentMessage(item.name, newNames);
                    const newAssignments = { ...session.assignments, [itemId]: newNames };
                    const newHistory = pushToHistory(session.assignments, session.assignmentsHistory);
                    return { ...session, assignments: newAssignments, assignmentsHistory: newHistory, chatHistory: [...session.chatHistory, { sender: 'system', text: message }] };
                  }

                  case 'EDIT_PERSON_NAME': {
                    const { oldName, newName } = action.payload;
                    const updatedPeople = session.people.map(p => p === oldName ? newName : p);
                    const updatedAssignments: Assignments = {};
                    for (const itemId in session.assignments) {
                      updatedAssignments[itemId] = session.assignments[itemId].map(p => p === oldName ? newName : p);
                    }
                    return { ...session, people: updatedPeople, assignments: updatedAssignments };
                  }
                  
                  case 'EDIT_ITEM': {
                      if (!session.parsedReceipt) return session;
                      const { itemId, newName, newPrice } = action.payload;
                      const newItems = session.parsedReceipt.items.map(item => {
                          if (item.id === itemId) {
                              return { ...item, name: newName, price: newPrice };
                          }
                          return item;
                      });
                      return {
                          ...session,
                          parsedReceipt: {
                              ...session.parsedReceipt,
                              items: newItems,
                          },
                      };
                  }
                  
                  case 'EDIT_TOTALS': {
                      if (!session.parsedReceipt) return session;
                      const { newSubtotal, newTax, newTip } = action.payload;
                      return {
                          ...session,
                          parsedReceipt: {
                              ...session.parsedReceipt,
                              subtotal: newSubtotal,
                              tax: newTax,
                              tip: newTip,
                          },
                      };
                  }

                  case 'ASSIGN_ALL_UNASSIGNED': {
                    triggerHapticFeedback();
                    const { personName } = action.payload;
                    if (!session.parsedReceipt) return session;

                    const newAssignments = { ...session.assignments };
                    let itemsAssignedCount = 0;

                    for (const item of session.parsedReceipt.items) {
                        if (!newAssignments[item.id] || newAssignments[item.id].length === 0) {
                            newAssignments[item.id] = [personName];
                            itemsAssignedCount++;
                        }
                    }
                    
                    if (itemsAssignedCount === 0) {
                        return { ...session, chatHistory: [...session.chatHistory, { sender: 'system', text: 'There were no unassigned items to assign.' }] };
                    }

                    const message = `Assigned the remaining ${itemsAssignedCount} items to ${personName}.`;
                    const newHistory = pushToHistory(session.assignments, session.assignmentsHistory);
                    return { ...session, assignments: newAssignments, assignmentsHistory: newHistory, chatHistory: [...session.chatHistory, { sender: 'system', text: message }] };
                  }
                  
                  case 'SPLIT_ALL_EQUALLY': {
                    triggerHapticFeedback();
                    if (!session.parsedReceipt || session.people.length === 0) return session;

                    const newAssignments: Assignments = {};
                    for (const item of session.parsedReceipt.items) {
                        newAssignments[item.id] = [...session.people];
                    }

                    const message = `Split all items equally between ${session.people.length} people.`;
                    const newHistory = pushToHistory(session.assignments, session.assignmentsHistory);
                    return { ...session, assignments: newAssignments, assignmentsHistory: newHistory, chatHistory: [...session.chatHistory, { sender: 'system', text: message }] };
                  }

                  case 'UNDO_LAST_ASSIGNMENT': {
                      if (session.assignmentsHistory.length === 0) {
                          return session;
                      }
                      triggerHapticFeedback();
                      const newHistory = [...session.assignmentsHistory];
                      const lastState = newHistory.pop();
                      return {
                          ...session,
                          assignments: lastState!,
                          assignmentsHistory: newHistory,
                          chatHistory: [...session.chatHistory, { sender: 'system', text: 'Undid the last assignment action.'}]
                      };
                  }
                  
                  case 'CLEAR_CHAT_HISTORY': {
                      return { ...session, chatHistory: [{ sender: 'system', text: 'Chat history cleared.'}] };
                  }

                   case 'SPLIT_ITEM_EVENLY': {
                    const { itemId } = action.payload;
                    const item = session.parsedReceipt?.items.find(i => i.id === itemId);
                    if (!item || session.people.length === 0) return session;

                    triggerHapticFeedback();
                    const message = `Split ${item.name} evenly amongst everyone.`;
                    const newAssignments = { ...session.assignments, [itemId]: session.people };
                    const newHistory = pushToHistory(session.assignments, session.assignmentsHistory);
                    return { ...session, assignments: newAssignments, assignmentsHistory: newHistory, chatHistory: [...session.chatHistory, { sender: 'system', text: message }] };
                  }

                  case 'CLEAR_ITEM_ASSIGNMENT': {
                    const { itemId } = action.payload;
                    const item = session.parsedReceipt?.items.find(i => i.id === itemId);
                    if (!item) return session;

                    triggerHapticFeedback();
                    const message = `Cleared assignment for ${item.name}.`;
                    const newAssignments = { ...session.assignments, [itemId]: [] };
                    const newHistory = pushToHistory(session.assignments, session.assignmentsHistory);
                    return { ...session, assignments: newAssignments, assignmentsHistory: newHistory, chatHistory: [...session.chatHistory, { sender: 'system', text: message }] };
                  }

                  default:
                    return session;
                }
            })
        };
    }
  }
}


const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { sessions, activeSessionId } = state;
  const activeSession = sessions.find(s => s.id === activeSessionId) || null;
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setCameraOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'receipt' | 'chat'>('receipt');
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const prevChatHistoryLength = useRef(activeSession?.chatHistory.length ?? 0);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
        return localStorage.getItem('theme') as 'light' | 'dark';
    }
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
  });
  const [isSidebarVisible, setSidebarVisible] = useState(false);

  // Load state from localStorage on initial render
  useEffect(() => {
    try {
        const savedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedState) {
            const parsedState = JSON.parse(savedState);
            dispatch({ type: 'LOAD_SESSIONS', payload: parsedState });
        }
    } catch (error) {
        console.error("Failed to load sessions from localStorage", error);
        dispatch({ type: 'RESET_APP' });
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
        if (state.sessions.length > 0 || state.activeSessionId) {
             localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
        } else {
             localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
    } catch (error) {
        console.error("Failed to save sessions to localStorage", error);
    }
  }, [state]);

  // Handle theme changes
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Handle body scroll lock for modals/sidebar
  useEffect(() => {
    if (isSidebarVisible) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    return () => {
      document.body.classList.remove('modal-open');
    }
  }, [isSidebarVisible]);
  
  // Effect to show notification dot for new messages on mobile
  useEffect(() => {
    if (activeSession) {
        const currentChatHistoryLength = activeSession.chatHistory.length;
        if (currentChatHistoryLength > prevChatHistoryLength.current) {
            const lastMessage = activeSession.chatHistory[currentChatHistoryLength - 1];
            if (lastMessage && (lastMessage.sender === 'bot' || lastMessage.sender === 'system') && activeTab === 'receipt') {
                setHasNewMessage(true);
            }
        }
        prevChatHistoryLength.current = currentChatHistoryLength;
    }
  }, [activeSession?.chatHistory, activeTab, activeSession]);
  
  const handleTabChange = (tab: 'receipt' | 'chat') => {
      if (tab === 'chat') {
          setHasNewMessage(false);
      }
      setActiveTab(tab);
  };


  const currentBillSummary = useMemo(() => 
    calculateBillSummary(
      activeSession?.parsedReceipt ?? null, 
      activeSession?.assignments ?? {}, 
      activeSession?.people ?? []
    ), 
    [activeSession?.parsedReceipt, activeSession?.assignments, activeSession?.people]
  );

  const fileToBase64 = (file: File): Promise<[string, string]> => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 1920; // Max width for the compressed image, good balance of quality and size
            const QUALITY = 0.9; // JPEG quality

            let { width, height } = img;

            // Resize if the image is too large, maintaining aspect ratio
            if (width > MAX_WIDTH) {
              height = (MAX_WIDTH / width) * height;
              width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              return reject(new Error('Failed to get canvas context for image compression.'));
            }

            ctx.drawImage(img, 0, 0, width, height);
            
            // Get the compressed image data URL as a JPEG
            const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
            const base64 = dataUrl.split(',')[1];
            
            resolve([base64, 'image/jpeg']);
          } catch (e) {
              reject(e);
          } finally {
             // Clean up the object URL to avoid memory leaks
             URL.revokeObjectURL(objectUrl);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("Failed to load image. The file may be corrupt or in an unsupported format. Please try a standard image format like JPEG or PNG."));
        };
        img.src = objectUrl;
    });
  };

  const handleAddReceipts = useCallback(async (files: FileList) => {
    const newSessions: ReceiptSession[] = [];
    const firstId = `session-${Date.now()}-${Math.random()}`;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = i === 0 ? firstId : `session-${Date.now()}-${Math.random()}`;
        newSessions.push({
            id: id, name: file.name, status: 'parsing', errorMessage: null,
            parsedReceipt: null, receiptImage: null, assignments: {}, assignmentsHistory: [], chatHistory: [], people: []
        });
    }

    if (newSessions.length > 0) {
        dispatch({ type: 'ADD_SESSIONS', payload: { sessions: newSessions, makeActiveId: firstId } });

        newSessions.forEach(async (session, index) => {
            try {
                const file = files[index];
                const [base64, mimeType] = await fileToBase64(file);
                const imageUrl = `data:${mimeType};base64,${base64}`;
                dispatch({ type: 'SET_SESSION_IMAGE', payload: { sessionId: session.id, imageUrl } });
                const receipt = await parseReceipt(base64, mimeType);
                const initialAssignments = receipt.items.reduce<Assignments>((acc, item) => {
                    acc[item.id] = [];
                    return acc;
                }, {});
                dispatch({ type: 'UPLOAD_SUCCESS', payload: { sessionId: session.id, receipt, initialAssignments } });
            } catch (error) {
                const message = error instanceof Error ? error.message : 'An unknown error occurred.';
                dispatch({ type: 'UPLOAD_ERROR', payload: { sessionId: session.id, message } });
            }
        });
    }
  }, []);

  const handleCapture = useCallback((imageBlob: Blob) => {
    const file = new File([imageBlob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    handleAddReceipts(dataTransfer.files);
    setCameraOpen(false);
  }, [handleAddReceipts]);
  
  const handleSwitchSession = useCallback((sessionId: string) => {
    dispatch({ type: 'SWITCH_SESSION', payload: sessionId });
    setSidebarVisible(false);
    setActiveTab('receipt');
    setHasNewMessage(false);
  }, []);

  const handleDeleteSession = useCallback((sessionId: string) => dispatch({ type: 'DELETE_SESSION', payload: sessionId }), []);
  
  const handleGoHome = useCallback(() => {
    dispatch({ type: 'GO_HOME' });
  }, []);

  const handleSetPeople = useCallback((namesInput: string) => {
    if (!activeSession) return;
    const names = namesInput.split(',').map(name => name.trim()).filter(Boolean);
    if (names.length > 0) {
      dispatch({ type: 'SET_PEOPLE', payload: { sessionId: activeSession.id, names, userInput: namesInput } });
    }
  }, [activeSession]);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!activeSession || !activeSession.parsedReceipt) return;
    dispatch({ type: 'SEND_MESSAGE_START', payload: { sessionId: activeSession.id, message } });
    try {
      triggerHapticFeedback();
      const update = await updateAssignments(message, activeSession.parsedReceipt.items, activeSession.assignments);
      const updatedPeopleSet = new Set(activeSession.people);
      Object.values(update.newAssignments).flat().forEach(name => updatedPeopleSet.add(name));
      const newPeople = Array.from(updatedPeopleSet);
      dispatch({ type: 'SEND_MESSAGE_SUCCESS', payload: { sessionId: activeSession.id, update, newPeople } });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred.';
      dispatch({ type: 'SEND_MESSAGE_ERROR', payload: { sessionId: activeSession.id, message: errorMsg } });
    }
  }, [activeSession]);
  
  const handleRetryParsing = useCallback(async (sessionId: string) => {
    const sessionToRetry = sessions.find(s => s.id === sessionId);
    if (!sessionToRetry || !sessionToRetry.receiptImage) {
        addToast('Cannot retry: Image data is missing.', 'error');
        return;
    }

    dispatch({ type: 'RETRY_PARSING_START', payload: { sessionId } });

    try {
        const imageUrl = sessionToRetry.receiptImage;
        const mimeType = imageUrl.substring(imageUrl.indexOf(':') + 1, imageUrl.indexOf(';'));
        const base64 = imageUrl.split(',')[1];
        
        if (!base64 || !mimeType) {
            throw new Error("Cannot retry, image data is corrupt.");
        }
        
        const receipt = await parseReceipt(base64, mimeType);
        const initialAssignments = receipt.items.reduce<Assignments>((acc, item) => {
            acc[item.id] = [];
            return acc;
        }, {});
        dispatch({ type: 'UPLOAD_SUCCESS', payload: { sessionId, receipt, initialAssignments } });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        dispatch({ type: 'UPLOAD_ERROR', payload: { sessionId, message } });
    }
  }, [sessions, addToast]);
  
  const handleDirectAssignment = useCallback((itemId: string, newNames: string[]) => {
    if (!activeSession) return;
    dispatch({ type: 'DIRECT_ASSIGNMENT', payload: { sessionId: activeSession.id, itemId, newNames } });
  }, [activeSession]);
  
  const handleEditPersonName = useCallback((oldName: string, newName: string) => {
    if (!activeSession) return;
    const trimmedNewName = newName.trim();

    if (!trimmedNewName) {
      addToast('Name cannot be empty.', 'error');
      return;
    }
    if (activeSession.people.map(p => p.toLowerCase()).includes(trimmedNewName.toLowerCase()) && oldName.toLowerCase() !== trimmedNewName.toLowerCase()) {
      addToast(`The name '${trimmedNewName}' already exists.`, 'error');
      return;
    }
    if (oldName === trimmedNewName) return;

    dispatch({ type: 'EDIT_PERSON_NAME', payload: { sessionId: activeSession.id, oldName, newName: trimmedNewName } });
    addToast(`Renamed '${oldName}' to '${trimmedNewName}'.`, 'success');
  }, [activeSession, addToast]);
  
  const handleEditItem = useCallback((itemId: string, newName: string, newPrice: number) => {
      if (!activeSession) return;
      dispatch({ type: 'EDIT_ITEM', payload: { sessionId: activeSession.id, itemId, newName, newPrice } });
  }, [activeSession]);

  const handleEditTotals = useCallback((newSubtotal: number, newTax: number, newTip: number) => {
      if (!activeSession) return;
      dispatch({ type: 'EDIT_TOTALS', payload: { sessionId: activeSession.id, newSubtotal, newTax, newTip } });
  }, [activeSession]);

  const handleAssignAllUnassigned = useCallback((personName: string) => {
    if (!activeSession) return;
    dispatch({ type: 'ASSIGN_ALL_UNASSIGNED', payload: { sessionId: activeSession.id, personName } });
  }, [activeSession]);
  
  const handleSplitAllEqually = useCallback(() => {
    if (!activeSession) return;
    dispatch({ type: 'SPLIT_ALL_EQUALLY', payload: { sessionId: activeSession.id } });
  }, [activeSession]);
  
  const handleSplitItem = useCallback((itemId: string) => {
      if (!activeSession) return;
      dispatch({ type: 'SPLIT_ITEM_EVENLY', payload: { sessionId: activeSession.id, itemId } });
  }, [activeSession]);

  const handleClearItem = useCallback((itemId: string) => {
      if (!activeSession) return;
      dispatch({ type: 'CLEAR_ITEM_ASSIGNMENT', payload: { sessionId: activeSession.id, itemId } });
  }, [activeSession]);


  const handleClearChat = useCallback(() => {
    if (!activeSession) return;
    dispatch({ type: 'CLEAR_CHAT_HISTORY', payload: { sessionId: activeSession.id } });
  }, [activeSession]);

  const handleUndoLastAssignment = useCallback(() => {
    if (activeSession?.assignmentsHistory && activeSession.assignmentsHistory.length > 0) {
        dispatch({ type: 'UNDO_LAST_ASSIGNMENT', payload: { sessionId: activeSession.id } });
    } else {
        addToast("Nothing to undo.", "info");
    }
  }, [activeSession, addToast]);
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handleUndoLastAssignment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndoLastAssignment]);

  const receiptContent = activeSession && (
    <>
        {activeSession.status === 'error' && (
           <div className="flex flex-col items-center justify-center h-full p-8 bg-surface dark:bg-surface-dark rounded-lg shadow-md border border-border dark:border-border-dark text-center">
              <div className="text-6xl mb-6 animate-bounce">😕</div>
              <h3 className="text-2xl font-bold mb-3 text-text-primary dark:text-text-primary-dark">Parsing Failed</h3>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg p-4 mb-6 max-w-md w-full flex items-start gap-3">
                <div className="flex-shrink-0 text-red-500 dark:text-red-400 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-left font-medium text-red-700 dark:text-red-300">
                    {activeSession.errorMessage}
                </p>
              </div>
              <div className="bg-background dark:bg-background-dark rounded-lg p-6 mb-6 max-w-md w-full">
                <h4 className="font-bold mb-3 flex items-center justify-center sm:justify-start gap-2 text-text-primary dark:text-text-primary-dark">
                  <span>💡</span>
                  <span>Tips for better results:</span>
                </h4>
                <ul className="text-sm space-y-2 text-left text-text-secondary dark:text-text-secondary-dark">
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Ensure bright lighting and clear focus</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Capture the entire receipt</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Avoid shadows and glare</span>
                  </li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                  <button 
                    onClick={() => handleRetryParsing(activeSession.id)}
                    className="bg-primary dark:bg-primary-dark hover:bg-primary-focus dark:hover:bg-primary-focus-dark text-on-primary dark:text-on-primary-dark font-bold py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M15.312 11.342a1.25 1.25 0 0 1 .653 1.083c.032.525-.255 1.03-.738 1.282A7.001 7.001 0 0 1 2.999 10a7 7 0 0 1 11.916-5.22.75.75 0 0 1-1.042.082l-1.08-1.08a.75.75 0 0 1 .082-1.042A8.501 8.501 0 0 0 10 1.5a8.5 8.5 0 1 0 5.312 9.842ZM10.75 3.75a.75.75 0 0 0-1.5 0v4.44l-2.22-2.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 1 0-1.06-1.06L10.75 8.19V3.75Z" clipRule="evenodd" />
                    </svg>
                    Retry
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-secondary dark:bg-secondary-dark hover:bg-secondary-focus dark:hover:bg-secondary-focus-dark text-on-secondary dark:text-on-secondary-dark font-bold py-2 px-6 rounded-lg transition-colors"
                  >
                    Upload New
                  </button>
              </div>
           </div>
        )}
        {activeSession.status === 'parsing' && <ReceiptSkeleton />}
        {activeSession.parsedReceipt && (
            <ReceiptDisplay
                receipt={activeSession.parsedReceipt}
                assignments={activeSession.assignments}
                people={activeSession.people}
                receiptImage={activeSession.receiptImage}
                isUndoable={activeSession.assignmentsHistory.length > 0}
                onUpdateAssignment={handleDirectAssignment}
                onAssignAllUnassigned={handleAssignAllUnassigned}
                onSplitAllEqually={handleSplitAllEqually}
                onUndoLastAssignment={handleUndoLastAssignment}
                isInteractive={activeSession.status === 'ready'}
                onEditItem={handleEditItem}
                onEditTotals={handleEditTotals}
                onSplitItem={handleSplitItem}
                onClearItem={handleClearItem}
            />
        )}
    </>
  );

  const chatContent = activeSession && (
    <ChatInterface
        messages={activeSession.chatHistory}
        summary={currentBillSummary}
        activeSession={activeSession}
        onSendMessage={handleSendMessage}
        onSetPeople={handleSetPeople}
        onEditPersonName={handleEditPersonName}
        onClearChat={handleClearChat}
    />
  );
  

  return (
    <div className="h-full bg-background dark:bg-background-dark font-sans flex flex-col">
      <header className="bg-primary dark:bg-surface-dark shadow-md z-20 flex-shrink-0">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
                onClick={() => setSidebarVisible(!isSidebarVisible)}
                className="lg:hidden p-2 rounded-md text-on-primary dark:text-text-primary-dark hover:bg-white/10 dark:hover:bg-primary-dark/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-label="Open/close sidebar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
            <button onClick={handleGoHome} className="focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-dark focus:ring-white rounded-md" aria-label="Go to home screen">
                <h1 className="text-2xl font-bold text-on-primary dark:text-text-primary-dark">
                  Splitly
                  <span className="text-secondary dark:text-secondary-dark font-semibold ml-1">AI</span>
                </h1>
            </button>
          </div>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full text-on-primary dark:text-text-primary-dark hover:bg-white/10 dark:hover:bg-primary-dark/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-dark focus:ring-white" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.106a.75.75 0 0 1 0 1.06l-1.591 1.591a.75.75 0 1 1-1.06-1.06l1.591-1.591a.75.75 0 0 1 1.06 0ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5h2.25a.75.75 0 0 1 .75.75ZM17.803 17.803a.75.75 0 0 1-1.06 0l-1.591-1.591a.75.75 0 1 1 1.06-1.06l1.591 1.591a.75.75 0 0 1 0 1.06ZM12 21.75a.75.75 0 0 1-.75-.75v-2.25a.75.75 0 0 1 1.5 0v2.25a.75.75 0 0 1-.75-.75ZM6.106 18.894a.75.75 0 0 1-1.06 0l-1.591-1.591a.75.75 0 1 1 1.06-1.06l1.591 1.591a.75.75 0 0 1 0 1.06ZM3 12a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12ZM6.197 7.197a.75.75 0 0 1 1.06 0l1.591 1.591a.75.75 0 1 1-1.06 1.06L6.197 8.257a.75.75 0 0 1 0-1.06Z" />
                  </svg>
              ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M7.758 1.562a.75.75 0 0 1 .916.916 6 6 0 0 0 7.22 7.22.75.75 0 0 1 .916.916 7.5 7.5 0 1 1-9.052-9.052Z" clipRule="evenodd" />
                  </svg>
              )}
          </button>
        </div>
      </header>
      <div className="flex flex-grow min-h-0 relative">
          <SessionSidebar 
            sessions={sessions} 
            activeSessionId={activeSessionId}
            onAddReceipts={handleAddReceipts}
            onSwitchSession={handleSwitchSession}
            onDeleteSession={handleDeleteSession}
            onOpenCamera={() => setCameraOpen(true)}
            isVisible={isSidebarVisible}
            onClose={() => setSidebarVisible(false)}
            fileInputRef={fileInputRef}
          />
        <main className="flex-grow p-2 sm:p-4 min-w-0 transition-all duration-300 ease-in-out">
            {activeSession ? (
              <>
                {/* Desktop Layout */}
                <div className="hidden lg:grid lg:grid-cols-2 lg:gap-4 h-full">
                    <div className="h-full">
                        {receiptContent}
                    </div>
                    <div className="h-full">
                        {chatContent}
                    </div>
                </div>

                {/* Mobile Layout */}
                <div className="lg:hidden h-full flex flex-col">
                    <div className="flex-grow min-h-0 overflow-y-auto">
                        {activeTab === 'receipt' ? receiptContent : chatContent}
                    </div>
                     <div className="h-16 flex-shrink-0" /> {/* Spacer for BottomNavBar */}
                    <BottomNavBar
                        activeTab={activeTab}
                        hasNewMessage={hasNewMessage}
                        onTabChange={handleTabChange}
                    />
                </div>
              </>
            ) : (
                <WelcomeScreen onUploadClick={() => fileInputRef.current?.click()} />
            )}
        </main>
      </div>
      {isCameraOpen && (
        <CameraCapture 
            onCapture={handleCapture}
            onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
};
export default App;
