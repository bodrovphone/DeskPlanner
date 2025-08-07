/**
 * MongoDB Data API Client
 * This client communicates with MongoDB Atlas through the Data API
 */

interface DataAPIRequest {
  collection: string;
  database: string;
  dataSource: string;
  filter?: Record<string, any>;
  document?: Record<string, any>;
  documents?: Record<string, any>[];
  update?: Record<string, any>;
  replacement?: Record<string, any>;
  sort?: Record<string, any>;
  limit?: number;
  skip?: number;
}

export class MongoDBDataAPIClient {
  private apiUrl: string;
  private apiKey: string;
  private database: string;
  private dataSource: string;

  constructor() {
    this.apiUrl = import.meta.env.VITE_MONGODB_DATA_API_URL || '';
    this.apiKey = import.meta.env.VITE_MONGODB_DATA_API_KEY || '';
    this.database = import.meta.env.VITE_MONGODB_DATABASE || 'deskplanner';
    this.dataSource = import.meta.env.VITE_MONGODB_CLUSTER || 'Cluster0';

    if (!this.apiUrl || !this.apiKey) {
      console.warn('MongoDB Data API credentials not configured. Using localStorage fallback.');
    }
  }

  private async request(action: string, data: Partial<DataAPIRequest>) {
    if (!this.apiUrl || !this.apiKey) {
      throw new Error('MongoDB Data API not configured');
    }

    const response = await fetch(`${this.apiUrl}/action/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        ...data,
        database: this.database,
        dataSource: this.dataSource,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`MongoDB Data API error: ${error}`);
    }

    return response.json();
  }

  async findOne(collection: string, filter: Record<string, any>) {
    const result = await this.request('findOne', {
      collection,
      filter,
    });
    return result.document;
  }

  async find(
    collection: string,
    filter: Record<string, any> = {},
    options: { sort?: Record<string, any>; limit?: number; skip?: number } = {}
  ) {
    const result = await this.request('find', {
      collection,
      filter,
      ...options,
    });
    return result.documents;
  }

  async insertOne(collection: string, document: Record<string, any>) {
    const result = await this.request('insertOne', {
      collection,
      document,
    });
    return result.insertedId;
  }

  async insertMany(collection: string, documents: Record<string, any>[]) {
    const result = await this.request('insertMany', {
      collection,
      documents,
    });
    return result.insertedIds;
  }

  async updateOne(
    collection: string,
    filter: Record<string, any>,
    update: Record<string, any>
  ) {
    const result = await this.request('updateOne', {
      collection,
      filter,
      update: { $set: update },
    });
    return result.modifiedCount;
  }

  async updateMany(
    collection: string,
    filter: Record<string, any>,
    update: Record<string, any>
  ) {
    const result = await this.request('updateMany', {
      collection,
      filter,
      update: { $set: update },
    });
    return result.modifiedCount;
  }

  async replaceOne(
    collection: string,
    filter: Record<string, any>,
    replacement: Record<string, any>
  ) {
    const result = await this.request('replaceOne', {
      collection,
      filter,
      replacement,
    });
    return result.modifiedCount;
  }

  async deleteOne(collection: string, filter: Record<string, any>) {
    const result = await this.request('deleteOne', {
      collection,
      filter,
    });
    return result.deletedCount;
  }

  async deleteMany(collection: string, filter: Record<string, any>) {
    const result = await this.request('deleteMany', {
      collection,
      filter,
    });
    return result.deletedCount;
  }

  isConfigured(): boolean {
    return !!(this.apiUrl && this.apiKey);
  }
}