import { json } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Resend } from "resend";

type Payload = {
  a: string;
  b: string;
  c: string;
  d: string;
  e: string;
  f: string;
  g: string;
  h: string;
  i: string;
  j: string;
  k: string;
  l: string;
  m: string;
  n: string;
  o: string;
  p: string;
  q: string;
  r: string;
  r_other: string;
  s: string;
  s_other: string;
  quantity: string;
  ship_zip: string;
};

type CalcResult =
  | { ok: false; message: string }
  | {
      ok: true;
      series: string;
      projection: number;
      topProjection: number;
      selectedBevelCode: string;
      overallFaceFootprint: number;
      wallBackFootprint: number;
      offsetEachSide: number;
      requiredClearanceEachSide: number;
      bottomWallToTruckDistance: number;
      sidingReduction: number;
      blockoutThicknessUsed: number;
      requiredTopWallToTruckMin: number;
      topWallToTruckDistance: number;
      backingType: string;
      sidePadHeight: number;
      requiredTopClearance: number;
      calculatedTopClearance: number;
      openingTopFromDrive: number;
      slopePercent: number;
      headPadHeight: number;
      dropCurtain: number;
      headCurtainLength: number;
      splitCurtain: number;
      frontTopOfAssembly: number;
      backTopOfAssembly: number;
      notes: string[];
      subtotalPrice: number;
      totalEstimatedPrice: number;
      baseSalesPrice: number;
      bevelAdder: number;
      pleatAdder: number;
      headPadHeightAdder: number;
      dropCurtainAdder: number;
      headCapAdder: number;
      headCurtainAdder: number;
      steelBackAdder: number;
      blockoutAdder: number;
      footerMaterialDisplay: string;
      wallTypeDisplay: string;
      truckTypeNote: string;
      backingNote: string;
    };

type ShippingResult =
  | { ok: false; message: string }
  | {
      ok: true;
      state: string;
      quantity: number;
      zone: string;
      amount: number;
      zip: string;
    };

