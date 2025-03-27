// src/config/data-source.ts
import { DataSource } from "typeorm";
import { User } from "../entity";
import { ENV } from "./env";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: ENV.DB_HOST,
  port: parseInt(ENV.DB_PORT),
  username: ENV.DB_USERNAME,
  password: ENV.DB_PASSWORD,
  database: ENV.DB_DATABASE,
  synchronize: true,
  logging: false,
  entities: [User],
  migrations: ["src/migration/**/*.ts"],
  subscribers: ["src/subscriber/**/*.ts"],
  ssl: {
    rejectUnauthorized: false,
  },
});
