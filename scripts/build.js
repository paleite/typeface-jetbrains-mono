const path = require("path");
const fs = require("fs").promises;
const prettier = require("prettier");
const globby = require("globby");
const fontkit = require("fontkit");

const fontkitOpenAsync = (filename) =>
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

      const relativenameWoff = `./${path.relative(
        `${process.cwd()}/dist`,
        filename
      )}`;
      const relativenameWoff2 = relativenameWoff.replace(/woff/g, "woff2");
      const fontName = path.basename(filename, ".woff");

      const header = `/* ${fontName} - ${font.copyright} */`;
      const fontFace = {
        "font-weight": font["OS/2"].usWeightClass,
        "font-family": `"${font.familyName}"`,
        "font-style": fontStyle,
        src: [
          `local("${font.fullName}")`,
          `local("${font.postscriptName}")`,
          `url("${relativenameWoff2}") format("woff2")`,
          `url("${relativenameWoff}") format("woff")`,
        ].join(),
        "font-feature-settings":
          fontFeatureSettings.length > 0
            ? `${fontFeatureSettings.map((feature) => `"${feature}" 1`).join()}`
            : undefined,
        "font-display": "swap",
      };
      const fontFaceSource = Object.keys(fontFace)
        .filter((key) => Boolean(fontFace[key]))
        .map((key) => `${key}: ${fontFace[key]};`)
        .join("\n");

      const output = `${header}\n@font-face { ${fontFaceSource} }\n`;

      resolve(output);
    });
  });

(async () => {
  /** Copy woff-files */
  const woffFilePaths = await globby(["**/*.woff"], {
    cwd: path.join(__dirname, "../node_modules/JetBrainsMono/web"),
    absolute: true,
  });

  await Promise.all(
    woffFilePaths.map((filePath) =>
      fs.copyFile(
        filePath,
        path.join(__dirname, `../dist/${path.basename(filePath)}`)
      )
    )
  );

  /** Copy woff2-files */
  const woff2FilePaths = await globby(["**/*.woff2"], {
    cwd: path.join(__dirname, "../node_modules/JetBrainsMono/web"),
    absolute: true,
  });

  await Promise.all(
    woff2FilePaths.map((filePath) =>
      fs.copyFile(
        filePath,
        path.join(__dirname, `../dist/${path.basename(filePath)}`)
      )
    )
  );

  /** Create CSS output*/
  const outputArray = await Promise.all(
    woffFilePaths
      .sort()
      .map((filePath) =>
        fontkitOpenAsync(
          path.join(__dirname, `../dist/${path.basename(filePath)}`)
        )
      )
  );

  /** Format CSS output*/
  const formattedOutput = prettier.format(outputArray.join("\n"), {
    parser: "css",
  });

  /** Write CSS output*/
  await fs.writeFile(
    path.join(__dirname, "../dist/index.css"),
    formattedOutput,
    { encoding: "utf8" }
  );
})();
