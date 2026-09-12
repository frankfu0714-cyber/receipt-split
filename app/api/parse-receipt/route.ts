import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { NextRequest } from "next/server";

const receiptSchema = {
  type: SchemaType.OBJECT,
  properties: {
    items: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          price: { type: SchemaType.NUMBER },
        },
        required: ["name", "price"],
      },
    },
    tax: { type: SchemaType.NUMBER },
    tip: { type: SchemaType.NUMBER },
    total: { type: SchemaType.NUMBER },
    storeName: { type: SchemaType.STRING },
    notes: { type: SchemaType.STRING },
  },
  required: ["items", "tax", "tip", "total"],
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "GEMINI_API_KEY is not configured. Add it to your .env.local file.",
      },
      { status: 503 }
    );
  }

  let imageBase64: string;
  let mimeType: string;
  try {
    const body = await request.json();
    imageBase64 = body.imageBase64;
    mimeType = body.mimeType ?? "image/jpeg";
    if (!imageBase64) throw new Error("missing imageBase64");
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: receiptSchema as never,
      },
    });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      {
        text: `You are a receipt parser. Extract ALL line items from this receipt image.
For each item include the full item name and its price (as a positive number).
If an item has a quantity > 1, still list it once with the total line price.
Extract tax, tip (if any), and the grand total.
If a value is not present on the receipt, use 0.
Deposits, surcharges, and fees should be included as items with descriptive names.
Extract the store or restaurant name if visible (storeName field).
Return only valid JSON matching the schema — no markdown, no explanation.`,
      },
    ]);

    const text = result.response.text();
    const parsed = JSON.parse(text);
    return Response.json(parsed);
  } catch (err) {
    console.error("Gemini parse error:", err);
    return Response.json(
      { error: "Failed to parse receipt. Check your API key and try again." },
      { status: 500 }
    );
  }
}
