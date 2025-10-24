
export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface ParsedReceipt {
  items: ReceiptItem[];
  subtotal: number;
  tax: number;

  tip: number;
}

export interface Assignments {
  [itemId: string]: string[];
}

export interface AssignmentUpdate {
  newAssignments: Assignments;
  botResponse: string;
}

export interface PersonTotal {
  name: string;
  items: { name: string; price: number }[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export type BillSummary = PersonTotal[];

export interface ChatMessage {
  sender: 'user' | 'bot' | 'system';
  text: string;
}

export type AppStatus = 'initial' | 'parsing' | 'awaiting_names' | 'ready' | 'assigning' | 'error';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

// State Management for a single receipt
export interface ReceiptSession {
  id: string;
  name: string;
  status: AppStatus;
  errorMessage: string | null;
  parsedReceipt: ParsedReceipt | null;
  assignments: Assignments;
  lastAssignmentsState: Assignments | null; // For undo functionality
  chatHistory: ChatMessage[];
  people: string[];
}

// New AppState for multi-session management
export interface AppState {
  sessions: ReceiptSession[];
  activeSessionId: string | null;
}

// Refactored Actions for multi-session support
export type AppAction =
  | { type: 'ADD_SESSIONS'; payload: { sessions: ReceiptSession[]; makeActiveId: string } }
  | { type: 'UPLOAD_SUCCESS'; payload: { sessionId: string; receipt: ParsedReceipt; initialAssignments: Assignments } }
  | { type: 'UPLOAD_ERROR'; payload: { sessionId: string; message: string } }
  | { type: 'SWITCH_SESSION'; payload: string }
  | { type: 'DELETE_SESSION'; payload: string }
  | { type: 'SET_PEOPLE'; payload: { sessionId: string; names: string[]; userInput: string } }
  | { type: 'SEND_MESSAGE_START'; payload: { sessionId: string; message: string } }
  | { type: 'SEND_MESSAGE_SUCCESS'; payload: { sessionId: string; update: AssignmentUpdate; newPeople: string[] } }
  | { type: 'SEND_MESSAGE_ERROR'; payload: { sessionId: string; message: string } }
  | { type: 'DIRECT_ASSIGNMENT'; payload: { sessionId: string; itemId: string; newNames: string[] } }
  | { type: 'EDIT_PERSON_NAME'; payload: { sessionId: string; oldName: string; newName: string } }
  | { type: 'ASSIGN_ALL_UNASSIGNED'; payload: { sessionId: string; personName: string } }
  | { type: 'SPLIT_ALL_EQUALLY'; payload: { sessionId: string } }
  | { type: 'CLEAR_CHAT_HISTORY'; payload: { sessionId: string } }
  | { type: 'UNDO_LAST_ASSIGNMENT'; payload: { sessionId: string } }
  | { type: 'RESET_APP' };