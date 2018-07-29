// The reference for understanding CIECAM02 is:
// http://www.springer.com/cda/content/document/cda_downloaddocument/9781441961891-c1.pdf

import * as ciebase from "ciebase-ts";
import { Vector3D } from "ciebase-ts";
import * as ciecam02 from "../lib";
import { IJchProps, IViewingConditions } from "../lib";

const { illuminant, rgb, workspace } = ciebase;
const { cfs, lerp, hq } = ciecam02;

const { min, max } = Math;

//
// Shared settings for the examples
//

const xyz = ciebase.xyz(workspace.sRGB, illuminant.D65);

const viewingConditions: IViewingConditions = {
    adaptingLuminance: 40,
    backgroundLuminance: 20,
    discounting: false,
    surroundType: "average",
    whitePoint: illuminant.D65,
};

// By default, 7 correlates are returned when converting from XYZ to CAM.
// For the purpose of this example, we will limit ourselves to the JCh correlates.
// (J is the lightness, C the chroma and h the hue.)
const cam = ciecam02.cam(viewingConditions, cfs("JCh"));
const gamut = ciecam02.gamut(xyz, cam);

const ucs = ciecam02.ucs();

function hexToCam(hex: string) {
    return cam.fromXyz(xyz.fromRgb(rgb.fromHex(hex)));
}

function camToHex(CAM: IJchProps) {
    return rgb.toHex(xyz.toRgb(cam.toXyz(CAM)));
}

function crop(v: number) {
    return max(0, min(1, v));
}

//
// Example 1
//

const example1 = () => {
    const camSand = hexToCam("e0cda9");
    // {J: 77.82, C: 16.99, h: 81.01}
    const camOrange = { ...camSand, C: 90 };
    // {J: 77.82, C: 90.00, h: 81.01}
    const [isInside, rgbOrange] = gamut.contains(camOrange);
    // [false, [1.09, 0.73, -0.7]]

    if (!isInside) {
        // The gamut.limit function interpolates between an inside and an outside point
        // and return an inside point as close as possible to the boundary.
        // (The gamut is the set of CAM values that maps to valid RGB coordinates.)
        const camOrange1 = gamut.limit(camSand, camOrange);
        // {J: 77.82, C: 55.23, h: 81.01}
        // The alternative method is to simply crop the RGB coordinates
        const camOrange2 = cam.fromXyz(xyz.fromRgb(rgbOrange.map(crop) as Vector3D));
        // {J: 74.43, C: 67.60, h: 81.30}

        // tslint:disable-next-line:no-console
        console.log([camOrange1, camOrange2].map(camToHex));             // #ffc447   #ffb900
    } else {
        // tslint:disable-next-line:no-console
        console.log(rgb.toHex(rgbOrange));
    }
};

//
// Example 2
//

const example2 = () => {
    function gradient(camStart: IJchProps, camEnd: IJchProps, steps = 3) {
        const result = [];
        for (let ε = 1 / (steps + 1), t = 0; steps > -2; t += ε, steps -= 1) {
            const camBetween = lerp(camStart as any, camEnd as any, crop(t));
            const hex = rgb.toHex(xyz.toRgb(cam.toXyz(camBetween as any) as Vector3D).map(crop) as Vector3D);
            result.push(hex);
        }
        return result;
    }

    const hexCodes = gradient(
        // camStart
        hexToCam("17657d"),
        // camEnd
        hexToCam("fee7f0"),
        // steps
        8,
    );

    // tslint:disable-next-line:no-console
    console.log(hexCodes);
};

//
// Example 3
//

const objectMap = <T, R>(
    obj: { [key: string]: T },
    fn: (key: string, value: T, index: number, o: { [key: string]: T }) => R,
) => {
    const r: { [key: string]: R } = {};
    Object.keys(obj).forEach((key, index) => {
        r[key] = fn(key, obj[key], index, obj);
    });
    return r;
};

const example3 = () => {
    function ucsLimit(camIn: IJchProps, camOut: IJchProps, prec = 1e-3) {
        // UCS is based on the JMh correlates
        let [ucsIn, ucsOut] = [camIn, camOut].map((v) => ucs.fromCam(cam.fillOut(cfs("JMh"), v)));
        while (ucs.distance(ucsIn, ucsOut) > prec) {
            const ucsMid = lerp(ucsIn as any, ucsOut as any, 0.5);
            const [isInside] = gamut.contains(ucs.toCam(ucsMid as any) as any);
            if (isInside) {
                ucsIn = ucsMid as any;
            } else {
                ucsOut = ucsMid as any;
            }
        }
        return cam.fillOut(objectMap(camIn as any, () => true), ucs.toCam(ucsIn as any) as any);
    }

    // The hue notation is a different writting of the hue quadrant,
    // of the form a(p?b)? where a and b are in {R, Y, G, B} (a ≠ b)
    // and p is in ]0, 100[. apb = b(100-p)a, ab = a50b.
    function hue(N: string) {
        return hq.toHue(hq.fromNotation(N));
    }

    const topChroma = max(...["f00", "0f0", "00f"].map((v) => hexToCam(v).C));
    const camRed: IJchProps    = { J: 60, C: topChroma + 1, h: hue("R") };
    const camYellow: IJchProps = { J: 90, C: topChroma + 1, h: hue("Y") };
    const camGreen: IJchProps  = { J: 90, C: topChroma + 1, h: hue("G") };
    const camBlue: IJchProps   = { J: 70, C: topChroma + 1, h: hue("B") };

    const hexCodes = [camRed, camYellow, camGreen, camBlue].map((CAM) => {
        CAM = ucsLimit(gamut.spine(CAM.J / 100) as any, CAM);
        return camToHex(CAM);
    });

    // tslint:disable-next-line:no-console
    console.log(hexCodes);
};

//
// Main
//

const main = () => {
    // tslint:disable-next-line:no-console
    console.log("Example 1");
    example1();
    // tslint:disable-next-line:no-console
    console.log("Example 2");
    example2();
    // tslint:disable-next-line:no-console
    console.log("Example 3");
    example3();
    // tslint:disable-next-line:no-console
    console.log("Done");
};

main();
