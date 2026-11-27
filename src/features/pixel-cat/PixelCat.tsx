import type { CSSProperties } from "react";
import { PIXEL_CAT_LANE_WIDTH } from "./model";
import {
  BLINK_PIXEL, BODY_RUNS, SIT_TAIL_DOWN_RUNS, SIT_TAIL_UP_RUNS, SLEEP_RUNS, SNORE_RUNS,
  SPRITE_HEIGHT, SPRITE_WIDTH, STRETCH_RUNS, STRIDE_RUNS, TOGETHER_RUNS, type PixelRun,
} from "./sprite";
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

const blink = <rect className="pixel-cat__px--fur pixel-cat__blink" x={BLINK_PIXEL.x} y={BLINK_PIXEL.y} width={1} height={1} />;

/**
 * A small pixel cat on the collapsed island, in the place the clock would take. One loop of its
 * routine (PixelCat.css): walk over, sit and flick its tail, walk back with a hop, stretch, nap,
 * and sit up again, blinking along the way. Decorative: it is hidden from assistive technology and lets clicks
 * through to the bar. `active` is false while the island is open or tucked, which pauses it.
 */
export function PixelCat({ active }: { active: boolean }) {
  return (
    <div className={`pixel-cat${active ? "" : " pixel-cat--paused"}`} style={laneStyle} aria-hidden="true">
      <div className="pixel-cat__walker">
        <div className="pixel-cat__hop">
          <div className="pixel-cat__turn">
            <svg className="pixel-cat__sprite" viewBox={`0 0 ${SPRITE_WIDTH} ${SPRITE_HEIGHT}`} shapeRendering="crispEdges">
              <g className="pixel-cat__pose pixel-cat__pose--walk">
                <g>{rects(BODY_RUNS)}</g>
                <g className="pixel-cat__legs pixel-cat__legs--stride">{rects(STRIDE_RUNS)}</g>
                <g className="pixel-cat__legs pixel-cat__legs--together">{rects(TOGETHER_RUNS)}</g>
                {blink}
              </g>
              <g className="pixel-cat__pose pixel-cat__pose--sit">
                <g className="pixel-cat__tail pixel-cat__tail--down">{rects(SIT_TAIL_DOWN_RUNS)}</g>
                <g className="pixel-cat__tail pixel-cat__tail--up">{rects(SIT_TAIL_UP_RUNS)}</g>
                {blink}
              </g>
              <g className="pixel-cat__pose pixel-cat__pose--stretch">{rects(STRETCH_RUNS)}</g>
              <g className="pixel-cat__pose pixel-cat__pose--sleep">{rects(SLEEP_RUNS)}</g>
            </svg>
          </div>
        </div>
        {/* Outside the turn, so the z is never drawn mirrored. */}
        <div className="pixel-cat__snores">
          {[0, 1].map((index) => (
            <svg key={index} className="pixel-cat__snore" viewBox="0 0 3 3" shapeRendering="crispEdges">{rects(SNORE_RUNS)}</svg>
          ))}
        </div>
      </div>
    </div>
  );
}
