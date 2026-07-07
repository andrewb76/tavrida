import type { DataSourceOptions } from 'typeorm';

const config: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'tavrida_lot',
  schema: 'auction',
  entities: ['dist/entities/**/*.js'],
  migrations: ['dist/migrations/**/*.js'],
  synchronize: false,
};

export default config;
