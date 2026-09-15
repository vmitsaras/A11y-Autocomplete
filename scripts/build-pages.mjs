import { cp, mkdir, readFile, rm, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const homepageSource = resolve(root, "index.html");
const homepageStyles = resolve(root, "demo-site.css");
const examplesSource = resolve(root, "examples");
const dist = resolve(root, "dist");
const docs = resolve(root, "docs");
const socialPreview = resolve(root, ".github/social-preview.png");

async function requirePath(path, description) {
  try { await access(path, constants.R_OK); }
  catch { throw new Error(`Cannot generate GitHub Pages site: missing ${description} (${path}). Run npm run build:dist first.`); }
}

await requirePath(homepageSource, "homepage source");
await requirePath(homepageStyles, "homepage stylesheet");
await requirePath(examplesSource, "example pages");
await requirePath(resolve(dist, "index.js"), "dist/index.js");
await requirePath(resolve(dist, "styles.css"), "dist/styles.css");
await requirePath(socialPreview, ".github/social-preview.png");
await rm(docs, { recursive: true, force: true });
await mkdir(docs, { recursive: true });
const homepage = await readFile(homepageSource, "utf8");
await writeFile(resolve(docs, "index.html"), homepage);
await writeFile(resolve(docs, ".nojekyll"), "");
await cp(homepageStyles, resolve(docs, "demo-site.css"));
await cp(socialPreview, resolve(docs, "social-preview.png"));
await cp(dist, resolve(docs, "dist"), { recursive: true });
await cp(examplesSource, resolve(docs, "examples"), { recursive: true });
await requirePath(resolve(docs, "index.html"), "generated docs/index.html");
await requirePath(resolve(docs, "examples/async-data/index.html"), "generated async-data example");
await requirePath(resolve(docs, "examples/async-data/destinations.json"), "generated async-data JSON fixture");
await requirePath(resolve(docs, "examples/states.html"), "generated state playground");
await requirePath(resolve(docs, "examples/match-highlighting.html"), "generated match-highlighting example");
await requirePath(resolve(docs, "examples/datalist.html"), "generated datalist example");
await requirePath(resolve(docs, "examples/form-validator-integration.html"), "generated form validator integration example");
await requirePath(resolve(docs, "examples/tag-input-integration.html"), "generated tag input integration example");
await requirePath(resolve(docs, "examples/themes.html"), "generated theme gallery");
