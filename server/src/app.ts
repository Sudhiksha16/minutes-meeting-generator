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

app.use(
  cors({
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

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
