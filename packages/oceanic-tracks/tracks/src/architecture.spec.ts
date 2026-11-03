import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const SOURCE = __dirname;

const FORBIDDEN: Record<string, string[]> = {
  domain: ["application", "infra", "shared"],
  application: ["infra"],
};

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    return entry.isDirectory() ? sourceFiles(path) : path.endsWith(".ts") ? [path] : [];
  });
}

function layerOf(path: string): string {
  return relative(SOURCE, path).split("/")[0];
}

function importedLayers(file: string): string[] {
  const imports = [...readFileSync(file, "utf-8").matchAll(/from\s+"(\.{1,2}\/[^"]+)"/g)].map((match) => match[1]);

  return imports.map((target) => layerOf(resolve(dirname(file), target)));
}

describe("layering", () => {
  it.each(Object.entries(FORBIDDEN))("keeps %s free of the layers outside it", (layer, forbidden) => {
    const violations = sourceFiles(join(SOURCE, layer)).flatMap((file) =>
      importedLayers(file)
        .filter((imported) => forbidden.includes(imported))
        .map((imported) => `${relative(SOURCE, file)} imports ${imported}`),
    );

    expect(violations).toEqual([]);
  });
});
