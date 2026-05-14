declare namespace Express {
  interface Request {
    authUser?: {
      id: number;
      name: string;
      role: string;
    };
  }
}
