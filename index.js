const CONSTANTS = {
  TEXT_ELEMENT_TAGS: ["P", "SPAN", "H1", "H2", "H3", "H4", "TEXTAREA"],
};

/** @type {HTMLDivElement} */
let cursor;
/** @type {HTMLStyleElement} */
let nativeCursorStyles;

/**
 * Global App State
 */
const $ = {
  // width and height for general cursor
  baseCursorWidth: "10px",
  baseCursorHeight: "10px",
  // current width and height and borderRadius, see `onCursorMove`
  cursorWidth: "10px",
  cursorHeight: "10px",
  borderRadius: "0px",
  // current mouse position on page
  mouseX: undefined,
  mouseY: undefined,
  /**@type {HTMLElement} */
  hoveredElement: null,
  // when true, cursor will stop following mouse position
  isCursorLocked: false,
};

const load = () => {
  // start animation
  requestAnimationFrame(onCursorMove);
  // dont want on mobile
  if ("ontouchstart" in window) {
    return;
  }
  // create cursor
  cursor = document.getElementById("cursor") || document.createElement("div");
  document.body.appendChild(cursor);
  cursor.id = "cursor";
  $.baseCursorWidth = cursor.dataset.w || "10px";
  $.baseCursorHeight = cursor.dataset.h || "10px";
  $.cursorWidth = $.baseCursorWidth;
  $.cursorHeight = $.baseCursorHeight;
  $.borderRadius = `calc(${$.baseCursorWidth} / 2)`;
  // disable default cursor, add base cursor styles
  nativeCursorStyles = document.createElement("style");
  nativeCursorStyles.id = "native-cursor-styles";
  document.head.appendChild(nativeCursorStyles);
  nativeCursorStyles.innerText = "*{ cursor:none ;}";

  // apply styles to cursor
  const customCursorStyles = document.createElement("style");
  document.head.appendChild(customCursorStyles);
  customCursorStyles.innerText = `
 #cursor {
   position:fixed;
   top:0;
   left:0;
   width: ${$.cursorWidth};
   height: ${$.cursorHeight};
   background:${cursor.dataset.bg || "gray"};
   opacity: 0.5;
   border-radius: 50%;
   display: none;
   pointer-events:none;
   transition-timing-function: ease;
   transition: ${transition({
     width: 0.15,
     height: 0.15,
     opacity: 0.15,
     transform: 0.07,
   })};
   margin: 0px !important;
   padding: 0px !important;
   z-index: 99999999;
 }`;

  // keep track of current mouse position on page
  document.addEventListener("mousemove", (e) => {
    $.mouseX = e.clientX;
    $.mouseY = e.clientY;
  });
};

// main cursor logic here
const onCursorMove = () => {
  const nextFrame = () => requestAnimationFrame(onCursorMove);
  if (!cursor) return nextFrame();
  // mouse hasn't moved yet
  if ($.mouseX === undefined || $.mouseY === undefined) return nextFrame();
  // on every frame, we update the cursor based on our app state
  cursor.style.width = $.cursorWidth;
  cursor.style.height = $.cursorHeight;
  cursor.style.borderRadius = $.borderRadius;
  cursor.style.display = "block";
  if (!$.isCursorLocked) {
    cursor.style.transform = `translate(calc(${$.mouseX}px - (${$.cursorWidth} / 2)), calc(${$.mouseY}px - (${$.cursorHeight} / 2))) `;
  }
  // (because of drag cursor) remove lingering transform in case the element is no longer hovered
  if ($.hoveredElement) {
    $.hoveredElement.style.removeProperty("transform");
  }
  // grab the element under cursor, usually the most nested element
  $.hoveredElement = document.elementFromPoint($.mouseX, $.mouseY);
  // cursor probably left browser and we received negative coords
  if (!$.hoveredElement) return nextFrame();

  // check if any parent element has the data-cursor attribute as that will take priority
  // added this to prevent text based elements taking priority
  /**
   * e.g. div[data-cursor='fill'] > h1 > span
   * It's likely the effect wants to be applied to the div here but the
   * span would be picked up by elementFromPoint
   */
  const elementsFromPoint = document.elementsFromPoint($.mouseX, $.mouseY);
  if (elementsFromPoint) {
    for (const el of elementsFromPoint) {
      // if anything we are hovering over has data-cursor then we set that as the hovered element
      if (el.dataset["cursor"]) {
        $.hoveredElement = el;
        break;
      }
    }
  }
  if ($.hoveredElement.dataset["cursor"] === "reset") {
    $.isCursorLocked = false;
    useNativeCursor();
    return nextFrame();
  }
  // handle fill cursor
  if ($.hoveredElement.dataset["cursor"] === "fill") {
    $.isCursorLocked = true;
    useFillCursor();
    return nextFrame();
  }
  // handle drag cursor
  if ($.hoveredElement.dataset["cursor"] === "drag") {
    $.isCursorLocked = true;
    useDragCursor();
    return nextFrame();
  }
  // handle text cursor
  if (CONSTANTS.TEXT_ELEMENT_TAGS.includes($.hoveredElement.tagName)) {
    $.isCursorLocked = false;
    useTextCursor();
    return nextFrame();
  }
  // handle inputs
  if ($.hoveredElement.tagName === "INPUT") {
    $.isCursorLocked = false;
    resetCursor();
    hideNativeCursor();
    const textInputs = [
      "text",
      "email",
      "number",
      "password",
      "search",
      "tel",
      "url",
      null,
    ];
    if (textInputs.includes($.hoveredElement.getAttribute("type"))) {
      useTextCursor();
    } else {
      useGeneralCursor();
    }
    return nextFrame();
  }
  // use general cursor
  $.isCursorLocked = false;
  useGeneralCursor();
  nextFrame();
};

