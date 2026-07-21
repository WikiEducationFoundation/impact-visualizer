// Largest bubble radius (Vega derives radius from area; max size range is 1500).
export const MAX_CIRCLE_RADIUS = Math.sqrt(1500 / Math.PI);
const Y_BOTTOM_MARGIN = MAX_CIRCLE_RADIUS * 2;

// Post-compile tweaks Vega-Lite can't express directly.
export const patchChartScales = (vgSpec: any) => {
  try {
    const scales = vgSpec.scales || [];

    // Clamp x pan/zoom to the data extent (no dragging into empty space; no-op
    // once every bubble is visible). The bound x domain is recomputed by
    // panLinear/zoomLinear each frame, so we rewrite those to clamp at the
    // source against `x_base` — the x scale without the interactive override.
    const xScale = scales.find((s: any) => s.name === "x");
    if (xScale && xScale.domainRaw) {
      if (!scales.some((s: any) => s.name === "x_base")) {
        const base = { ...xScale, name: "x_base" };
        delete base.domainRaw;
        scales.push(base);
        vgSpec.scales = scales;
      }
      // convert to number to avoid issues with date objects
      const Blo = "toNumber(domain('x_base')[0])";
      const Bhi = "toNumber(domain('x_base')[1])";
      const clamp = (proposed: string) =>
        `(span(${proposed}) >= (${Bhi} - ${Blo}) ? [${Blo}, ${Bhi}]` +
        ` : (${proposed})[0] < ${Blo} ? [${Blo}, ${Blo} + span(${proposed})]` +
        ` : (${proposed})[1] > ${Bhi} ? [${Bhi} - span(${proposed}), ${Bhi}]` +
        ` : (${proposed}))`;
      for (const sig of vgSpec.signals || []) {
        if (!Array.isArray(sig.on)) continue;
        for (const handler of sig.on) {
          if (
            typeof handler.update === "string" &&
            /panLinear|zoomLinear/.test(handler.update)
          ) {
            handler.update = clamp(handler.update);
          }
        }
      }
    }

    // Inset the y range's bottom so low-value bubbles clear the floor. Done in
    // pixel space: scale.padding is ignored once domainMin/Max are set, and
    // lowering the domain would expose negative axis values.
    const yScale = scales.find((s: any) => s.name === "y");
    if (yScale && Array.isArray(yScale.range) && yScale.range.length === 2) {
      if (!scales.some((s: any) => s.name === "y_grid")) {
        const gridClone = { ...yScale, name: "y_grid" };
        delete gridClone.domainRaw;
        scales.push(gridClone);
        vgSpec.scales = scales;
      }
      for (const axis of vgSpec.axes || []) {
        if (axis.scale === "x" && axis.grid && axis.gridScale === "y") {
          axis.gridScale = "y_grid";
        }
      }

      const bottom = yScale.range[0];
      const bottomExpr =
        bottom && typeof bottom === "object" && "signal" in bottom
          ? bottom.signal
          : String(bottom);
      yScale.range = [
        { signal: `(${bottomExpr}) - ${Y_BOTTOM_MARGIN}` },
        yScale.range[1],
      ];
    }
  } catch {
    // leave the spec untouched if the compiled shape is unexpected
  }
  return vgSpec;
};
