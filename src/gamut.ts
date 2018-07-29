
import { IRgbXyzConverter, rgb, Vector3D } from "ciebase-ts";

import { distance, lerp } from "./helpers";
import { IJchProps, IXyzConverter } from "./types";

function Gamut(xyz: IRgbXyzConverter, cam: IXyzConverter, epsilon: number = 1e-6) {
    const ZERO = -epsilon;
    const ONE = 1 + epsilon;
    const {min, max} = Math;
    const [camBlack, camWhite] = ["000", "fff"].map((hex) => {
        return cam.fromXyz(xyz.fromRgb(rgb.fromHex(hex)));
    });

    function contains(CAM: IJchProps): [boolean, Vector3D] {
        const RGB = xyz.toRgb(cam.toXyz(CAM));
        const isInside = RGB.map((v: number) =>
            (v >= ZERO && v <= ONE)).reduce((a: boolean, b: boolean) => a && b, true);
        return [isInside, RGB];
    }

    function limit(camIn: IJchProps, camOut: IJchProps, prec: number = 1e-3) {
        while (distance(camIn as any, camOut as any) > prec) {
            const camMid = lerp(camIn as any, camOut as any, 0.5);
            const [isInside] = contains(camMid as any);
            if (isInside) {
                camIn = camMid as any;
            } else {
                camOut = camMid as any;
            }
        }
        return camIn;
    }

    function spine(t: number) {
        return lerp(camBlack as any, camWhite as any, t);
    }

    function crop(RGB: Vector3D): Vector3D {
        return RGB.map((v: number) => max(ZERO, min(ONE, v))) as Vector3D;
    }

    return {contains, limit, spine, crop};
}

export default Gamut;
