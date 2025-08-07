// Storage interface - currently not used as app uses localStorage for desk booking data
import { randomUUID } from "crypto";

// Basic storage interface for future expansion
export interface IStorage {
  // Interface for future database integration if needed
}

export class MemStorage implements IStorage {
  constructor() {
    // Currently empty as app uses localStorage
  }
}

export const storage = new MemStorage();
