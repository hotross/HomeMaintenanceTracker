import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import fileUpload from "express-fileupload";
import path from "path";
import fs from "fs";
import express from 'express';


export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // File upload middleware
  app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  }));

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // File upload endpoint
  app.post("/api/upload", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).send('No files were uploaded.');
    }

    try {
      const file = req.files.file as fileUpload.UploadedFile;
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = path.join(uploadsDir, fileName);

      await file.mv(filePath);

      res.json({
        url: `/uploads/${fileName}`,
        originalName: file.name,
        type: file.mimetype
      });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).send(err.message);
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static(uploadsDir));

  // Devices routes
  app.get("/api/devices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const devices = await storage.getDevices(req.user!.id);
    res.json(devices);
  });

  app.post("/api/devices", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const device = await storage.createDevice({
      ...req.body,
      userId: req.user!.id,
    });
    res.status(201).json(device);
  });

  app.put("/api/devices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const device = await storage.getDevice(parseInt(req.params.id));
    if (!device || device.userId !== req.user!.id) {
      return res.sendStatus(404);
    }
    const updated = await storage.updateDevice(device.id, req.body);
    res.json(updated);
  });

  app.delete("/api/devices/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const device = await storage.getDevice(parseInt(req.params.id));
    if (!device || device.userId !== req.user!.id) {
      return res.sendStatus(404);
    }
    await storage.deleteDevice(device.id);
    res.sendStatus(204);
  });

  // Consumables routes
  app.get("/api/devices/:id/consumables", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const device = await storage.getDevice(parseInt(req.params.id));
    if (!device || device.userId !== req.user!.id) {
      return res.sendStatus(404);
    }
    const consumables = await storage.getConsumables(device.id);
    res.json(consumables);
  });

  app.get("/api/consumables", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const consumables = await storage.getAllConsumables(req.user!.id);
    res.json(consumables);
  });

  app.post("/api/devices/:id/consumables", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const device = await storage.getDevice(parseInt(req.params.id));
    if (!device || device.userId !== req.user!.id) {
      return res.sendStatus(404);
    }
    const consumable = await storage.createConsumable({
      ...req.body,
      deviceId: device.id,
    });
    res.status(201).json(consumable);
  });

  app.put("/api/consumables/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const consumable = await storage.getConsumable(parseInt(req.params.id));
    if (!consumable) {
      return res.status(404).json({ error: "Consumable not found" });
    }

    const device = await storage.getDevice(consumable.deviceId);
    if (!device || device.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to update this consumable" });
    }

    try {
      const updated = await storage.updateConsumable(parseInt(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating consumable:", error);
      res.status(500).json({ error: "Failed to update consumable" });
    }
  });

  app.delete("/api/consumables/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const consumable = await storage.getConsumable(parseInt(req.params.id));
    if (!consumable) {
      return res.status(404).json({ error: "Consumable not found" });
    }

    const device = await storage.getDevice(consumable.deviceId);
    if (!device || device.userId !== req.user!.id) {
      return res.status(403).json({ error: "Not authorized to delete this consumable" });
    }

    try {
      await storage.deleteConsumable(parseInt(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting consumable:", error);
      res.status(500).json({ error: "Failed to delete consumable" });
    }
  });

  // Tasks routes
  app.get("/api/devices/:id/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const device = await storage.getDevice(parseInt(req.params.id));
    console.log("[DEBUG] Getting tasks for device:", {
      deviceId: req.params.id,
      device,
      userId: req.user?.id
    });
    if (!device || device.userId !== req.user!.id) {
      console.log("[DEBUG] Device not found or unauthorized");
      return res.sendStatus(404);
    }
    const tasks = await storage.getTasks(device.id);
    console.log("[DEBUG] Retrieved tasks:", tasks);
    res.json(tasks);
  });

  app.post("/api/devices/:id/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const device = await storage.getDevice(parseInt(req.params.id));
    console.log("[DEBUG] Creating task for device:", {
      deviceId: req.params.id,
      device,
      taskData: req.body
    });
    if (!device || device.userId !== req.user!.id) {
      console.log("[DEBUG] Device not found or unauthorized");
      return res.sendStatus(404);
    }
    const task = await storage.createTask({
      ...req.body,
      deviceId: device.id,
      lastCompleted: null,
      isCompleted: false,
    });
    console.log("[DEBUG] Created task:", task);
    res.status(201).json(task);
  });

  app.put("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const task = await storage.getTask(parseInt(req.params.id));
    if (!task) return res.sendStatus(404);
    const device = await storage.getDevice(task.deviceId);
    if (!device || device.userId !== req.user!.id) {
      return res.sendStatus(404);
    }
    const updated = await storage.updateTask(task.id, req.body);
    res.json(updated);
  });

  app.post("/api/tasks/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const task = await storage.getTask(parseInt(req.params.id));
    if (!task) return res.sendStatus(404);
    const device = await storage.getDevice(task.deviceId);
    if (!device || device.userId !== req.user!.id) {
      return res.sendStatus(404);
    }
    const updated = await storage.completeTask(task.id, req.user!.id, req.user!.username);
    res.json(updated);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const task = await storage.getTask(parseInt(req.params.id));
    if (!task) return res.sendStatus(404);
    const device = await storage.getDevice(task.deviceId);
    if (!device || device.userId !== req.user!.id) {
      return res.sendStatus(404);
    }
    await storage.deleteTask(task.id);
    res.sendStatus(204);
  });

  // Add this new route for getting all tasks
  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const devices = await storage.getDevices(req.user!.id);
    const tasks = [];
    for (const device of devices) {
      const deviceTasks = await storage.getTasks(device.id);
      tasks.push(...deviceTasks);
    }
    res.json(tasks);
  });

  const httpServer = createServer(app);
  return httpServer;
}