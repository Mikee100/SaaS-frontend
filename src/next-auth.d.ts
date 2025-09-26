
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    // add other custom properties if needed
  }
}