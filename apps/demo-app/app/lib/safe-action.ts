import { createSafeActionClient } from "next-safe-action";
import { withMCP } from "next-webmcp";

export const actionClient = withMCP(createSafeActionClient());
