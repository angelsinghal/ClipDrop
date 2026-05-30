import sharp from "sharp";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, "../public/icons/icon.svg"));

const sizes = [192, 512];
for (const size of sizes) {
  await sharp(svg).resize(size, size).png().toFile(
    join(__dirname, `../public/icons/icon-${size}.png`),
  );
}
await sharp(svg).resize(512, 512).png().toFile(
  join(__dirname, "../public/icons/icon-maskable-512.png"),
);
console.log("Icons generated");
