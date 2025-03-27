import { Request, Response } from "express";

// src/types.ts
export interface ExtendedRequest extends Request {
    user?: any;  // Adjust the type of "user" based on your data
  }
  
export interface ExtendedResponse extends Response {
    user?: any;  // Adjust the type of "user" based on your data
}
