import { Logger } from '@nestjs/common';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

class DatabaseMongooseConfig {
  private static instance: DatabaseMongooseConfig | null = null;
  private readonly logger = new Logger(DatabaseMongooseConfig.name);
  private readonly options: MongooseModuleOptions;

  private constructor() {
    const uri =
      process.env.MONGO_URI || 'mongodb://localhost:27017/chatbot_aguilar';

    this.options = {
      uri,
      // Retrys cortos para no bloquear demasiado el arranque.
      retryAttempts: 3,
      retryDelay: 1000,
      connectionFactory: (connection: Connection) => {
        this.logger.log('DB ON');
        return connection;
      },
      connectionErrorFactory: (error: Error) => {
        this.logger.error(`DB OFF: ${error.message}`);
        return error;
      },
    };
  }

  static getInstance(): DatabaseMongooseConfig {
    if (!DatabaseMongooseConfig.instance) {
      DatabaseMongooseConfig.instance = new DatabaseMongooseConfig();
    }

    return DatabaseMongooseConfig.instance;
  }

  getOptions(): MongooseModuleOptions {
    return this.options;
  }
}

export async function getDatabaseConfig(): Promise<MongooseModuleOptions> {
  return DatabaseMongooseConfig.getInstance().getOptions();
}
