import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { logger } from "./logger";


const app = express();
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  res.on("finish", () => {
    if (reqPath.startsWith("/api")) {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        path: reqPath,
        status: res.statusCode,
        duration,
      }, `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Handle Zod validation errors
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: "Invalid input",
        details: err.errors?.map((e: any) => e.message).join(', ') || 'Validation failed'
      });
    }

    // Handle multer file size errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: "File too large",
        details: "The uploaded file exceeds the size limit"
      });
    }

    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log server errors
    if (status >= 500) {
      logger.error({ err, status }, 'Server error');
    }

    res.status(status).json({
      error: status >= 500 ? "Internal server error" : "Request failed",
      details: status >= 500 ? "An unexpected error occurred" : message
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info({ port }, `Server listening on port ${port}`);
  });
})();
