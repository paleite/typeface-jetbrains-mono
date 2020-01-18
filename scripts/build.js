const path = require("path");
const fs = require("fs").promises;
const prettier = require("prettier");
const globby = require("globby");
const fontkit = require("fontkit");

const fontkitOpenAsync = filename =>
  new Promise((resolve, reject) => {
    fontkit.open(filename, null, (err, font) => {
      if (err) {
        reject(err);
      }

      const fontStyle = font["OS/2"].fsSelection.italic
        ? "italic"
        : font["OS/2"].fsSelection.oblique
        ? "oblique"
        : "normal";
      const fontFeatureSettings = font.availableFeatures;

      const relativename = path.relative(process.cwd(), filename);

      const header = `/* ${path.basename(filename, ".woff")} - ${
        font.copyright
      } */`;
      const fontFace = {
        "font-family": `"${font.familyName}"`,
        "font-style": fontStyle,
        "font-weight": font["OS/2"].usWeightClass,
        "font-feature-settings":
          fontFeatureSettings.length > 0
            ? `${fontFeatureSettings.map(feature => `"${feature}" 1`).join()}`
            : undefined,
        "font-display": "swap",
        src: [
          `local("${font.fullName}")`,
          `local("${font.postscriptName}")`,
          `url("${relativename.replace(/woff/g, "woff2")}") format("woff2")`,
          `url("${relativename}") format("woff")`
        ].join()
      };
      const fontFaceSource = Object.keys(fontFace)
        .map(key => `${key}: ${fontFace[key]};`)
        .join("\n");

      const output = `${header}\n@font-face { ${fontFaceSource} }\n`;

      resolve(output);
    });
  });

(async () => {
  const filePaths = await globby(["**/*.woff"], {
    cwd: path.join(__dirname, "../node_modules/JetBrainsMono/web"),
    absolute: true
  });

  const outputArray = await Promise.all(
    filePaths.sort().map(filePath => fontkitOpenAsync(filePath))
  );

  const formattedOutput = prettier.format(outputArray.join("\n"), {
    parser: "css"
  });

  await fs.writeFile(path.join(__dirname, "../index.css"), formattedOutput, {
    encoding: "utf8"
  });
})();