function parseNumber(value: string): number {
  if (!value) return 0;
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

function parseWholeNumber(value: string, fallback = 1): number {
  const num = parseInt(value, 10);
  if (!Number.isFinite(num) || num < 1) return fallback;
  return num;
}

function roundProjection(value: number): number {
  const whole = Math.floor(value);
  const decimal = value - whole;
  if (decimal <= 0.25) return whole;
  return whole + 1;
}

function dollars(value: number): string {
  return `$${value.toFixed(2)}`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateControlNumber(): string {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const hh = String(now.getUTCHours()).padStart(2, "0");
  const mi = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DS-${yyyy}${mm}${dd}-${hh}${mi}${ss}-${rand}`;
}

const pricingTables = {
  base1000Chart: {
    12: {
      8: { 102: 420, 116: 432, 999: 448 },
      9: { 102: 448, 116: 460, 999: 476 },
      10: { 102: 476, 116: 488, 999: 504 },
      11: { 102: 504, 116: 516, 999: 532 },
      12: { 102: 528, 116: 540, 999: 556 },
    },
    14: {
      8: { 102: 448, 116: 460, 999: 476 },
      9: { 102: 476, 116: 488, 999: 504 },
      10: { 102: 504, 116: 516, 999: 532 },
      11: { 102: 532, 116: 544, 999: 560 },
      12: { 102: 556, 116: 566, 999: 584 },
    },
    16: {
      8: { 102: 476, 116: 488, 999: 504 },
      9: { 102: 504, 116: 516, 999: 532 },
      10: { 102: 532, 116: 544, 999: 560 },
      11: { 102: 560, 116: 572, 999: 588 },
      12: { 102: 584, 116: 594, 999: 612 },
    },
    18: {
      8: { 102: 504, 116: 516, 999: 532 },
      9: { 102: 532, 116: 544, 999: 560 },
      10: { 102: 560, 116: 572, 999: 588 },
      11: { 102: 588, 116: 600, 999: 616 },
      12: { 102: 612, 116: 622, 999: 640 },
    },
    20: {
      8: { 102: 532, 116: 544, 999: 560 },
      9: { 102: 560, 116: 572, 999: 588 },
      10: { 102: 588, 116: 600, 999: 616 },
      11: { 102: 616, 116: 628, 999: 644 },
      12: { 102: 640, 116: 650, 999: 660 },
    },
    22: {
      8: { 102: 600, 116: 612, 999: 628 },
      9: { 102: 628, 116: 640, 999: 656 },
      10: { 102: 656, 116: 668, 999: 684 },
      11: { 102: 684, 116: 696, 999: 712 },
      12: { 102: 708, 116: 718, 999: 736 },
    },
    24: {
      8: { 102: 632, 116: 644, 999: 660 },
      9: { 102: 660, 116: 672, 999: 688 },
      10: { 102: 688, 116: 700, 999: 716 },
      11: { 102: 716, 116: 728, 999: 744 },
      12: { 102: 740, 116: 750, 999: 768 },
    },
  },
  headPadOptionalHeight: {
    12: { 18: 48, 24: 100 },
    14: { 18: 52, 24: 104 },
    16: { 18: 56, 24: 108 },
    18: { 18: 60, 24: 112 },
    20: { 18: 64, 24: 116 },
    22: { 18: 76, 24: 132 },
    24: { 18: 80, 24: 140 },
  },
};

function nearestProjectionBucket(proj: number): number {
  if (proj <= 12) return 12;
  if (proj <= 14) return 14;
  if (proj <= 16) return 16;
  if (proj <= 18) return 18;
  if (proj <= 20) return 20;
  if (proj <= 22) return 22;
  return 24;
}

function nearestSidePadHeightBucket(heightInches: number): number {
  const feet = Math.ceil(heightInches / 12);
  if (feet < 8) return 8;
  if (feet > 12) return 12;
  return feet;
}

function widthBucketLimit(overallWidthInches: number): number {
  if (overallWidthInches <= 102) return 102;
  if (overallWidthInches <= 116) return 116;
  return 999;
}

function getBaseChartPrice(
  baseProjection: number,
  sidePadHeight: number,
  overallWidth: number,
): number {
  const projBucket = nearestProjectionBucket(baseProjection) as keyof typeof pricingTables.base1000Chart;
  const heightBucket = nearestSidePadHeightBucket(sidePadHeight) as keyof (typeof pricingTables.base1000Chart)[12];
  const widthBucket = widthBucketLimit(overallWidth) as keyof (typeof pricingTables.base1000Chart)[12][8];
  return pricingTables.base1000Chart[projBucket][heightBucket][widthBucket];
}

function getHeadPadOptionalHeightAdder(baseProjection: number, headPadHeight: number): number {
  const projBucket = nearestProjectionBucket(baseProjection) as keyof typeof pricingTables.headPadOptionalHeight;
  if (headPadHeight <= 18) {
    return pricingTables.headPadOptionalHeight[projBucket][18] * 2;
  }
  return pricingTables.headPadOptionalHeight[projBucket][24] * 2;
}

function getBevelAdder(back: number, face: number): number {
  const code = `${back}/${face}`;
  if (code === "8/12" || code === "8/14" || code === "10/13") return 0;
  if (code === "8/16" || code === "10/16") return 88;
  if (code === "10/19") return 144;
  if (code === "12/15") return 120;
  if (code === "12/18") return 180;
  if (code === "12/21") return 224;
  if (code === "12/24") return 368;
  return 0;
}

function getPleatRatePerFoot(face: number): number {
  if (face <= 13) return 8;
  if (face <= 19) return 10;
  return 12;
}

function getBlockoutPrice(
  series: string,
  sidePadHeight: number,
  headPadWidthFeet: number,
  blockoutThickness: number,
): number {
  if (blockoutThickness <= 0) return 0;

  if (blockoutThickness <= 1.5 && sidePadHeight <= 108) {
    return 100;
  }

  let ratePerFoot = 0;
  if (blockoutThickness <= 5) ratePerFoot = 12;
  else if (blockoutThickness <= 7) ratePerFoot = 14;
  else if (blockoutThickness <= 9) ratePerFoot = 16;
  else ratePerFoot = 16;

  const sidePadFeetEach = sidePadHeight / 12;
  let totalFeet = sidePadFeetEach * 2;

  if (series === "1000") {
    totalFeet += headPadWidthFeet;
  }

  return totalFeet * ratePerFoot;
}

const ZONE_1 = new Set(["OH", "MI", "IN", "IL", "WI", "KY", "WV", "PA"]);
const ZONE_2 = new Set(["MN", "IA", "MO", "TN", "VA", "MD", "DE", "NJ", "NY"]);
const ZONE_3 = new Set(["ND", "SD", "NE", "KS", "OK", "AR", "LA", "MT", "WY", "CO", "NM", "AZ", "NV", "UT", "ID", "TX"]);
const ZONE_4 = new Set(["WA", "OR", "CA", "ME", "NH", "VT", "MA", "RI", "CT", "NC", "SC", "GA", "FL", "MS", "AL", "DC"]);

function normalizeZip(value: string): string {
  return value.replace(/[^\d]/g, "").slice(0, 5);
}

async function lookupStateFromZip(zipRaw: string): Promise<{ ok: true; state: string; zip: string } | { ok: false; message: string }> {
  const zip = normalizeZip(zipRaw);

  if (zip.length !== 5) {
    return { ok: false, message: "Enter a valid 5-digit shipping ZIP." };
  }

  const response = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (!response.ok) {
    return { ok: false, message: "Could not look up that shipping ZIP." };
  }

  const data = (await response.json()) as {
    places?: Array<{ "state abbreviation"?: string }>;
  };

  const state = data?.places?.[0]?.["state abbreviation"]?.toUpperCase() || "";

  if (!state || state.length !== 2) {
    return { ok: false, message: "Could not determine the shipping state from that ZIP." };
  }

  return { ok: true, state, zip };
}

function getShippingPriceFromState(state: string, quantity: number, zip: string): ShippingResult {
  if (ZONE_1.has(state)) {
    if (quantity >= 8) {
      return { ok: true, state, quantity, zone: "Zone 1", amount: 1200, zip };
    }
    return {
      ok: true,
      state,
      quantity,
      zone: "Zone 1",
      amount: 200 + Math.max(0, quantity - 1) * 150,
      zip,
    };
  }

  if (ZONE_2.has(state)) {
    if (quantity >= 8) {
      return { ok: true, state, quantity, zone: "Zone 2", amount: 1400, zip };
    }
    return {
      ok: true,
      state,
      quantity,
      zone: "Zone 2",
      amount: 300 + Math.max(0, quantity - 1) * 150,
      zip,
    };
  }

  if (ZONE_3.has(state)) {
    if (quantity >= 8) {
      return { ok: true, state, quantity, zone: "Zone 3", amount: 1800, zip };
    }
    return {
      ok: true,
      state,
      quantity,
      zone: "Zone 3",
      amount: 400 + Math.max(0, quantity - 1) * 100,
      zip,
    };
  }

  if (ZONE_4.has(state)) {
    if (quantity >= 8) {
      return { ok: true, state, quantity, zone: "Zone 4", amount: 2000, zip };
    }
    return {
      ok: true,
      state,
      quantity,
      zone: "Zone 4",
      amount: 600 + Math.max(0, quantity - 1) * 80,
      zip,
    };
  }

  return {
    ok: false,
    message: `Shipping for ${state} is not in the current table yet.`,
  };
}

function calculateSeal(payload: Payload): CalcResult {
  const A = parseNumber(payload.a);
  const B = parseNumber(payload.b);
  const C = parseNumber(payload.c);
  const D = parseNumber(payload.d);
  const E = parseNumber(payload.e);
  const F = parseNumber(payload.f);
  const G = parseNumber(payload.g);
  const H = parseNumber(payload.h);
  const J = parseNumber(payload.j);
  const K = parseNumber(payload.k);
  const L = parseNumber(payload.l);
  const M = parseNumber(payload.m);
  const N = parseNumber(payload.n);
  const O = parseNumber(payload.o);
  const P = parseNumber(payload.p);
  const Q = parseNumber(payload.q);
  const R = payload.r;
  const ROther = payload.r_other.trim();
  const S = payload.s;
  const SOther = payload.s_other.trim();

  if (!A || !B || !F || !H || !M || !N) {
    return { ok: false, message: "Please complete the required A–S dimensions before calculating." };
  }

  if (R === "other" && !ROther) {
    return { ok: false, message: "Please enter the other footer material for R." };
  }

  if (S === "other" && !SOther) {
    return { ok: false, message: "Please enter the other wall type for S." };
  }

  if (J > 0 || K > 0) {
    return { ok: false, message: "Dock Shelter Required — rear extensions or lift gates are not compatible with a dock seal." };
  }

  if (M < 96 || M > 102) {
    return { ok: false, message: "Dock Shelter Required — truck width is outside the normal dock seal range." };
  }

  let truckTypeNote = "";
  if (L > 0 && Math.abs(L - 50) > 6) {
    truckTypeNote = "Confirm truck type — trailer floor height is outside the normal OTR range.";
  }

  let slopePercent = 0;
  if (O > 0) {
    slopePercent = (P / (O * 12)) * 100;
  }

  const compressionNeeded = 5;
  const rawProjection = G + H + compressionNeeded;
  const projection = roundProjection(rawProjection);

  if (projection > 24) {
    return { ok: false, message: "Quote Required — projection exceeds the standard online dock seal range." };
  }

  const slopeTakeoffRaw = (Math.abs(slopePercent) / 100) * A;

  let rawTopProjection = 0;
  if (P >= 0) rawTopProjection = rawProjection - slopeTakeoffRaw;
  else rawTopProjection = rawProjection + slopeTakeoffRaw;
  if (rawTopProjection < 0) rawTopProjection = 0;

  const topProjection = roundProjection(rawTopProjection);

  const bottomWallToTruckDistance = G + H;
  const hasMetalSidingAtOpening = Q > 0;
  const sidingReduction = hasMetalSidingAtOpening ? 1.5 : 0;

  let optionalBlockoutThickness = 0;
  const requiredBlockoutThickness = hasMetalSidingAtOpening ? 1.5 : 0;

  if (!hasMetalSidingAtOpening && projection > 18) {
    optionalBlockoutThickness = Math.max(1.5, projection - 18);
  }

  let topWallToTruckDistanceNoBlockout = 0;
  if (P >= 0) {
    topWallToTruckDistanceNoBlockout = bottomWallToTruckDistance - slopeTakeoffRaw - sidingReduction;
  } else {
    topWallToTruckDistanceNoBlockout = bottomWallToTruckDistance + slopeTakeoffRaw - sidingReduction;
  }

  const topWallToTruckDistanceWithOptionalBlockout =
    topWallToTruckDistanceNoBlockout - optionalBlockoutThickness;

  let blockoutThicknessUsed = 0;
  if (hasMetalSidingAtOpening) {
    blockoutThicknessUsed = requiredBlockoutThickness;
  } else if (
    optionalBlockoutThickness > 0 &&
    topWallToTruckDistanceWithOptionalBlockout >= 5
  ) {
    blockoutThicknessUsed = optionalBlockoutThickness;
  }

  const topWallToTruckDistance =
    topWallToTruckDistanceNoBlockout - blockoutThicknessUsed;

  const wallType = S === "other" ? SOther : S;
  const isFlatOrAway = P <= 0;
  let requiredTopWallToTruckMin = 5;

  if (isFlatOrAway && wallType === "precast_concrete") {
    requiredTopWallToTruckMin = 4.5;
  }

  let backingNote = "";
  let backingType = "Normal lumber backing";
  let additionalProjectionNeeded = 0;
  let shelterRequiredForTopSpacing = false;

  if (topWallToTruckDistance < requiredTopWallToTruckMin) {
    backingType = "Dock Shelter Required";
    additionalProjectionNeeded = Math.ceil(requiredTopWallToTruckMin - topWallToTruckDistance);
    backingNote =
      `Top opening-to-truck spacing is ${topWallToTruckDistance.toFixed(2)}". Minimum required is ${requiredTopWallToTruckMin}". Add at least ${additionalProjectionNeeded}" more ledge or bumper projection, or quote a dock shelter instead.`;
    shelterRequiredForTopSpacing = true;
  } else if (topWallToTruckDistance < 6) {
    backingType = "Quote metal back";
    backingNote =
      `Top opening-to-truck spacing is ${topWallToTruckDistance.toFixed(2)}". Since it is under 6", quote a metal back dock seal instead of a lumber back.`;
  }

  if (shelterRequiredForTopSpacing) {
    return {
      ok: false,
      message: "Dock Shelter Required — top opening-to-truck spacing is too tight for a dock seal with these parameters.",
    };
  }

  const maxProjectionForBevel = Math.max(projection, topProjection);
  let minBack = 0;

  if (maxProjectionForBevel <= 16) minBack = 8;
  else if (maxProjectionForBevel <= 20) minBack = 10;
  else if (maxProjectionForBevel <= 24) minBack = 12;
  else {
    return { ok: false, message: 'Quote Required — dock seal projection exceeds the 24" maximum.' };
  }

  const ID = 94;
  let series = "1000";
  if (A >= 120 || topProjection > 16) {
    series = "1400";
  }

  let selectedBevel: { back: number; face: number; code: string } | null = null;
  let overallFaceFootprint = 0;
  let wallBackFootprint = 0;
  let offsetEachSide = 0;
  let requiredClearanceEachSide = 0;

  for (let face = 12; face <= 19; face += 1) {
    const back = minBack;

    if (back === 8 && face < 12) continue;
    if (back > 8 && face < 13) continue;

    const testOverallFaceFootprint = ID + face + face;
    const testWallBackFootprint = B + back + back;
    const testOffsetEachSide = (testOverallFaceFootprint - testWallBackFootprint) / 2;
    const testRequiredClearanceEachSide = Math.ceil(((testOverallFaceFootprint + 6) - B) / 2);

    if (testOffsetEachSide < 0) continue;
    if (C > 0 && C < testRequiredClearanceEachSide) continue;
    if (D > 0 && D < testRequiredClearanceEachSide) continue;

    selectedBevel = {
      back,
      face,
      code: `${back}/${face}`,
    };
    overallFaceFootprint = testOverallFaceFootprint;
    wallBackFootprint = testWallBackFootprint;
    offsetEachSide = testOffsetEachSide;
    requiredClearanceEachSide = testRequiredClearanceEachSide;
    break;
  }

  if (!selectedBevel) {
    return { ok: false, message: "Quote Required — no standard bevel fits this opening and clearance requirement." };
  }

  const blockoutRequiredForMounting = hasMetalSidingAtOpening;
  const openingTopFromDrive = A + F;
  let sidePadHeight = A;
  let headPadHeight = 0;
  let dropCurtain = 0;
  let headCurtainLength = 0;
  let splitCurtain = 0;
  const notes: string[] = [];
  let requiredTopClearance = 0;
  let calculatedTopClearance = 0;
  let frontTopOfAssembly = 0;
  let backTopOfAssembly = 0;

  if (series === "1000") {
    const standardLowCoverage1000 = 147;
    const standardHighTruck1000 = 162;
    const lowTruckTarget1000 = N < 150 ? N - 3 : standardLowCoverage1000;
    const highTruckTarget1000 = N > 162 ? N + 3 : 165;

    headPadHeight = A <= 96 ? 18 : 12;

    while (
      openingTopFromDrive + headPadHeight < highTruckTarget1000 &&
      headPadHeight < 24
    ) {
      headPadHeight += 1;
    }

    if (openingTopFromDrive + headPadHeight < highTruckTarget1000) {
      return {
        ok: false,
        message: 'Dock Shelter Required — 1000 series cannot reach the required upper truck coverage within the 24" head pad limit.',
      };
    }

    requiredTopClearance = headPadHeight + 4;
    calculatedTopClearance = E;

    if (E > 0 && E < requiredTopClearance) {
      return {
        ok: false,
        message: `Dock Shelter Required — need at least ${requiredTopClearance}" above the opening for this 1000 configuration, but only ${E}" is available.`,
      };
    }

    const neededDropCurtain = openingTopFromDrive - lowTruckTarget1000;

    if (neededDropCurtain <= 0) dropCurtain = 0;
    else if (neededDropCurtain <= 12) dropCurtain = 12;
    else if (neededDropCurtain <= 18) dropCurtain = 18;
    else {
      return {
        ok: false,
        message: `Dock Shelter Required — 1000 series would need a ${Math.ceil(neededDropCurtain)}" drop curtain, which exceeds the 18" maximum.`,
      };
    }

    notes.push("40oz black vinyl base cover");
    notes.push("40oz corner wear pleats");
    if (dropCurtain > 0) notes.push("22oz drop curtain");

    if (E - requiredTopClearance <= 3 && E >= requiredTopClearance) {
      notes.push("Narrow clearance above head pad");
    }
  } else {
    const standardLowCoverage1400 = 147;
    const lowTruckTarget1400 = N < 150 ? N - 3 : standardLowCoverage1400;

    const requiredFrontTopOfAssembly = Math.max(168, N + 6);
    const requiredBackTopOfAssembly = requiredFrontTopOfAssembly + 4;

    const minimumSidePadHeight1400 = requiredFrontTopOfAssembly - F;
    sidePadHeight = Math.max(A, minimumSidePadHeight1400);

    frontTopOfAssembly = F + sidePadHeight;
    backTopOfAssembly = frontTopOfAssembly + 4;

    if (frontTopOfAssembly < 168) {
      return {
        ok: false,
        message: 'Dock Shelter Required — 1400 front top of assembly must be at least 14\'0" from driveway.',
      };
    }

    if (backTopOfAssembly < 172) {
      return {
        ok: false,
        message: 'Dock Shelter Required — 1400 back top of assembly must be at least 14\'4" from driveway.',
      };
    }

    calculatedTopClearance = E;
    requiredTopClearance = 9;

    if (E > 0 && E < requiredTopClearance) {
      return {
        ok: false,
        message: `Quote Required — this 1400 configuration needs at least ${requiredTopClearance}" above the opening, but only ${E}" is available.`,
      };
    }

    headCurtainLength = Math.max(24, frontTopOfAssembly - lowTruckTarget1400);

    if (headCurtainLength > 30) {
      return {
        ok: false,
        message: `Dock Shelter Required — 1400 head curtain would need to be ${Math.ceil(headCurtainLength)}" long, which exceeds the 30" maximum.`,
      };
    }

    headCurtainLength = Math.ceil(headCurtainLength);
    splitCurtain = 16;

    notes.push("40oz black vinyl base cover");
    notes.push("40oz corner wear pleats");
    notes.push("Split curtain with pull ropes");

    if (E - requiredTopClearance <= 3 && E >= requiredTopClearance) {
      notes.push("Limited header room");
    }
  }

  if (blockoutRequiredForMounting) {
    notes.push('1.5" wood blockout required for metal siding');
  } else if (blockoutThicknessUsed > 0) {
    notes.push(`${blockoutThicknessUsed}" wood blockout used`);
  }

  if (optionalBlockoutThickness > 0 && blockoutThicknessUsed === 0) {
    notes.push("Optional blockout skipped to preserve top opening-to-truck clearance");
  }

  notes.push(backingType);

  const baseProjectionForPricing = nearestProjectionBucket(projection);
  const baseChartList = getBaseChartPrice(
    baseProjectionForPricing,
    sidePadHeight,
    overallFaceFootprint,
  );
  let baseSalesPrice = baseChartList * 2;

  if (projection <= 10) {
    baseSalesPrice -= 10;
  }

  const bevelAdder = getBevelAdder(selectedBevel.back, selectedBevel.face);
  const pleatRate = getPleatRatePerFoot(selectedBevel.face);
  const pleatLinearFeet = (sidePadHeight / 12) * 2;
  const pleatAdder = pleatLinearFeet * pleatRate;

  let headPadHeightAdder = 0;
  if (series === "1000" && headPadHeight > 12) {
    headPadHeightAdder = getHeadPadOptionalHeightAdder(
      baseProjectionForPricing,
      headPadHeight,
    );
  }

  let dropCurtainAdder = 0;
  if (series === "1000" && dropCurtain > 0) {
    dropCurtainAdder = 88;
  }

  let headCapAdder = 0;
  let headCurtainAdder = 0;
  if (series === "1400") {
    headCapAdder = 50;
    headCurtainAdder = 112;

    if (headCurtainLength > 24) {
      headCurtainAdder += Math.ceil((headCurtainLength - 24) / 6) * 40;
    }
  }

  const steelBackAdder = backingType === "Quote metal back" ? 275 : 0;
  const headPadWidthFeetForBlockout = Math.ceil(overallFaceFootprint / 12);
  const blockoutAdder = getBlockoutPrice(
    series,
    sidePadHeight,
    headPadWidthFeetForBlockout,
    blockoutThicknessUsed,
  );

  const subtotalPrice =
    baseSalesPrice +
    bevelAdder +
    pleatAdder +
    headPadHeightAdder +
    dropCurtainAdder +
    headCapAdder +
    headCurtainAdder +
    steelBackAdder +
    blockoutAdder;

  const totalEstimatedPrice = Math.round(subtotalPrice * 1.1);

  const footerMaterialDisplay = R === "other" ? ROther : R || "—";
  const wallTypeDisplay = S === "other" ? SOther : S || "—";

  return {
    ok: true,
    series,
    projection,
    topProjection,
    selectedBevelCode: selectedBevel.code,
    overallFaceFootprint,
    wallBackFootprint,
    offsetEachSide,
    requiredClearanceEachSide,
    bottomWallToTruckDistance,
    sidingReduction,
    blockoutThicknessUsed,
    requiredTopWallToTruckMin,
    topWallToTruckDistance,
    backingType,
    sidePadHeight,
    requiredTopClearance,
    calculatedTopClearance,
    openingTopFromDrive,
    slopePercent,
    headPadHeight,
    dropCurtain,
    headCurtainLength,
    splitCurtain,
    frontTopOfAssembly,
    backTopOfAssembly,
    notes,
    subtotalPrice,
    totalEstimatedPrice,
    baseSalesPrice,
    bevelAdder,
    pleatAdder,
    headPadHeightAdder,
    dropCurtainAdder,
    headCapAdder,
    headCurtainAdder,
    steelBackAdder,
    blockoutAdder,
    footerMaterialDisplay,
    wallTypeDisplay,
    truckTypeNote,
    backingNote,
  };
}

function buildEmailHtml(args: {
  controlNumber: string;
  payload: Payload;
  calc: Exclude<CalcResult, { ok: false }>;
  shipping: Exclude<ShippingResult, { ok: false }>;
  quantity: number;
  sealSubtotal: number;
  grandTotal: number;
  title: string;
  invoiceUrl: string;
  draftOrderName: string;
}) {
  const { controlNumber, payload, calc, shipping, quantity, sealSubtotal, grandTotal, title, invoiceUrl, draftOrderName } = args;

  const enteredRows = [
    ["A", payload.a], ["B", payload.b], ["C", payload.c], ["D", payload.d],
    ["E", payload.e], ["F", payload.f], ["G", payload.g], ["H", payload.h],
    ["I", payload.i], ["J", payload.j], ["K", payload.k], ["L", payload.l],
    ["M", payload.m], ["N", payload.n], ["O", payload.o], ["P", payload.p],
    ["Q", payload.q], ["R", calc.footerMaterialDisplay], ["S", calc.wallTypeDisplay],
    ["Quantity", String(quantity)], ["Shipping ZIP", shipping.zip], ["Shipping State", shipping.state],
  ];

  const calculatedRows = [
    ["Control Number", controlNumber],
    ["Draft Order", draftOrderName],
    ["Item Title", title],
    ["Series", calc.series],
    ["Projection", `${calc.projection}"`],
    ["Top Projection", `${calc.topProjection}"`],
    ["Bevel", calc.selectedBevelCode],
    ["Overall Face Footprint", `${calc.overallFaceFootprint}"`],
    ["Wall Back Footprint", `${calc.wallBackFootprint}"`],
    ["Offset Each Side", `${calc.offsetEachSide}"`],
    ["Required Clearance Each Side", `${calc.requiredClearanceEachSide}"`],
    ["Bottom Wall to Truck Distance", `${calc.bottomWallToTruckDistance}"`],
    ["Top Wall to Truck Distance", `${calc.topWallToTruckDistance.toFixed(2)}"`],
    ["Required Top Wall to Truck Min", `${calc.requiredTopWallToTruckMin}"`],
    ["Siding Reduction", `${calc.sidingReduction}"`],
    ["Blockout Thickness Used", `${calc.blockoutThicknessUsed}"`],
    ["Backing Type", calc.backingType],
    ["Side Pad Height", `${calc.sidePadHeight}"`],
    ["Required Top Clearance", `${calc.requiredTopClearance}"`],
    ["Calculated Top Clearance", `${calc.calculatedTopClearance}"`],
    ["Opening Top From Drive", `${calc.openingTopFromDrive}"`],
    ["Slope Percent", `${calc.slopePercent.toFixed(2)}%`],
    ["Head Pad Height", `${calc.headPadHeight}"`],
    ["Drop Curtain", `${calc.dropCurtain}"`],
    ["Head Curtain Length", `${calc.headCurtainLength}"`],
    ["Split Curtain", `${calc.splitCurtain}"`],
    ["Front Top Of Assembly", calc.frontTopOfAssembly ? `${calc.frontTopOfAssembly}"` : "—"],
    ["Back Top Of Assembly", calc.backTopOfAssembly ? `${calc.backTopOfAssembly}"` : "—"],
    ["Base Sales Price", dollars(calc.baseSalesPrice)],
    ["Bevel Adder", dollars(calc.bevelAdder)],
    ["Pleat Adder", dollars(calc.pleatAdder)],
    ["Head Pad Height Adder", dollars(calc.headPadHeightAdder)],
    ["Drop Curtain Adder", dollars(calc.dropCurtainAdder)],
    ["Head Cap Adder", dollars(calc.headCapAdder)],
    ["Head Curtain Adder", dollars(calc.headCurtainAdder)],
    ["Steel Back Adder", dollars(calc.steelBackAdder)],
    ["Blockout Adder", dollars(calc.blockoutAdder)],
    ["Per Seal Price", dollars(calc.totalEstimatedPrice)],
    ["Seal Subtotal", dollars(sealSubtotal)],
    ["Shipping Zone", shipping.zone],
    ["Shipping Charge", dollars(shipping.amount)],
    ["Grand Total", dollars(grandTotal)],
  ];

  const renderRows = (rows: Array<[string, string]>) =>
    rows
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 10px;border:1px solid #ddd;font-weight:600;">${escapeHtml(label)}</td><td style="padding:6px 10px;border:1px solid #ddd;">${escapeHtml(value)}</td></tr>`,
      )
      .join("");

  const notesHtml = calc.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("");

  return `
    <div style="font-family:Arial,sans-serif;color:#111;">
      <h2 style="margin-bottom:8px;">Dock Seal Submission</h2>
      <p><strong>Control Number:</strong> ${escapeHtml(controlNumber)}</p>
      <p><strong>Draft Order:</strong> ${escapeHtml(draftOrderName)}</p>
      <p><strong>Invoice URL:</strong> <a href="${escapeHtml(invoiceUrl)}">${escapeHtml(invoiceUrl)}</a></p>

      <h3>Entered Inputs</h3>
      <table style="border-collapse:collapse;width:100%;max-width:900px;">
        ${renderRows(enteredRows)}
      </table>

      <h3 style="margin-top:24px;">Calculated Configuration</h3>
      <table style="border-collapse:collapse;width:100%;max-width:900px;">
        ${renderRows(calculatedRows)}
      </table>

      <h3 style="margin-top:24px;">Notes / Options</h3>
      <ul>${notesHtml}</ul>

      ${
        calc.backingNote
          ? `<p><strong>Backing Note:</strong> ${escapeHtml(calc.backingNote)}</p>`
          : ""
      }
      ${
        calc.truckTypeNote
          ? `<p><strong>Truck Type Note:</strong> ${escapeHtml(calc.truckTypeNote)}</p>`
          : ""
      }
    </div>
  `;
}

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.public.appProxy(request);

  return json({
    ok: true,
    message: "GET ROUTE REACHED",
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.public.appProxy(request);

  if (!admin || !session) {
    return json(
      {
        ok: false,
        message: "App proxy authenticated, but no installed shop session was available.",
      },
      { status: 401 },
    );
  }

  const formData = await request.formData();

  const payload: Payload = {
    a: String(formData.get("a") || ""),
    b: String(formData.get("b") || ""),
    c: String(formData.get("c") || ""),
    d: String(formData.get("d") || ""),
    e: String(formData.get("e") || ""),
    f: String(formData.get("f") || ""),
    g: String(formData.get("g") || ""),
    h: String(formData.get("h") || ""),
    i: String(formData.get("i") || ""),
    j: String(formData.get("j") || ""),
    k: String(formData.get("k") || ""),
    l: String(formData.get("l") || ""),
    m: String(formData.get("m") || ""),
    n: String(formData.get("n") || ""),
    o: String(formData.get("o") || ""),
    p: String(formData.get("p") || ""),
    q: String(formData.get("q") || ""),
    r: String(formData.get("r") || ""),
    r_other: String(formData.get("r_other") || ""),
    s: String(formData.get("s") || ""),
    s_other: String(formData.get("s_other") || ""),
    quantity: String(formData.get("quantity") || "1"),
    ship_zip: String(formData.get("ship_zip") || ""),
  };

  const quantity = parseWholeNumber(payload.quantity, 1);

  const calc = calculateSeal(payload);
  if (!calc.ok) {
    return json({ ok: false, message: calc.message }, { status: 400 });
  }

  const zipLookup = await lookupStateFromZip(payload.ship_zip);
  if (!zipLookup.ok) {
    return json({ ok: false, message: zipLookup.message }, { status: 400 });
  }

  const shipping = getShippingPriceFromState(zipLookup.state, quantity, zipLookup.zip);
  if (!shipping.ok) {
    return json({ ok: false, message: shipping.message }, { status: 400 });
  }

  const sealSubtotal = calc.totalEstimatedPrice * quantity;
  const grandTotal = sealSubtotal + shipping.amount;
  const controlNumber = generateControlNumber();

  const mutation = `#graphql
    mutation draftOrderCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder {
          id
          invoiceUrl
          name
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const title =
    calc.series === "1000"
      ? "Dock Seal with Head Pad"
      : "Dock Seal with Head Cap";

  const noteLines = [
    "Dock seal generated from configurator",
    `Control Number: ${controlNumber}`,
    `Series: ${calc.series}`,
    `Quantity: ${quantity}`,
    `Per Seal Price: ${dollars(calc.totalEstimatedPrice)}`,
    `Seal Subtotal: ${dollars(sealSubtotal)}`,
    `Shipping ZIP: ${shipping.zip}`,
    `Shipping State: ${shipping.state}`,
    `Shipping Zone: ${shipping.zone}`,
    `Shipping Charge: ${dollars(shipping.amount)}`,
    `Grand Total: ${dollars(grandTotal)}`,
    `Projection: ${calc.projection}"`,
    `Top Projection: ${calc.topProjection}"`,
    `Bevel: ${calc.selectedBevelCode}`,
    `Overall Face Footprint: ${calc.overallFaceFootprint}"`,
    `Backing Type: ${calc.backingType}`,
    `Footer Material: ${calc.footerMaterialDisplay}`,
    `Wall Type: ${calc.wallTypeDisplay}`,
    calc.backingNote ? `Backing Note: ${calc.backingNote}` : "",
    calc.truckTypeNote ? `Truck Type Note: ${calc.truckTypeNote}` : "",
    `Options: ${calc.notes.join(", ")}`,
  ].filter(Boolean);

  const cleanDescription = `(A ${payload.a})(B ${payload.b})(C ${payload.c})(D ${payload.d})(E ${payload.e})(F ${payload.f})(G ${payload.g})(H ${payload.h})(I ${payload.i})(J ${payload.j})(K ${payload.k})(L ${payload.l})(M ${payload.m})(N ${payload.n})(O ${payload.o})(P ${payload.p})(Q ${payload.q})(R ${calc.footerMaterialDisplay})(S ${calc.wallTypeDisplay}) | Control # ${controlNumber}`;

  const variables = {
    input: {
      note: `Qty: ${quantity} | Unit: ${dollars(calc.totalEstimatedPrice)} | Freight: ${dollars(shipping.amount)} | ZIP: ${shipping.zip} | Subtotal: ${dollars(grandTotal)}`,
      tags: ["dock-seal-config"],
      lineItems: [
        {
          title,
          quantity: 1,
          originalUnitPriceWithCurrency: {
            amount: grandTotal,
            currencyCode: "USD",
          },
          taxable: true,
          customAttributes: [
            { key: "Config", value: cleanDescription },
            { key: "Quantity", value: String(quantity) },
            { key: "Unit Price", value: dollars(calc.totalEstimatedPrice) },
            { key: "Freight", value: dollars(shipping.amount) },
            { key: "ZIP", value: shipping.zip },
            { key: "Subtotal", value: dollars(grandTotal) },
          ],
        }
      ],
    },
  };

  const response = await admin.graphql(mutation, { variables });
  const responseJson = await response.json();

  const data = responseJson.data?.draftOrderCreate;
  const userErrors = data?.userErrors || [];

  if (userErrors.length) {
    return json(
      {
        ok: false,
        message: userErrors.map((e: { message: string }) => e.message).join(" | "),
      },
      { status: 400 },
    );
  }

  const invoiceUrl = data.draftOrder.invoiceUrl as string;
  const draftOrderName = data.draftOrder.name as string;

  const resendApiKey = process.env.RESEND_API_KEY;
  const configEmailTo = process.env.CONFIG_EMAIL_TO;
  const configEmailFrom = process.env.CONFIG_EMAIL_FROM;

  let emailSent = false;
  let emailWarning = "";

  if (resendApiKey && configEmailTo && configEmailFrom) {
    try {
      const resend = new Resend(resendApiKey);
      const html = buildEmailHtml({
        controlNumber,
        payload,
        calc,
        shipping,
        quantity,
        sealSubtotal,
        grandTotal,
        title,
        invoiceUrl,
        draftOrderName,
      });

      const emailResult = await resend.emails.send({
        from: configEmailFrom,
        to: [configEmailTo],
        subject: `Dock Seal Submission ${controlNumber}`,
        html,
      });

      if (emailResult.error) {
        emailWarning = emailResult.error.message || "Submission email failed to send.";
      } else {
        emailSent = true;
      }
    } catch (error) {
      emailWarning =
        error instanceof Error ? error.message : "Submission email failed to send.";
    }
  } else {
    emailWarning =
      "Submission email was skipped because RESEND_API_KEY, CONFIG_EMAIL_TO, or CONFIG_EMAIL_FROM is missing.";
  }

  return json({
    ok: true,
    message: "DRAFT ORDER CREATED",
    shop: session.shop,
    draftOrderId: data.draftOrder.id,
    invoiceUrl,
    name: draftOrderName,
    controlNumber,
    emailSent,
    emailWarning,
  });
}
