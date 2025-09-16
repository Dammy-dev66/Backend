import { Client, Environment } from "square";

const env = process.env.SQUARE_ENVIRONMENT === "production" 
  ? Environment.Production 
  : Environment.Sandbox;

export const squareClient = new Client({
  environment: env,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});
