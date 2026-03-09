import { createSafeActionClient } from "next-safe-action";
import { withMCP } from "webmcp-next";

export const actionClient = withMCP(createSafeActionClient());
