const { promises: fs } = require("fs");

(async () => {
  try {
    await fs.rm("build", { force: true, recursive: true });
    await fs.rm("dist", { force: true, recursive: true });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
