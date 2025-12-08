export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/survey", "/dashboard", "/admin/:path*"],
};


