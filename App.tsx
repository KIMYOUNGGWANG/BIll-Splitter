import React, { useReducer, useMemo, useState, useEffect, useCallback } from 'react';
import SessionSidebar from './components/SessionSidebar';
import ReceiptDisplay from './components/ReceiptDisplay';
import ChatInterface from './components/ChatInterface';
import { parseReceipt, updateAssignments } from './services/geminiService';
import { calculateBillSummary } from './utils/billCalculator';
import { formatAssignmentMessage, formatAssignmentUpdateMessage } from './utils/messageFormatter';
import { useToast } from './context/ToastContext';
import type { AppState, AppAction, Assignments, ReceiptSession, ChatMessage } from './types';

const initialState: AppState = {
  sessions: [],
  activeSessionId: null,
};

const MAX_UNDO_HISTORY = 10;

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_SESSIONS':
      return {
        ...state,
        sessions: [...state.sessions, ...action.payload.sessions],
        activeSessionId: state.activeSessionId ?? action.payload.makeActiveId,
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
            text: "I've parsed the receipt! First, please tell me who is splitting the bill. Enter their names separated by commas (e.g., Sue, Dhruv, Sarah)."
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
          chatHistory: [{ sender: 'system', text: `Failed to parse receipt: ${action.payload.message}`}]
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

    case 'RESET_APP':
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
                  case 'SET_PEOPLE': {
                    const uniqueNames = [...new Set([...session.people, ...action.payload.names])];
                    return { ...session, status: 'ready', people: uniqueNames,
                      chatHistory: [ ...session.chatHistory, { sender: 'user', text: action.payload.userInput }, { sender: 'bot', text: `Great! I've got ${uniqueNames.join(', ')}. Now you can tell me who had what, or click on items to assign them.` }]
                    };
                  }
                  case 'SEND_MESSAGE_START':
                    return { ...session, status: 'assigning', chatHistory: [...session.chatHistory, { sender: 'user', text: action.payload.message }] };

                  case 'SEND_MESSAGE_SUCCESS': {
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
                    // This is not an undoable assignment action, so we don't save the history.
                    return { ...session, people: updatedPeople, assignments: updatedAssignments };
                  }

                  case 'ASSIGN_ALL_UNASSIGNED': {
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
                        return { ...session, chatHistory: [...session.chatHistory, { sender: 'system', text: 'No unassigned items to assign.' }] };
                    }

                    const message = `Assigned ${itemsAssignedCount} remaining item(s) to ${personName}.`;
                    const newHistory = pushToHistory(session.assignments, session.assignmentsHistory);
                    return { ...session, assignments: newAssignments, assignmentsHistory: newHistory, chatHistory: [...session.chatHistory, { sender: 'system', text: message }] };
                  }
                  
                  case 'SPLIT_ALL_EQUALLY': {
                    if (!session.parsedReceipt || session.people.length === 0) return session;

                    const newAssignments: Assignments = {};
                    for (const item of session.parsedReceipt.items) {
                        newAssignments[item.id] = [...session.people];
                    }

                    const message = `All items have been split equally among ${session.people.length} people.`;
                    const newHistory = pushToHistory(session.assignments, session.assignmentsHistory);
                    return { ...session, assignments: newAssignments, assignmentsHistory: newHistory, chatHistory: [...session.chatHistory, { sender: 'system', text: message }] };
                  }

                  case 'UNDO_LAST_ASSIGNMENT': {
                      if (session.assignmentsHistory.length === 0) {
                          return session;
                      }
                      const newHistory = [...session.assignmentsHistory];
                      const lastState = newHistory.pop();
                      return {
                          ...session,
                          assignments: lastState!,
                          assignmentsHistory: newHistory,
                          chatHistory: [...session.chatHistory, { sender: 'system', text: 'Last assignment action undone.'}]
                      };
                  }
                  
                  case 'CLEAR_CHAT_HISTORY': {
                      return { ...session, chatHistory: [{ sender: 'system', text: 'Chat history cleared.'}] };
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

  useEffect(() => {
    const root = window.document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
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
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve([base64, file.type]);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
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
            parsedReceipt: null, assignments: {}, assignmentsHistory: [], chatHistory: [], people: []
        });
    }

    if (newSessions.length > 0) {
        dispatch({ type: 'ADD_SESSIONS', payload: { sessions: newSessions, makeActiveId: firstId } });

        newSessions.forEach(async (session, index) => {
            try {
                const file = files[index];
                const [base64, mimeType] = await fileToBase64(file);
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
  
  const handleSwitchSession = useCallback((sessionId: string) => {
    dispatch({ type: 'SWITCH_SESSION', payload: sessionId });
    setSidebarVisible(false);
  }, []);

  const handleDeleteSession = useCallback((sessionId: string) => dispatch({ type: 'DELETE_SESSION', payload: sessionId }), []);

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
      addToast(`Name '${trimmedNewName}' already exists.`, 'error');
      return;
    }
    if (oldName === trimmedNewName) return;

    dispatch({ type: 'EDIT_PERSON_NAME', payload: { sessionId: activeSession.id, oldName, newName: trimmedNewName } });
    addToast(`Name updated: '${oldName}' is now '${trimmedNewName}'.`, 'success');
  }, [activeSession, addToast]);

  const handleAssignAllUnassigned = useCallback((personName: string) => {
    if (!activeSession) return;
    dispatch({ type: 'ASSIGN_ALL_UNASSIGNED', payload: { sessionId: activeSession.id, personName } });
  }, [activeSession]);
  
  const handleSplitAllEqually = useCallback(() => {
    if (!activeSession) return;
    dispatch({ type: 'SPLIT_ALL_EQUALLY', payload: { sessionId: activeSession.id } });
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

  return (
    <div className="h-screen bg-background dark:bg-background-dark font-sans flex flex-col">
      <header className="bg-primary dark:bg-surface-dark shadow-md z-20 flex-shrink-0">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
                onClick={() => setSidebarVisible(!isSidebarVisible)}
                className="lg:hidden p-2 rounded-md text-on-primary dark:text-text-primary-dark hover:bg-white/10 dark:hover:bg-primary-dark/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                aria-label="Toggle sidebar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
            </button>
            <h1 className="text-2xl font-bold text-on-primary dark:text-text-primary-dark">
              Splitly
              <span className="text-secondary dark:text-secondary-dark font-semibold ml-1">AI</span>
            </h1>
          </div>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full text-on-primary dark:text-text-primary-dark hover:bg-white/10 dark:hover:bg-primary-dark/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-dark focus:ring-white" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7.455 2.668a.75.75 0 0 1 .183.673l-.313 3.444a.75.75 0 0 0 1.41.122l.313-3.444a.75.75 0 0 1 1.292-.592l2.431 2.431a.75.75 0 0 0 1.06-.021l2.528-2.7a.75.75 0 0 1 1.104.994l-2.528 2.7a.75.75 0 0 0 .021 1.06l2.432 2.432a.75.75 0 0 1-.592 1.292l-3.444.313a.75.75 0 0 0-.122 1.41l3.444.313a.75.75 0 0 1 .673.183l2.7-2.528a.75.75 0 0 1 .994 1.104l-2.7 2.528a.75.75 0 0 0 .021 1.06l2.432 2.432a.75.75 0 0 1-1.292.592l-2.431-2.431a.75.75 0 0 0-1.06.021l-2.7 2.528a.75.75 0 0 1-1.104-.994l2.7-2.528a.75.75 0 0 0-.021-1.06l-2.432-2.432a.75.75 0 0 1 .592-1.292l3.444-.313a.75.75 0 0 0 .122-1.41l-3.444-.313a.75.75 0 0 1-.673-.183l-2.528 2.7a.75.75 0 0 1-.994-1.104l2.528-2.7a.75.75 0 0 0-.021-1.06L3.43 4.431a.75.75 0 0 1 1.292-.592l2.431 2.431a.75.75 0 0 0 1.06.021l2.7-2.528a.75.75 0 0 1 1.104.994l-2.7 2.528a.75.75 0 0 0 .021 1.06L15.57 9.57a.75.75 0 0 1-.592 1.292l-3.444-.313a.75.75 0 0 0-.122 1.41l3.444-.313a.75.75 0 0 1 .183.673l-2.528 2.7a.75.75 0 0 1-1.104-.994l2.528-2.7a.75.75 0 0 0-.021-1.06L9.569 7.431a.75.75 0 0 1-.592-1.292l2.431-2.431a.75.75 0 0 0 .021-1.06l-2.7-2.528a.75.75 0 0 1 .673-.183Z" clipRule="evenodd" /></svg>
              ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 4.343a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM6.464 13.536a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM4.25 10.75a.75.75 0 0 0 0-1.5h-1.5a.75.75 0 0 0 0 1.5h1.5ZM13.536 6.464a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 0 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM4.343 15.657a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Z" /></svg>
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
            isVisible={isSidebarVisible}
            onClose={() => setSidebarVisible(false)}
          />
        <main className="flex-grow p-2 sm:p-4 min-w-0 transition-all duration-300 ease-in-out">
            {activeSession ? (
              <div className="flex flex-col lg:flex-row gap-4 h-full">
                <div className="w-full lg:w-1/2 h-full min-h-[500px]">
                    {activeSession.status === 'error' && (
                       <div className="flex flex-col items-center justify-center h-full p-8 bg-surface dark:bg-surface-dark rounded-lg shadow-md border border-border dark:border-border-dark">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 text-red-500 mb-4"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                          <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Parsing Failed</h3>
                          <p className="text-text-secondary dark:text-text-secondary-dark text-center mt-2 max-w-md">{activeSession.errorMessage}</p>
                       </div>
                    )}
                    {activeSession.status === 'parsing' && (
                        <div className="flex flex-col items-center justify-center h-full p-8 bg-surface dark:bg-surface-dark rounded-lg shadow-md border border-border dark:border-border-dark">
                            <svg className="animate-spin h-10 w-10 text-primary dark:text-primary-dark mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-lg font-semibold text-primary dark:text-primary-dark">Parsing Receipt...</span>
                        </div>
                    )}
                    {activeSession.parsedReceipt && (
                        <ReceiptDisplay
                            receipt={activeSession.parsedReceipt}
                            assignments={activeSession.assignments}
                            people={activeSession.people}
                            isUndoable={activeSession.assignmentsHistory.length > 0}
                            onUpdateAssignment={handleDirectAssignment}
                            onAssignAllUnassigned={handleAssignAllUnassigned}
                            onSplitAllEqually={handleSplitAllEqually}
                            onUndoLastAssignment={handleUndoLastAssignment}
                            isInteractive={activeSession.status === 'ready'}
                        />
                    )}
                </div>
                <div className="w-full lg:w-1/2 h-full min-h-[500px]">
                    <ChatInterface
                        messages={activeSession.chatHistory}
                        summary={currentBillSummary}
                        activeSession={activeSession}
                        onSendMessage={handleSendMessage}
                        onSetPeople={handleSetPeople}
                        onEditPersonName={handleEditPersonName}
                        onClearChat={handleClearChat}
                    />
                </div>
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <h2 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark mb-2">Welcome!</h2>
                    <p className="text-text-secondary dark:text-text-secondary-dark">Add a receipt using the sidebar to get started.</p>
                </div>
            )}
        </main>
      </div>
    </div>
  );
};

export default App;