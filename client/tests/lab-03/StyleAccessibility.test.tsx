/// <reference types="node" />
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

function luminance(hex: string) {
  const rgb = hex.match(/[a-f\d]{2}/gi)!.map(value => parseInt(value, 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}

it("every status in the UI contract has a badge palette with readable normal-text contrast", () => {

  const css = readFileSync("src/theme.css", "utf8");
  const palettes = [...css.matchAll(/([^{}]*\.zen-badge\[data-status[^{}]*)\{([^{}]*)\}/g)];
  for (const status of ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"]) {
    const rule = palettes.find(match => match[1].includes(`data-status="${status}"`));
    expect(rule, `${status} palette`).toBeDefined();
    const foreground = rule![2].match(/\bcolor:\s*(#[a-f\d]{6})/i)![1];
    const background = rule![2].match(/\bbackground:\s*(#[a-f\d]{6})/i)![1];
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    expect((values[0] + .05) / (values[1] + .05), `${status} contrast`).toBeGreaterThanOrEqual(4.5);
  }
});
