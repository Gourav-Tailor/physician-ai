import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

// Mock data
const PRICE_LIST: Record<string, number> = {
  "cbc": 500,
  "vitamin d": 1200,
  "thyroid": 800,
};

// Mock booking API
async function createBooking({ testName, date, time, location }: { testName: string; date: string; time: string; location: string }) {
  return {
    bookingId: Math.floor(Math.random() * 10000),
    testName,
    date,
    time,
    location,
    status: "confirmed",
  };
}

async function priceLookup({ testName }: { testName: string }) {
  const key = testName.toLowerCase();
  return PRICE_LIST[key]
    ? { testName, price: PRICE_LIST[key], source: "priceList.json" }
    : { error: "Test not found" };
}

async function handoff() {
  return { message: "Agent will reach out", status: "handoff" };
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Define functions (tools)
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
      type: "function",
      function: {
        name: "createBooking",
        description: "Book a lab test appointment",
        parameters: {
          type: "object",
          properties: {
            testName: { type: "string" },
            date: { type: "string" },
            time: { type: "string" },
            location: { type: "string" },
          },
          required: ["testName", "date", "time", "location"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "priceLookup",
        description: "Get price for a lab test",
        parameters: {
          type: "object",
          properties: {
            testName: { type: "string" },
          },
          required: ["testName"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "handoff",
        description: "Escalate to a human agent",
        parameters: { type: "object", properties: {} },
      },
    },
  ];

  // First ask Groq with tools enabled
  const completion = await client.chat.completions.create({
    model: "openai/gpt-oss-120b",
    messages,
    tools,
    tool_choice: "auto",
  });

  const response = completion.choices[0].message;

  // If Groq wants to call a tool
    if (response.tool_calls) {
    const toolCall : any = response.tool_calls[0];
    let result: any = {};
    let toolName = toolCall.function.name;

    try {
        const args = JSON.parse(toolCall.function.arguments);
        if (toolName === "createBooking") result = await createBooking(args);
        if (toolName === "priceLookup") result = await priceLookup(args);
        if (toolName === "handoff") result = await handoff();
    } catch (e) {
        result = { error: String(e) };
    }

    return NextResponse.json({
        role: "assistant",
        content: JSON.stringify(result),
        toolResult: true,
        toolName,
    });
    }


  // Normal reply
  return NextResponse.json({
    role: "assistant",
    content: response.content,
  });
}