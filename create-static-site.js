const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const output = path.join(root, "static-site");

async function build() {
  await fs.rm(output, { recursive: true, force: true });
  await fs.cp(path.join(root, "public"), output, { recursive: true });

  // Exclude backend-dependent admin files from the public static website.
  await fs.rm(path.join(output, "admin.html"), { force: true });
  await fs.rm(path.join(output, "js", "admin.js"), { force: true });
  await fs.rm(path.join(output, "css", "admin.css"), { force: true });

  const source = path.join(root, "storage", "products.json");
  const products = JSON.parse(await fs.readFile(source, "utf8"));
  const imageDir = path.join(output, "images", "products");

  await fs.mkdir(imageDir, { recursive: true });

  const publishedProducts = [];

  for (const product of products) {
    if (product.available === false) continue;

    const copy = { ...product };

    if (copy.image && copy.image.startsWith("/uploads/")) {
      const filename = path.basename(copy.image);
      const sourceImage = path.join(root, "uploads", filename);
      const targetImage = path.join(imageDir, filename);

      await fs.copyFile(sourceImage, targetImage);
      copy.image = `./images/products/${filename}`;
    } else if (copy.image && copy.image.startsWith("/images/")) {
      copy.image = `.${copy.image}`;
    }

    publishedProducts.push(copy);
  }

  await fs.writeFile(
    path.join(output, "products.json"),
    JSON.stringify(publishedProducts, null, 2)
  );

  await fs.writeFile(
    path.join(output, "config.json"),
    JSON.stringify({ whatsappNumber: "27712677342" }, null, 2)
  );

  const appPath = path.join(output, "js", "app.js");
  let app = await fs.readFile(appPath, "utf8");

  app = app.replaceAll("'/api/config'", "'./config.json'");
  app = app.replaceAll('"/api/config"', '"./config.json"');
  app = app.replaceAll("'/api/products'", "'./products.json'");
  app = app.replaceAll('"/api/products"', '"./products.json"');

  await fs.writeFile(appPath, app);

  console.log("Static website created in:", output);
  console.log("Published products:", publishedProducts.length);
  console.log("WhatsApp ordering number configured.");
  console.log("Original project files were not changed.");
}

build().catch(error => {
  console.error("Static build failed:", error.message);
  process.exitCode = 1;
});

