import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

function readBlock(selector) {
  const selectorIndex = css.indexOf(selector);
  assert.notEqual(selectorIndex, -1, `${selector} exists`);

  const openIndex = css.indexOf("{", selectorIndex);
  let depth = 0;

  for (let index = openIndex; index < css.length; index += 1) {
    if (css[index] === "{") {
      depth += 1;
    }

    if (css[index] === "}") {
      depth -= 1;

      if (depth === 0) {
        return css.slice(openIndex + 1, index);
      }
    }
  }

  throw new Error(`Could not read ${selector} block`);
}

function readVariables(selector) {
  const block = readBlock(selector);
  return Object.fromEntries(
    [...block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [
      match[1],
      match[2]
    ])
  );
}

function linearChannel(value) {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const [red, green, blue] = hex
    .slice(1)
    .match(/../g)
    .map((channel) => parseInt(channel, 16));

  return (
    linearChannel(red) * 0.2126 +
    linearChannel(green) * 0.7152 +
    linearChannel(blue) * 0.0722
  );
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  const [lighter, darker] = foregroundLuminance > backgroundLuminance
    ? [foregroundLuminance, backgroundLuminance]
    : [backgroundLuminance, foregroundLuminance];

  return (lighter + 0.05) / (darker + 0.05);
}

test("theme text colors meet AA contrast for core UI surfaces", () => {
  const themes = {
    cafe: readVariables(':root[data-theme="cafe"]'),
    graphite: readVariables(':root[data-theme="graphite"]')
  };
  const requiredPairs = [
    ["color-text", "color-page", 4.5],
    ["color-text", "color-panel", 4.5],
    ["color-text", "color-input", 4.5],
    ["color-muted", "color-page", 4.5],
    ["color-muted", "color-panel", 4.5],
    ["color-active-text", "color-active-bg", 4.5],
    ["color-rose", "color-page", 4.5],
    ["color-rose", "color-panel", 4.5],
    ["color-danger", "color-page", 4.5],
    ["color-danger", "color-panel", 4.5],
    ["color-focus", "color-page", 3],
    ["color-focus", "color-panel", 3]
  ];

  for (const [themeName, variables] of Object.entries(themes)) {
    for (const [foregroundName, backgroundName, minimum] of requiredPairs) {
      const foreground = variables[foregroundName.replace(/^color-/, "color-")];
      const background = variables[backgroundName.replace(/^color-/, "color-")];
      const ratio = contrastRatio(foreground, background);

      assert.ok(
        ratio >= minimum,
        `${themeName} ${foregroundName} on ${backgroundName} contrast ${ratio.toFixed(2)} >= ${minimum}`
      );
    }
  }
});
