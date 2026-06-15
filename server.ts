import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header.
// Gracefully fallback if the API key is not yet set.
const apiKey = process.env.GEMINI_API_KEY || "";
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// REST API for Gemini Optimizer Advisory
app.post("/api/advisor", async (req: Request, res: Response) => {
  try {
    if (!ai) {
      return res.status(200).json({
        summary: "Notice: The server-side Gemini API key is missing or not configured yet. The optimizer is running in standard algorithmic mode. Configure your GEMINI_API_KEY inside the Secrets panel to activate deep AI-driven cognitive energy audits.",
        strategyPoints: [
          "Pre-cool the space during off-peak windows (before 2:00 PM) down to 69°F-71°F using flat or off-peak utility tariffs.",
          "Shift air conditioner usage during peak windows (2:00 PM - 8:00 PM) by floating thermostat targets up to 76°F-78°F.",
          "Maintain building insulation seals during high solar intensity periods for sustained thermal mass conservation."
        ],
        recommendedSetpointSchedule: [
          { timeStr: "08:00 AM", temp: 73 },
          { timeStr: "12:30 PM", temp: 69 },
          { timeStr: "02:00 PM", temp: 77 },
          { timeStr: "08:00 PM", temp: 72 }
        ],
        estimatedPercentSaved: 22.4
      });
    }

    const {
      currentIndoorTemp,
      targetCool,
      outdoorTemp,
      outdoorSolar,
      insulation,
      ratePlanName,
      rates,
      optimizationMode,
      recentLogs
    } = req.body;

    const formattedRates = rates.map((r: any) => 
      `${r.label} segment: hour ${r.startHour} to ${r.endHour} at $${r.rate}/kWh`
    ).join("\n");

    const formattedLogs = (recentLogs || []).map((l: any) => 
      `[${l.timestamp}] ${l.message}`
    ).join("\n");

    const prompt = `You are the core intelligence of the "Smart Energy & Comfort Optimizer" smart thermostat load-shifter.
Given the current climate telemetry, rate schedule, and operational mode:

--- TELEMETRY ---
- Current Indoor Air Temp: ${currentIndoorTemp}°F
- User Setpoint Target: ${targetCool}°F
- Outdoor ambient Temperature: ${outdoorTemp}°F
- Outdoor Solar Radiation Intensity: ${outdoorSolar}%
- Home Insulation Coefficient: ${insulation} (determines thermal leakage)
- Energy Optimization Mode: ${optimizationMode}
- Connected Utility Tariff Rate Plan: "${ratePlanName}"
- Rates Breakdown: 
${formattedRates}

--- RECENT SYSTEM CONTROL LOGS ---
${formattedLogs || "No logs available"}

Your goal is to evaluate these streams and formulate a highly professional, cost-conscious, HVAC-engineered control advice. 
You must respond with valid JSON matching the schema outlined below. Return ONLY a parseable JSON object with these keys:
1. "summary": A 2-3 sentence highly professional, analytical, quantitative summary explaining when to pre-cool the environment (using cheaper power) and when to float up (to protect the occupant's wallet during expensive peak blocks), referencing the current climate conditions.
2. "strategyPoints": A string array containing 3 to 4 specific, actionable operational bullets for the user (e.g. pre-cool trigger points, physical optimizations like shading, humidity alerts).
3. "recommendedSetpointSchedule": An array of up to 4 schedule points for peak-shaping, each containing "timeStr" (e.g., "12:00 PM") and "temp" (numeric Fahrenheit, e.g. 70).
4. "estimatedPercentSaved": A estimated coordinate percentage (numeric, e.g. 31.5) representing potential cost reduction of this AI-driven approach compared to a non-optimized baseline (flat 72°F target).

Ensure your communication avoids developer jargon, uses clear HVAC terminology, and remains highly cost-focused. Do not output markdown block wrappers (no \`\`\`json) or trailing text. Return ONLY the raw JSON string starting with { and ending with }.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "HVAC cooling/heating pre-cool economic advice summary."
            },
            strategyPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Set of highly tactical bullet parameters for comfort/savings optimization."
            },
            recommendedSetpointSchedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  timeStr: { type: Type.STRING, description: "Time of recommended trigger point." },
                  temp: { type: Type.NUMBER, description: "Recommended cooling target in Fahrenheit." }
                },
                required: ["timeStr", "temp"]
              },
              description: "Hour setpoint suggestions."
            },
            estimatedPercentSaved: {
              type: Type.NUMBER,
              description: "Predicted financial efficiency savings multiplier vs unmanaged comfort flatline."
            }
          },
          required: ["summary", "strategyPoints", "recommendedSetpointSchedule", "estimatedPercentSaved"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const parsedData = JSON.parse(textOutput.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini Advisor Server Error:", error);
    res.status(500).json({ 
      error: "Failed to generate AI advice",
      details: error.message 
    });
  }
});

// Configure Vite integration inside main server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets from client dist/ folder...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Smart Energy & Comfort Optimizer Backend active on: http://0.0.0.0:${PORT}`);
  });
}

startServer();
