import Module from "node:module";
import path from "node:path";

const originalResolve = Module._resolveFilename;

Module._resolveFilename = function patched(request, parent, isMain, options) {
  if (typeof request === "string" && request.startsWith("@/")) {
    const target = path.join(process.cwd(), "dist-test", "src", request.slice(2));
    return originalResolve.call(this, target, parent, isMain, options);
  }
  return originalResolve.call(this, request, parent, isMain, options);
};
