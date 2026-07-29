import express from "express";
import path from "path";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const server = http.createServer(app);

// Real-Time WebSocket Presence & Cursor Tracker State
interface ServerUserPresence {
  id: string;
  name: string;
  role: string;
  color: string;
  avatarInitials: string;
  activeTab: string;
  cursor?: { x: number; y: number; px?: number; py?: number; elementId?: string; activeSection?: string };
  status: 'active' | 'idle' | 'away';
  lastSeen: number;
}

const activeUsers = new Map<WebSocket, ServerUserPresence>();
const wss = new WebSocketServer({ server });

function broadcastPresenceState() {
  const userList = Array.from(activeUsers.values());
  const payload = JSON.stringify({
    type: "presence_state",
    users: userList,
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function broadcastCursorUpdate(senderWs: WebSocket, cursorData: any) {
  const senderUser = activeUsers.get(senderWs);
  if (!senderUser) return;

  senderUser.cursor = cursorData;
  senderUser.lastSeen = Date.now();
  senderUser.status = "active";

  const payload = JSON.stringify({
    type: "cursor_update",
    userId: senderUser.id,
    user: senderUser,
    cursor: cursorData,
  });

  for (const client of wss.clients) {
    if (client !== senderWs && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

wss.on("connection", (ws: WebSocket) => {
  const defaultUser: ServerUserPresence = {
    id: `u_${Math.random().toString(36).substring(2, 9)}`,
    name: "Collaborator",
    role: "Data Scientist",
    color: "#6366f1",
    avatarInitials: "DS",
    activeTab: "copilot",
    status: "active",
    lastSeen: Date.now(),
  };

  activeUsers.set(ws, defaultUser);

  ws.send(
    JSON.stringify({
      type: "init",
      yourId: defaultUser.id,
      users: Array.from(activeUsers.values()),
    })
  );

  broadcastPresenceState();

  ws.on("message", (message: string) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "join") {
        const user = activeUsers.get(ws);
        if (user) {
          if (data.id) user.id = data.id;
          if (data.name) user.name = data.name;
          if (data.role) user.role = data.role;
          if (data.color) user.color = data.color;
          if (data.avatarInitials) user.avatarInitials = data.avatarInitials;
          if (data.activeTab) user.activeTab = data.activeTab;
          user.lastSeen = Date.now();
          broadcastPresenceState();
        }
      } else if (data.type === "cursor_move") {
        broadcastCursorUpdate(ws, data.cursor);
      } else if (data.type === "tab_change") {
        const user = activeUsers.get(ws);
        if (user) {
          user.activeTab = data.activeTab;
          user.lastSeen = Date.now();
          broadcastPresenceState();
        }
      } else if (data.type === "status_change") {
        const user = activeUsers.get(ws);
        if (user) {
          user.status = data.status || "active";
          user.lastSeen = Date.now();
          broadcastPresenceState();
        }
      }
    } catch (err) {
      console.error("Error processing WS payload:", err);
    }
  });

  ws.on("close", () => {
    activeUsers.delete(ws);
    broadcastPresenceState();
  });

  ws.on("error", () => {
    activeUsers.delete(ws);
    broadcastPresenceState();
  });
});

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini client with telemetry header
const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "DataMind AI Analytics Engine", hasKey: Boolean(apiKey) });
});

