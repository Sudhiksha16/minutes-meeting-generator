import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import adminRoutes from "./routes/admin.routes";
import meetingRoutes from "./routes/meeting.routes";
import aiRoutes from "./routes/ai.routes";
import aiSuggestRoutes from "./routes/aiSuggest.routes";
import orgRoutes from "./routes/org.routes";
dotenv.config();

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigin =
  allowedOrigins.length === 0
    ? true
    : (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed by CORS"));
      };

app.use(
  cors({
    origin: corsOrigin,
    exposedHeaders: ["Content-Disposition"],
  })
);
app.use(express.json());
app.use("/orgs", orgRoutes);

app.get("/", (req, res) => {
  res.send("Minutes Meeting Generator API Running 🚀");
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/meetings", meetingRoutes);
app.use("/ai", aiRoutes);
app.use("/ai", aiSuggestRoutes);

const PORT = Number(process.env.PORT) || 5000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
