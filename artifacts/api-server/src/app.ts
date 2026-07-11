import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

const allowedOrigins = [
  ...(process.env.REPLIT_DOMAINS?.split(",").map((d) => `https://${d.trim()}`) ?? []),
  ...(process.env.REPLIT_DEV_DOMAIN ? [`https://${process.env.REPLIT_DEV_DOMAIN}`] : []),
  "http://localhost",
  "http://localhost:80",
];

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
        cb(null, true);
      } else {
        cb(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

app.use(cookieParser());
app.use(express.json({ limit: "150mb" }));
app.use(express.urlencoded({ extended: true, limit: "150mb" }));

app.use("/api", router);

export default app;
