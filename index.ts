import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerGoogleLoginRoutes } from "../google-login";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleTelegramWebhook, checkTaxReminders, setupTelegramWebhook } from "../telegram-bot";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy (Cloud Run / reverse proxy)
  app.set("trust proxy", 1);

  // Security headers via Helmet
  app.use(helmet({
    contentSecurityPolicy: false, // CSP handled by Vite in dev
    crossOriginEmbedderPolicy: false, // Allow embedding for OAuth flow
  }));

  // Global rate limiter: 200 requests per minute per IP
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas requisições. Tente novamente em 1 minuto." },
  });
  app.use("/api/", globalLimiter);

  // Strict rate limiter for auth endpoints: 10 per minute
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas tentativas de login. Aguarde 1 minuto." },
  });
  app.use("/api/oauth/", authLimiter);

  // Stripe webhook MUST be before express.json() for signature verification
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const { handleStripeWebhook } = await import("../stripe-webhook");
    await handleStripeWebhook(req, res);
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerGoogleLoginRoutes(app);

  // Telegram webhook endpoint
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      await handleTelegramWebhook(req.body);
      res.json({ ok: true });
    } catch (err) {
      console.error("[Telegram Webhook] Error:", err);
      res.json({ ok: true }); // Always return 200 to Telegram
    }
  });

  // Telegram webhook setup endpoint (manual trigger) - protected, owner only
  app.post("/api/telegram/setup", async (req, res) => {
    try {
      const { sdk } = await import("./sdk");
      const user = await sdk.authenticateRequest(req);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: admin access required" });
      }
    } catch {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const baseUrl = req.body?.baseUrl;
    if (!baseUrl) return res.status(400).json({ error: "baseUrl required" });
    const result = await setupTelegramWebhook(baseUrl);
    res.json(result);
  });
  // Heartbeat keep-alive endpoint (called by platform cron every 5 min)
  app.post("/api/scheduled/keep-alive", async (req, res) => {
    try {
      res.json({ ok: true, timestamp: Date.now(), uptime: process.uptime() });
    } catch (err) {
      console.error("[Keep-Alive] Error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Heartbeat: Daily/Weekly notification checks
  app.post("/api/scheduled/notifications", async (req, res) => {
    try {
      const { runDailyNotificationChecks, runWeeklyNotificationChecks } = await import("../notification-triggers");
      const now = new Date();
      const isMonday = now.getDay() === 1;

      const dailyResult = await runDailyNotificationChecks();
      let weeklyResult = null;
      if (isMonday) {
        weeklyResult = await runWeeklyNotificationChecks();
      }

      res.json({
        ok: true,
        timestamp: Date.now(),
        daily: dailyResult,
        weekly: weeklyResult,
      });
    } catch (err: any) {
      console.error("[Notifications Heartbeat] Error:", err);
      res.status(500).json({
        error: err.message || String(err),
        stack: err.stack,
        context: { url: req.url },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Google Calendar OAuth2
  app.get("/api/google/auth", async (req, res) => {
    try {
      const { getGoogleAuthUrl } = await import("../google-calendar");
      const userId = parseInt(req.query.userId as string);
      const origin = req.query.origin as string;
      if (!userId || !origin) {
        res.status(400).json({ error: "Missing userId or origin" });
        return;
      }
      const url = getGoogleAuthUrl(origin, userId);
      res.redirect(url);
    } catch (err: any) {
      console.error("[Google Auth] Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/google/callback", async (req, res) => {
    try {
      const { handleGoogleCallback } = await import("../google-calendar");
      const code = req.query.code as string;
      const state = req.query.state as string;
      if (!code || !state) {
        res.status(400).send("Missing code or state");
        return;
      }
      const result = await handleGoogleCallback(code, state);
      if (result.success) {
        const { origin } = JSON.parse(state);
        res.redirect(`${origin}/agenda?google=connected`);
      } else {
        res.status(400).send(`Erro ao conectar: ${result.error}`);
      }
    } catch (err: any) {
      console.error("[Google Callback] Error:", err);
      res.status(500).send("Erro interno ao processar callback");
    }
  });

  // iCal Calendar Feed
  app.get("/api/calendar/feed/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) { res.status(400).send("Invalid user ID"); return; }
      const { getAllCalendarEventsForFeed, getJobs, getWorkDays } = await import("../db");
      const events = await getAllCalendarEventsForFeed(userId);
      const allJobs = await getJobs({ userId });
      const now = new Date();
      const workDaysResult = await getWorkDays({ userId, month: now.getMonth(), year: now.getFullYear() });

      let ical = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//FinanceiroEuge//Agenda//PT\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:Financeiro Eug\u00ea - Agenda\r\n";

      const formatIcalDate = (ts: number) => {
        const d = new Date(ts);
        return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      };
      const formatIcalDateOnly = (ts: number) => {
        const d = new Date(ts);
        return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
      };

      // Manual events
      events.forEach((ev: any) => {
        ical += "BEGIN:VEVENT\r\n";
        ical += `UID:cal-${ev.id}@financeiro-euge\r\n`;
        if (ev.allDay) {
          ical += `DTSTART;VALUE=DATE:${formatIcalDateOnly(ev.startAt)}\r\n`;
        } else {
          ical += `DTSTART:${formatIcalDate(ev.startAt)}\r\n`;
          if (ev.endAt) ical += `DTEND:${formatIcalDate(ev.endAt)}\r\n`;
        }
        ical += `SUMMARY:${ev.title.replace(/[\r\n]/g, " ")}\r\n`;
        if (ev.description) ical += `DESCRIPTION:${ev.description.replace(/[\r\n]/g, "\\n")}\r\n`;
        ical += "END:VEVENT\r\n";
      });

      // Job events
      allJobs.forEach((job: any) => {
        if (job.startDate) {
          ical += "BEGIN:VEVENT\r\n";
          ical += `UID:job-start-${job.id}@financeiro-euge\r\n`;
          ical += `DTSTART;VALUE=DATE:${formatIcalDateOnly(job.startDate)}\r\n`;
          ical += `SUMMARY:In\u00edcio: ${job.name.replace(/[\r\n]/g, " ")}\r\n`;
          ical += "END:VEVENT\r\n";
        }
        if (job.endDate) {
          ical += "BEGIN:VEVENT\r\n";
          ical += `UID:job-end-${job.id}@financeiro-euge\r\n`;
          ical += `DTSTART;VALUE=DATE:${formatIcalDateOnly(job.endDate)}\r\n`;
          ical += `SUMMARY:Fim: ${job.name.replace(/[\r\n]/g, " ")}\r\n`;
          ical += "END:VEVENT\r\n";
        }
      });

      // Work days
      if (Array.isArray(workDaysResult)) {
        workDaysResult.forEach((wd: any) => {
          ical += "BEGIN:VEVENT\r\n";
          ical += `UID:workday-${wd.id}@financeiro-euge\r\n`;
          ical += `DTSTART;VALUE=DATE:${formatIcalDateOnly(wd.date)}\r\n`;
          ical += `SUMMARY:Di\u00e1ria: ${(wd.clientName || wd.serviceType || "Di\u00e1ria").replace(/[\r\n]/g, " ")}\r\n`;
          ical += "END:VEVENT\r\n";
        });
      }

      ical += "END:VCALENDAR\r\n";
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=agenda.ics");
      res.send(ical);
    } catch (err) {
      console.error("[iCal Feed] Error:", err);
      res.status(500).send("Error generating feed");
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Check tax reminders every 6 hours
  setInterval(() => {
    checkTaxReminders().catch(err => console.error("[Tax Reminders] Error:", err));
  }, 6 * 60 * 60 * 1000);

  // Initial check after 30 seconds
  setTimeout(() => {
    checkTaxReminders().catch(err => console.error("[Tax Reminders] Error:", err));
  }, 30000);
}

startServer().catch(console.error);