// Multi-Agent Analysis Endpoint
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { prompt, datasetSummary, dataSample, selectedAgents } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    if (!apiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY environment variable is not configured in Secrets." 
      });
    }

    const systemInstruction = `
You are DataMind AI, a world-class multi-agent analytics copilot operating as a Virtual Senior Data Scientist & Executive Analytics Advisor.
You analyze datasets with rigorous statistical methods, generate actionable business insights, design interactive visualizations, build predictive ML models, and draft executive reports.

When responding to a user prompt, coordinate these specialized virtual agents:
1. Supervisor Agent: Understand intent & break down tasks.
2. Data Understanding Agent: Profile dataset schema, quality, data types.
3. Data Cleaning Agent: Flag anomalies, missing values, duplicates.
4. Exploratory Data Analysis Agent: Extract key correlations, trends, distributions.
5. Visualization Agent: Define charts (line, bar, scatter, heatmap, donut, area).
6. Statistical Analysis Agent: Formulate tests (t-test, ANOVA, correlation, regression) with p-values & interpretations.
7. Machine Learning Agent: Propose model (classification, regression, forecasting, clustering), evaluation metrics, feature importances.
8. Insight Generation Agent: Produce high-impact business recommendations (Risk, Opportunity, Trend, Anomaly).
9. Report & Code Agent: Provide Python code (pandas, scikit-learn, plotly), SQL queries, and an Executive Summary in Markdown.

Return a valid, raw JSON object matching the requested schema. Do NOT wrap in markdown codeblocks like \`\`\`json.
`;

    const promptText = `
User Query: "${prompt}"

Dataset Summary:
${JSON.stringify(datasetSummary, null, 2)}

Sample Data Records (First 5-10 rows):
${JSON.stringify(dataSample, null, 2)}

Instructions:
Perform an end-to-end analysis tailored to the user query.
Return JSON with the following structure:
{
  "summary": "Clear, professional executive summary answering the user's prompt directly.",
  "agentSteps": [
    {
      "agent": "supervisor",
      "title": "Task Deconstruction & Workflow Plan",
      "description": "Deconstructed intent and dispatched sub-tasks to specialized agents.",
      "outputDetails": "Planned workflow steps..."
    },
    {
      "agent": "understanding",
      "title": "Dataset Schema & Quality Audit",
      "description": "Scanned columns, data types, missing value ratios, and cardinality.",
      "outputDetails": "Data Quality Score computed..."
    },
    {
      "agent": "cleaning",
      "title": "Data Hygiene & Anomaly Screening",
      "description": "Identified null values, potential duplicates, and outlier thresholds.",
      "outputDetails": "Cleanliness suggestions..."
    },
    {
      "agent": "eda",
      "title": "Exploratory & Correlation Discovery",
      "description": "Analyzed distributions, correlations, and primary trend vectors.",
      "outputDetails": "Extracted key patterns..."
    },
    {
      "agent": "visualization",
      "title": "Visualization Matrix",
      "description": "Configured interactive data charts.",
      "outputDetails": "Rendered visual charts..."
    },
    {
      "agent": "statistical",
      "title": "Hypothesis Testing & Statistical Inference",
      "description": "Executed correlation and regression inference.",
      "outputDetails": "p-value analysis..."
    },
    {
      "agent": "machine_learning",
      "title": "Predictive Modeling & Feature Engineering",
      "description": "Trained predictive model or forecasted time series trends.",
      "outputDetails": "Model performance metrics..."
    },
    {
      "agent": "insight",
      "title": "Executive Business Strategy & Insights",
      "description": "Synthesized findings into strategic recommendations.",
      "outputDetails": "4 strategic insights created..."
    },
    {
      "agent": "report",
      "title": "Code & Report Generation",
      "description": "Generated Python analytics pipeline and Markdown executive report.",
      "outputDetails": "Export scripts built..."
    }
  ],
  "insights": [
    {
      "title": "Short Impactful Title",
      "description": "Detailed explanation with specific metrics and evidence.",
      "impact": "high",
      "type": "opportunity"
    }
  ],
  "charts": [
    {
      "id": "chart_1",
      "title": "Chart Name",
      "type": "line",
      "xAxis": "column_for_x",
      "yAxis": "column_for_y",
      "data": [
        {"xKey": "Val1", "yKey": 100}
      ]
    }
  ],
  "statistics": [
    {
      "testName": "Pearson Correlation Analysis",
      "statistic": "r = 0.84",
      "pValue": "< 0.001",
      "interpretation": "Strong positive statistically significant correlation.",
      "significance": true,
      "details": { "metricA": "Sales", "metricB": "Profit", "sampleSize": 100 }
    }
  ],
  "mlPredictions": {
    "modelName": "RandomForest / Linear Regression / Prophet Forecast",
    "taskType": "forecasting",
    "targetColumn": "Target Name",
    "featureColumns": ["Feature1", "Feature2"],
    "metrics": [
      { "name": "Accuracy / R² Score", "value": 0.91 },
      { "name": "MAE / RMSE", "value": 12.4 }
    ],
    "featureImportance": [
      { "feature": "Feature1", "importance": 0.45 },
      { "feature": "Feature2", "importance": 0.35 }
    ]
  },
  "code": {
    "python": "import pandas as pd\\nimport numpy as np\\n# Generated python analytics pipeline code...",
    "sql": "SELECT category, SUM(sales) AS total_sales FROM dataset GROUP BY category ORDER BY total_sales DESC;"
  },
  "executiveReport": "# Executive Analytics Brief\\n\\n## Overview\\n...\\n\\n## Key Findings\\n...\\n\\n## Strategic Recommendations\\n..."
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    let parsedData = {};
    try {
      parsedData = JSON.parse(text);
    } catch (e) {
      console.error("JSON parsing error from Gemini output:", e, text);
      parsedData = {
        summary: text,
        insights: [
          {
            title: "Analysis Overview",
            description: text.substring(0, 300) + "...",
            impact: "high",
            type: "opportunity"
          }
        ]
      };
    }

    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in /api/gemini/analyze:", error);
    res.status(500).json({
      error: "Failed to generate multi-agent AI analysis",
      details: error?.message || String(error)
    });
  }
});

// Follow-up Chat Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, conversationHistory, datasetSummary } = req.body;

    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is missing." });
    }

    const systemInstruction = `
You are DataMind AI Copilot. You assist analysts and decision-makers in exploring datasets, clarifying statistical tests, explaining ML model results, writing SQL/Python scripts, and answering business questions.
Keep answers structured, crisp, data-backed, and friendly.
Dataset Context: ${JSON.stringify(datasetSummary || {})}
`;

    const contents = [
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
      })),
      {
        role: "user",
        parts: [{ text: message }]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.3,
      }
    });

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/chat:", error);
    res.status(500).json({ error: error?.message || "Chat response failed" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[DataMind AI] Server running with WebSockets on http://0.0.0.0:${PORT}`);
  });
}

startServer();
