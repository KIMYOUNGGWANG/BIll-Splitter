
import { GoogleGenAI, Type } from "@google/genai";
import { ParsedReceipt, ReceiptItem, Assignments, AssignmentUpdate } from '../types';

// Helper function to initialize the AI client on demand.
// This ensures the latest API key from the environment is used for each request,
// improving stability and resolving potential key validation errors.
function getAiClient() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API_KEY environment variable is not set. Please ensure it is configured correctly.");
    }
    return new GoogleGenAI({ apiKey });
}

const receiptSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      description: "List of all items from the receipt.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: {
            type: Type.STRING,
            description: "A unique identifier for the item, e.g., 'item-1'."
          },
          name: {
            type: Type.STRING,
            description: "The name of the item."
          },
          quantity: {
            type: Type.INTEGER,
            description: "The quantity of the item."
          },
          price: {
            type: Type.NUMBER,
            description: "The total price for this line item (quantity * unit price)."
          }
        },
        required: ["id", "name", "quantity", "price"]
      }
    },
    subtotal: {
      type: Type.NUMBER,
      description: "The subtotal amount before tax and tip."
    },
    tax: {
      type: Type.NUMBER,
      description: "The total tax amount."
    },
    tip: {
      type: Type.NUMBER,
      description: "The total tip or gratuity amount."
    }
  },
  required: ["items", "subtotal", "tax", "tip"]
};

export async function parseReceipt(imageBase64: string, mimeType: string): Promise<ParsedReceipt> {
  const ai = getAiClient();
  const imagePart = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const textPart = {
    text: `You are a receipt parsing expert. Your primary task is to determine if the given image is a receipt.
- If the image is clearly a receipt, analyze it. Extract all line items with their quantity and price, the subtotal, tax, and tip.
- If the image is NOT a receipt, or is completely unreadable, you MUST respond with a JSON object where the "items" array is empty.
Generate a unique ID for each item on valid receipts. Format the output as JSON according to the schema. If any values are missing on a valid receipt, use 0.`
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: receiptSchema,
    }
  });

  try {
    const jsonString = response.text.trim();
    let parsedData = JSON.parse(jsonString) as ParsedReceipt;

    // --- Start of validation and sanitization ---

    // 1. Check if essential parts exist
    if (!parsedData || !Array.isArray(parsedData.items)) {
      throw new Error("The AI returned an invalid structure. The 'items' array is missing.");
    }
    
    // 2. Check if any items were found. If not, it's likely not a receipt or is unreadable.
    if (parsedData.items.length === 0) {
      throw new Error("This doesn't look like a receipt, or it's too blurry to read. Please upload a clear picture of a receipt.");
    }

    // 3. Sanitize and validate each item
    const itemIds = new Set<string>();
    parsedData.items = parsedData.items.map((item: any, index: number) => {
      // Ensure required fields exist and have correct types
      const sanitizedItem: ReceiptItem = {
        id: String(item.id || `item-${index + 1}-${Date.now()}`),
        name: String(item.name || 'Unnamed Item'),
        quantity: Math.max(1, Number(item.quantity || 1)), // Default to 1, ensure it's a number
        price: Number(item.price || 0), // Default to 0, ensure it's a number
      };

      // Ensure ID is unique
      if (itemIds.has(sanitizedItem.id)) {
        sanitizedItem.id = `${sanitizedItem.id}-${index}`;
      }
      itemIds.add(sanitizedItem.id);

      return sanitizedItem;
    });

    // 4. Sanitize top-level numeric fields
    parsedData.subtotal = Number(parsedData.subtotal || 0);
    parsedData.tax = Number(parsedData.tax || 0);
    parsedData.tip = Number(parsedData.tip || 0);

    // --- End of validation and sanitization ---

    return parsedData;
  } catch (e) {
    console.error("Failed to parse or validate receipt JSON:", e, "Raw response:", response.text);
    if (e instanceof Error) {
        // Re-throw the specific, user-friendly error message
        throw new Error(e.message);
    }
    // Fallback error
    throw new Error("The AI could not read the receipt. Please try again with a clearer image.");
  }
}

// In-memory cache for assignment requests
const assignmentCache = new Map<string, AssignmentUpdate>();

export async function updateAssignments(
  userInput: string,
  items: ReceiptItem[],
  currentAssignments: Assignments
): Promise<AssignmentUpdate> {
    const ai = getAiClient();
    // 1. Caching: Create a unique key for the current state and input.
    const cacheKey = JSON.stringify({ userInput, items: items.map(i => i.id), currentAssignments });
    if (assignmentCache.has(cacheKey)) {
        console.log("Returning cached assignment result.");
        return assignmentCache.get(cacheKey)!;
    }

    const assignmentSchema = {
        type: Type.OBJECT,
        properties: {
            botResponse: {
                type: Type.STRING,
                description: "A friendly, conversational summary of the changes made. For example: 'Okay, I've assigned the Nachos to Dhruv.'"
            },
            assignments: {
                type: Type.ARRAY,
                description: "An array of assignment objects, covering all items from the receipt.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        itemId: {
                            type: Type.STRING,
                            description: "The ID of the item being assigned (e.g., 'item-1')."
                        },
                        names: {
                            type: Type.ARRAY,
                            description: "A list of names assigned to this item. Should be an empty array if unassigned.",
                            items: {
                                type: Type.STRING
                            }
                        }
                    },
                    required: ["itemId", "names"]
                }
            }
        },
        required: ["botResponse", "assignments"]
    };

  // 2. Prompt Trimming: Create a lightweight version of items for the prompt.
  const lightweightItems = items.map(({ id, name }) => ({ id, name }));

  const prompt = `You are a bill splitting assistant. Your task is to update item assignments based on a user's request and provide a conversational summary of the action taken.
  
You will be given the list of items from a receipt, the current assignments, and the user's command. 

Respond ONLY with a JSON object. This object must contain two keys: "botResponse" and "assignments".
1.  "botResponse": A friendly, natural language string summarizing the changes you made.
2.  "assignments": An array of objects, where each object represents an item from the receipt and has an "itemId" and a "names" array. Every single item from the original receipt must be present in your response. If an item is unassigned, its "names" array should be empty.

Current items: ${JSON.stringify(lightweightItems, null, 2)}
Current assignments: ${JSON.stringify(currentAssignments, null, 2)}
User command: "${userInput}"

Your response must be a valid JSON object following the specified structure.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: assignmentSchema,
    },
  });

  try {
    const jsonString = response.text.trim();
    const parsedResponse = JSON.parse(jsonString) as { botResponse: string; assignments: { itemId: string; names: string[] }[] };

    const newAssignments: Assignments = {};
    if (parsedResponse.assignments) {
        for (const item of parsedResponse.assignments) {
            newAssignments[item.itemId] = item.names;
        }
    }
    
    for (const item of items) {
        if (!(item.id in newAssignments)) {
            newAssignments[item.id] = [];
        }
    }

    const result: AssignmentUpdate = {
        newAssignments,
        botResponse: parsedResponse.botResponse || "I've updated the assignments."
    };
    
    // Store the successful result in the cache before returning.
    assignmentCache.set(cacheKey, result);
    
    return result;
  } catch (e) {
    console.error("Failed to parse assignment JSON:", e, "Raw response:", response.text);
    throw new Error("The AI failed to return a valid assignment structure. Please try rephrasing your command.");
  }
}