const resetCursor = () => {
  // removes all possible overrides, results in the defaults applied by css stylesheet
  cursor.style.removeProperty("z-index");
  cursor.style.removeProperty("opacity");
  cursor.style.removeProperty("transition");
};

const hideNativeCursor = () => {
  if (nativeCursorStyles.innerText !== "*{cursor: none;}") {
    nativeCursorStyles.innerText = `*{cursor: none;}`;
  }
};

const useNativeCursor = () => {
  cursor.style.setProperty("opacity", 0);
  nativeCursorStyles.innerText = ``;
};

const useGeneralCursor = () => {
  resetCursor();
  hideNativeCursor();

  $.cursorWidth = $.baseCursorWidth;
  $.cursorHeight = $.baseCursorHeight;
  $.borderRadius = `calc(${$.baseCursorWidth} / 2)`;
};

const useFillCursor = () => {
  hideNativeCursor();

  const {
    width: w,
    height: h,
    x,
    y,
  } = $.hoveredElement.getBoundingClientRect();

  const offsetW = w / 30;
  const offsetH = h / 30;
  // expand to containers size + offset
  $.cursorWidth = `${w + offsetW}px`;
  $.cursorHeight = `${h + offsetH}px`;
  $.borderRadius = "3px";
  // slow down transition
  cursor.style.transition = transition({
    width: 0.2,
    height: 0.2,
    opacity: 0.15,
    transform: 0.15,
  });
  // make cursor go below hovered element
  cursor.style.zIndex = -1;
  cursor.style.opacity = "0.3";
  const alignCentreCoords = {
    x: x - offsetW / 2,
    y: y - offsetH / 2,
  };
  const cursorParallax = parallaxShiftAmount(
    $.hoveredElement,
    offsetW,
    offsetH
  );
  const hoveredElementParallax = parallaxShiftAmount(
    $.hoveredElement,
    offsetW / 2,
    offsetH / 2
  );
  const resultantCoords = {
    x: alignCentreCoords.x + cursorParallax.x,
    y: alignCentreCoords.y + cursorParallax.y,
  };
  cursor.style.transform = `translate(${resultantCoords.x}px, ${resultantCoords.y}px)`;
  $.hoveredElement.style.transform = `translate(${hoveredElementParallax.x}px,${hoveredElementParallax.y}px)`;
};

const useDragCursor = () => {
  hideNativeCursor();

  // shrink cursor, then hide with opacity
  const { width, height } = $.hoveredElement.getBoundingClientRect();
  $.cursorWidth = "5px";
  $.cursorHeight = "5px";
  cursor.style.opacity = "0";
  cursor.style.transition = "initial";

  const { x, y } = parallaxShiftAmount(
    $.hoveredElement,
    width / 20,
    height / 20
  );
  $.hoveredElement.style.transform = `translate(${x}px,${y}px)`;
};

const useTextCursor = () => {
  resetCursor();
  hideNativeCursor();

  const fontSize = window
    .getComputedStyle($.hoveredElement)
    .getPropertyValue("font-size");
  $.cursorWidth = "1px";
  $.cursorHeight = fontSize;
};

/**
 * @param {HTMLElement} elementToGetDimensionsFrom
 * @param {number} offset
 */
const parallaxShiftAmount = (elementToGetDimensionsFrom, offsetW, offsetH) => {
  // calculates mouse distance from the centre of the element
  // then calculates how many pixels to shift an element for every pixel moved by mouse
  // where offset is the total distance moveable
  const {
    width: w,
    height: h,
    x,
    y,
  } = elementToGetDimensionsFrom.getBoundingClientRect();

  const elementCentre = { x: x + w / 2, y: y + h / 2 };
  const mouseDistanceFromCentre = {
    x: $.mouseX - elementCentre.x,
    y: $.mouseY - elementCentre.y,
  };
  const parallaxFactor = {
    x: offsetW / (w / 2),
    y: offsetH / (h / 2),
  };
  return {
    x: mouseDistanceFromCentre.x * parallaxFactor.x,
    y: mouseDistanceFromCentre.y * parallaxFactor.y,
  };
};

const transition = (properties) =>
  Object.entries(properties)
    .map(([key, value]) => `${key} ${value}s`)
    .join(",");

window.addEventListener("DOMContentLoaded", load);
