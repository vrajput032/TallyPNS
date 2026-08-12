import cors from "cors";
import express from "express";
import helmet from "helmet";
import { getAllowedOrigins } from "./config/cors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      const allowed = getAllowedOrigins();
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiRouter);

app.use(errorHandler);
