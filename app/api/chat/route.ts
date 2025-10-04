import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

// Static data - this should match what's in the store
const PRICE_LIST: Record<string, number> = {
  "cbc": 500,
  "vitamin d": 1200,
  "thyroid": 800,
  "blood sugar": 300,
  "cholesterol": 400,
  "liver function": 600,
  "kidney function": 550,
};

const AVAILABLE_LOCATIONS = [
  "Mumbai Central",
  "Andheri West", 
  "Bandra East",
  "Powai",
  "Thane",
  "Navi Mumbai",
  "Indranagar"
];

const AVAILABLE_TESTS = [
  "CBC (Complete Blood Count)",
  "Vitamin D",
  "Thyroid Profile",
  "Blood Sugar",
  "Cholesterol Panel",
  "Liver Function Test",
  "Kidney Function Test"
];

// API Functions
async function createBooking({ 
  testName, 
  date, 
  time, 
  location 
}: { 
  testName: string; 
  date: string; 
  time: string; 
  location: string; 
}) {
  // Validate location
  if (!AVAILABLE_LOCATIONS.includes(location)) {
    return {
      error: `Location "${location}" is not available. Available locations: ${AVAILABLE_LOCATIONS.join(', ')}`
    };
  }

  // Generate booking
  const bookingId = Math.floor(Math.random() * 10000);
  const price = PRICE_LIST[testName.toLowerCase()] || 0;

  return {
    bookingId,
    testName,
    date,
    time,
    location,
    price: price > 0 ? price : undefined,
    status: "confirmed",
    confirmationMessage: "Your booking has been successfully created. You will receive a confirmation SMS shortly."
  };
}

async function priceLookup({ testName }: { testName: string }) {
  const key = testName.toLowerCase();
  const price = PRICE_LIST[key];
  
  if (price) {
    return { 
      testName, 
      price, 
      source: "Swastya.ai Price List",
      currency: "INR",
      note: "Price includes home collection service"
    };
  } else {
    // Suggest similar tests
    const availableTests = Object.keys(PRICE_LIST);
    const suggestions = availableTests.filter(test => 
      test.includes(key) || key.includes(test)
    ).slice(0, 3);
    
    return { 
      error: `Test "${testName}" not found in our price list.`,
      suggestions: suggestions.length > 0 ? suggestions : availableTests.slice(0, 5),
      availableTests: AVAILABLE_TESTS
    };
  }
}

async function handoff() {
  return { 
    message: "Our customer care executive will reach out to you within 15 minutes during business hours (9 AM - 8 PM).",
    status: "handoff_initiated",
    businessHours: "9:00 AM - 8:00 PM (Monday to Saturday)",
    alternativeContact: "You can also call us at 1800-XXX-XXXX for immediate assistance."
  };
}

async function getAvailableTests() {
  return {
    tests: AVAILABLE_TESTS,
    categories: {
      "Basic Health": ["CBC (Complete Blood Count)", "Blood Sugar"],
      "Vitamins & Minerals": ["Vitamin D"],
      "Hormones": ["Thyroid Profile"],
      "Heart Health": ["Cholesterol Panel"],
      "Organ Function": ["Liver Function Test", "Kidney Function Test"]
    }
  };
}

async function getLocations() {
  return {
    locations: AVAILABLE_LOCATIONS,
    serviceAreas: "Mumbai Metropolitan Region",
    homeCollection: true,
    labVisit: true
  };
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Define enhanced tools/functions
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "createBooking",
          description: "Book a lab test appointment with home collection or lab visit",
          parameters: {
            type: "object",
            properties: {
              testName: { 
                type: "string", 
                description: "Name of the lab test to book" 
              },
              date: { 
                type: "string", 
                description: "Preferred date for test collection (YYYY-MM-DD format)" 
              },
              time: { 
                type: "string", 
                description: "Preferred time slot (e.g., '9:00 AM - 11:00 AM')" 
              },
              location: { 
                type: "string", 
                description: "Location for test collection or lab visit",
                enum: AVAILABLE_LOCATIONS
              },
            },
            required: ["testName", "date", "time", "location"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "priceLookup",
          description: "Get price information for lab tests",
          parameters: {
            type: "object",
            properties: {
              testName: { 
                type: "string", 
                description: "Name of the lab test to get price for" 
              },
            },
            required: ["testName"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getAvailableTests",
          description: "Get list of all available lab tests and their categories",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getLocations",
          description: "Get available locations for lab tests and collection services",
          parameters: {
            type: "object",
            properties: {},
          },
        },
      },
      {
        type: "function",
        function: {
          name: "handoff",
          description: "Escalate to a human customer care agent when needed",
          parameters: { 
            type: "object", 
            properties: {} 
          },
        },
      },
    ];

    // Enhanced system message for better context
    const systemMessage = {
      role: "system" as const,
      content: `You are Swastya.ai, an AI assistant for a medical lab booking service. 

Key Information:
- You help users book lab tests, check prices, and provide information about available services
- All prices are in Indian Rupees (₹) and include home collection service
- Available locations: ${AVAILABLE_LOCATIONS.join(', ')}
- Business hours: 9:00 AM - 8:00 PM (Monday to Saturday)

Guidelines:
- Be friendly, professional, and helpful
- Always confirm booking details before proceeding
- If users ask about tests not in our list, suggest similar alternatives
- For complex medical questions, recommend consulting with a doctor
- Use emojis appropriately to make responses engaging
- When showing prices, always mention the currency (₹) and that home collection is included`
    };

    // Add system message if not present
    const messagesWithSystem = messages[0]?.role === 'system' 
      ? messages 
      : [systemMessage, ...messages];

    // Get completion from OpenAI/Groq
    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: messagesWithSystem,
      tools,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 1000,
    });

    const response = completion.choices[0].message;

    // Handle tool calls
    if (response.tool_calls) {
      const toolCall: any = response.tool_calls[0];
      let result: any = {};
      let toolName = toolCall.function.name;

      try {
        const args = JSON.parse(toolCall.function.arguments);
        
        switch (toolName) {
          case "createBooking":
            result = await createBooking(args);
            break;
          case "priceLookup":
            result = await priceLookup(args);
            break;
          case "getAvailableTests":
            result = await getAvailableTests();
            break;
          case "getLocations":
            result = await getLocations();
            break;
          case "handoff":
            result = await handoff();
            break;
          default:
            result = { error: `Unknown tool: ${toolName}` };
        }
      } catch (error) {
        result = { 
          error: `Failed to process ${toolName}: ${String(error)}` 
        };
      }

      return NextResponse.json({
        role: "assistant",
        content: JSON.stringify(result),
        toolResult: true,
        toolName,
      });
    }

    // Normal text response
    return NextResponse.json({
      role: "assistant",
      content: response.content,
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        role: "assistant", 
        content: "I apologize, but I'm experiencing technical difficulties. Please try again in a moment or contact our support team.",
        error: true
      },
      { status: 500 }
    );
  }
}