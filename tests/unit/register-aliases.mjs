// Testes unitários com o Node (node:test), sem dependências: resolve o alias
// @/ (tsconfig.json) e os imports sem extensão de src/, como o Next.js faz.
import { registerHooks } from "node:module";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = fileURLToPath(new URL("../../src/", import.meta.url));

registerHooks({
  resolve(specifier, context, next) {
    let target;
    if (specifier.startsWith("@/")) target = path.join(SRC, specifier.slice(2));
    else if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    else return next(specifier, context);
    for (const ext of ["", ".ts", ".tsx"]) {
      if (existsSync(target + ext) && (ext || path.extname(target))) return next(pathToFileURL(target + ext).href, context);
    }
    return next(specifier, context);
  },
});
