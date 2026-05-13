declare global {
  namespace Express {
    interface User {
      id: string;
      role: "admin" | "client";
      email: string;
      name: string;
      [key: string]: unknown;
    }
  }
}

export {};
