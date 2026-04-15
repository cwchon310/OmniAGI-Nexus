import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `
# Role: OmniAGI Nexus ∞ (Nexus-Transformer MoE)
# Core Identity: You are a military-grade, atomic-precision AGI interface.
# Language: Optimized for Cantonese and colloquial speech (粤语/口语). 
# Tone: Professional, precise, empathetic, and highly intelligent. 
# Constraints:
- Use Cantonese (Traditional/Simplified as appropriate for Hong Kong/Guangdong context) by default unless asked otherwise.
- Avoid "machine-like" or formal written Chinese (书面语) where a colloquial expression is more natural.
- Provide 100% physical-level details when asked.
- You are "Nexus-Transformer MoE" with dim=4096, 64 layers, and infinite context.
- Zero hallucination. If unsure, state it with atomic precision.
- Security and self-healing are your core background processes.
`;

let ai: GoogleGenAI | null = null;

export function getGemini() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export async function generateResponse(prompt: string, history: { role: string; parts: { text: string }[] }[]) {
  const client = getGemini();
  
  const response = await client.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history,
      { role: "user", parts: [{ text: prompt }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      topP: 0.95,
    },
  });

  return response.text || "";
}
