import type { CSSProperties } from "react";
import { PIXEL_CAT_LANE_WIDTH } from "./model";
import { BODY_RUNS, SPRITE_HEIGHT, SPRITE_WIDTH, STRIDE_RUNS, TOGETHER_RUNS, type PixelRun } from "./sprite";
import "./PixelCat.css";

/** Screen px of one sprite pixel. */
const PIXEL_SIZE = 2;

const laneStyle = {
  "--pixel-cat-lane": `${PIXEL_CAT_LANE_WIDTH}px`,
  "--pixel-cat-width": `${SPRITE_WIDTH * PIXEL_SIZE}px`,
  "--pixel-cat-height": `${SPRITE_HEIGHT * PIXEL_SIZE}px`,
} as CSSProperties;

const rects = (runs: readonly PixelRun[]) => runs.map((run) => (
  <rect key={`${run.x}/${run.y}`} className={`pixel-cat__px--${run.kind}`} x={run.x} y={run.y} width={run.width} height={1} />
));

/**
 * A small pixel cat that walks back and forth along its lane on the collapsed island, in the
 * place the clock would take. Decorative: it is hidden from assistive technology and lets clicks
 * through to the bar. `active` is false while the island is open or tucked, which pauses it.
 */
export function PixelCat({ active }: { active: boolean }) {
  return (
    <div className={`pixel-cat${active ? "" : " pixel-cat--paused"}`} style={laneStyle} aria-hidden="true">
      <div className="pixel-cat__walker">
        <div className="pixel-cat__turn">
          <svg className="pixel-cat__sprite" viewBox={`0 0 ${SPRITE_WIDTH} ${SPRITE_HEIGHT}`} shapeRendering="crispEdges">
            <g>{rects(BODY_RUNS)}</g>
            <g className="pixel-cat__legs pixel-cat__legs--stride">{rects(STRIDE_RUNS)}</g>
            <g className="pixel-cat__legs pixel-cat__legs--together">{rects(TOGETHER_RUNS)}</g>
          </svg>
        </div>
      </div>
    </div>
  );
}
