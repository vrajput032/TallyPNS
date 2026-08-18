import cors from "cors";
import express from "express";
import helmet from "helmet";
import { isAllowedOrigin } from "./config/cors.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
  })
);
app.use(express.json());

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", release: "raw-material" });
});

app.use("/api", apiRouter);

app.use(errorHandler);
