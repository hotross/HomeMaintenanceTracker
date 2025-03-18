import { Device, MaintenanceTask, User, InsertUser, Consumable } from "@shared/schema";
import { users, devices, maintenanceTasks, consumables } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Device operations
  getDevices(userId: number): Promise<Device[]>;
  getDevice(id: number): Promise<Device | undefined>;
  createDevice(device: Omit<Device, "id">): Promise<Device>;
  updateDevice(id: number, device: Partial<Device>): Promise<Device>;
  deleteDevice(id: number): Promise<void>;

  // Consumable operations
  getConsumables(deviceId: number): Promise<Consumable[]>;
  getConsumable(id: number): Promise<Consumable | undefined>;
  getAllConsumables(userId: number): Promise<(Consumable & { deviceName: string })[]>;
  createConsumable(consumable: Omit<Consumable, "id">): Promise<Consumable>;
  updateConsumable(id: number, consumable: Partial<Consumable>): Promise<Consumable>;
  deleteConsumable(id: number): Promise<void>;

  // Task operations
  getTasks(deviceId: number): Promise<MaintenanceTask[]>;
  getTask(id: number): Promise<MaintenanceTask | undefined>;
  createTask(task: Omit<MaintenanceTask, "id">): Promise<MaintenanceTask>;
  updateTask(id: number, task: Partial<MaintenanceTask>): Promise<MaintenanceTask>;
  completeTask(id: number, userId: number, username: string): Promise<MaintenanceTask>;
  deleteTask(id: number): Promise<void>;

  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getDevices(userId: number): Promise<Device[]> {
    return await db.select().from(devices).where(eq(devices.userId, userId));
  }

  async getDevice(id: number): Promise<Device | undefined> {
    const [device] = await db.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async createDevice(device: Omit<Device, "id">): Promise<Device> {
    const deviceData = {
      ...device,
      purchaseDate: device.purchaseDate ? new Date(device.purchaseDate) : null,
      warrantyExpirationDate: device.warrantyExpirationDate ? new Date(device.warrantyExpirationDate) : null,
    };
    const [newDevice] = await db.insert(devices).values(deviceData).returning();
    return newDevice;
  }

  async updateDevice(id: number, device: Partial<Device>): Promise<Device> {
    const deviceData = {
      ...device,
      purchaseDate: device.purchaseDate ? new Date(device.purchaseDate) : null,
      warrantyExpirationDate: device.warrantyExpirationDate ? new Date(device.warrantyExpirationDate) : null,
    };
    const [updated] = await db
      .update(devices)
      .set(deviceData)
      .where(eq(devices.id, id))
      .returning();
    return updated;
  }

  async deleteDevice(id: number): Promise<void> {
    // First delete all associated consumables
    await db.delete(consumables).where(eq(consumables.deviceId, id));
    // Then delete all associated tasks
    await db.delete(maintenanceTasks).where(eq(maintenanceTasks.deviceId, id));
    // Finally delete the device
    await db.delete(devices).where(eq(devices.id, id));
  }

  async getConsumables(deviceId: number): Promise<Consumable[]> {
    return await db
      .select()
      .from(consumables)
      .where(eq(consumables.deviceId, deviceId));
  }

  async getConsumable(id: number): Promise<Consumable | undefined> {
    const [consumable] = await db
      .select()
      .from(consumables)
      .where(eq(consumables.id, id));
    return consumable;
  }

  async getAllConsumables(userId: number): Promise<(Consumable & { deviceName: string })[]> {
    const userDevices = await this.getDevices(userId);
    const deviceIds = userDevices.map(d => d.id);

    const allConsumables: (Consumable & { deviceName: string })[] = [];

    for (const device of userDevices) {
      const deviceConsumables = await this.getConsumables(device.id);
      allConsumables.push(...deviceConsumables.map(c => ({
        ...c,
        deviceName: device.name
      })));
    }

    return allConsumables;
  }

  async createConsumable(consumable: Omit<Consumable, "id">): Promise<Consumable> {
    const [newConsumable] = await db
      .insert(consumables)
      .values(consumable)
      .returning();
    return newConsumable;
  }

  async updateConsumable(id: number, consumable: Partial<Consumable>): Promise<Consumable> {
    const [updated] = await db
      .update(consumables)
      .set(consumable)
      .where(eq(consumables.id, id))
      .returning();
    return updated;
  }

  async deleteConsumable(id: number): Promise<void> {
    await db.delete(consumables).where(eq(consumables.id, id));
  }

  async getTasks(deviceId: number): Promise<MaintenanceTask[]> {
    return await db
      .select()
      .from(maintenanceTasks)
      .where(eq(maintenanceTasks.deviceId, deviceId));
  }

  async getTask(id: number): Promise<MaintenanceTask | undefined> {
    const [task] = await db
      .select()
      .from(maintenanceTasks)
      .where(eq(maintenanceTasks.id, id));
    return task;
  }

  async createTask(task: Omit<MaintenanceTask, "id">): Promise<MaintenanceTask> {
    const [newTask] = await db.insert(maintenanceTasks).values(task).returning();
    return newTask;
  }

  async updateTask(
    id: number,
    task: Partial<MaintenanceTask>,
  ): Promise<MaintenanceTask> {
    const [updated] = await db
      .update(maintenanceTasks)
      .set(task)
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return updated;
  }

  async completeTask(id: number, userId: number, username: string): Promise<MaintenanceTask> {
    const [updated] = await db
      .update(maintenanceTasks)
      .set({
        lastCompleted: new Date(),
        isCompleted: true,
        completedBy: userId,
        completedByUsername: username,
      })
      .where(eq(maintenanceTasks.id, id))
      .returning();
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(maintenanceTasks).where(eq(maintenanceTasks.id, id));
  }
}

export const storage = new DatabaseStorage();