import helmet from "helmet";
import { getEnvFrontendUrls } from "../env.js";

export function getHelmetMiddleware(): ReturnType<typeof helmet> {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: ["'self'", ...getEnvFrontendUrls()],
        frameAncestors: ["'none'"],
        formAction: ["'none'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: "deny" }
  });
}
