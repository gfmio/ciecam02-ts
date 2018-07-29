// tslint:disable:variable-name

import {degree, helpers, illuminant, matrix, Matrix3D, Vector3D } from "ciebase-ts";
const { sign } = helpers;

import { cfs } from "./helpers";
import * as hq from "./hq";
import { IFullJchProps, IJchProps, IViewingConditions, IXyzConverter } from "./types";

const {pow, sqrt, exp, abs, sin, cos, atan2} = Math;

const surrounds = {
    average: {F: 1.0, c: 0.69, N_c: 1.0},
    dim: {F: 0.9, c: 0.59, N_c: 0.9},
    // tslint:disable-next-line:object-literal-sort-keys
    dark: {F: 0.8, c: 0.535, N_c: 0.8 },
};

const M_CAT02: Matrix3D = [
    [0.7328,  0.4296, -0.1624],
    [-0.7036, 1.6975,  0.0061],
    [0.0030,  0.0136,  0.9834],
];

const M_HPE: Matrix3D = [
    [0.38971,  0.68898, -0.07868],
    [-0.22981, 1.18340,  0.04641],
    [0.00000, 0.00000, 1.00000],
];

const XYZ_to_CAT02 = M_CAT02;
const CAT02_to_XYZ = matrix.inverse(M_CAT02);
const CAT02_to_HPE = matrix.product(M_HPE, matrix.inverse(M_CAT02));
const HPE_to_CAT02 = matrix.product(M_CAT02, matrix.inverse(M_HPE));

const defaultViewingConditions: IViewingConditions = {
    adaptingLuminance: 40,
    backgroundLuminance: 20,
    discounting: false,
    surroundType: "average",
    whitePoint: illuminant.D65,
};

const defaultCorrelates = cfs("QJMCshH");
const vitalCorrelates = cfs("JCh");

// CIECAM02 and Its Recent Developments - Ming Ronnier Luo and Changjun Li
function Converter(viewingConditions: Partial<IViewingConditions> = {}, correlates = defaultCorrelates): IXyzConverter {
    viewingConditions = { ...defaultViewingConditions, ...viewingConditions };

    const XYZ_w = viewingConditions.whitePoint;
    const L_A = viewingConditions.adaptingLuminance;
    const Y_b = viewingConditions.backgroundLuminance;
    const {F, c, N_c} = surrounds[viewingConditions.surroundType];
    const Y_w = XYZ_w[1];

    const k = 1 / (5 * L_A + 1);
    const F_L = 0.2 * pow(k, 4) * 5 * L_A + 0.1 * pow(1 - pow(k, 4), 2) * pow(5 * L_A, 1 / 3);
    const n = Y_b / Y_w;
    const N_bb = 0.725 * pow(1 / n, 0.2);
    const N_cb = N_bb;
    const z = 1.48 + sqrt(n);
    const D = viewingConditions.discounting ? 1 : F * (1 - 1 / 3.6 * exp(-(L_A + 42) / 92));

    const RGB_w = matrix.multiply(M_CAT02, XYZ_w);
    const [D_R, D_G, D_B] = RGB_w.map((v: number) => D * Y_w / v + 1 - D);
    const RGB_cw = correspondingColors(XYZ_w);
    const RGB_aw = adaptedResponses(RGB_cw);
    const A_w = achromaticResponse(RGB_aw);

    function correspondingColors(XYZ: Vector3D): Vector3D {
        const [R, G, B] = matrix.multiply(XYZ_to_CAT02, XYZ);
        return [D_R * R, D_G * G, D_B * B];
    }

    function reverseCorrespondingColors(RGB_c: Vector3D): Vector3D {
        const [R_c, G_c, B_c] = RGB_c;
        return matrix.multiply(CAT02_to_XYZ, [R_c / D_R, G_c / D_G, B_c / D_B]);
    }

    function adaptedResponses(RGB_c: Vector3D): Vector3D {
        return matrix.multiply(CAT02_to_HPE, RGB_c).map((v: number) => {
            const x = pow(F_L * abs(v) / 100, 0.42);
            return sign(v) * 400 * x / (27.13 + x) + 0.1;
        }) as Vector3D;
    }

    function reverseAdaptedResponses(RGB_a: Vector3D): Vector3D {
        return matrix.multiply(HPE_to_CAT02, RGB_a.map((v: number) => {
            const x = v - 0.1;
            return sign(x) * 100 / F_L * pow(27.13 * abs(x) / (400 - abs(x)), 1 / 0.42);
        }) as Vector3D);
    }

    function achromaticResponse(RGB_a: Vector3D): number {
        const [R_a, G_a, B_a] = RGB_a;
        return (R_a * 2 + G_a + B_a / 20 - 0.305) * N_bb;
    }

    function brightness(J: number): number {
        return 4 / c * sqrt(J / 100) * (A_w + 4) * pow(F_L, 0.25);
    }

    function lightness(Q: number): number {
        return 6.25 * pow(c * Q / ((A_w + 4) * pow(F_L, 0.25)), 2);
    }

    function colorfulness(C: number): number {
        return C * pow(F_L, 0.25);
    }

    function chromaFromSaturationBrightness(s: number, Q: number): number {
        return pow(s / 100, 2) * Q / pow(F_L, 0.25);
    }

    function chromaFromColorfulness(M: number): number {
        return M / pow(F_L, 0.25);
    }

    function saturation(M: number, Q: number): number {
        return 100 * sqrt(M / Q);
    }

    function fillOut(someCorrelates: { [key: string]: boolean }, inputs: IJchProps): IFullJchProps {
        const { J, C, s, h, H } = inputs;
        let { M, Q } = inputs;
        const outputs: Partial<IJchProps> = {};

        if (someCorrelates.J) {
            outputs.J = isNaN(J) ? lightness(Q) : J;
        }
        if (someCorrelates.C) {
            if (isNaN(C)) {
                if (isNaN(M)) {
                    Q = isNaN(Q) ? brightness(J) : Q;
                    outputs.C = chromaFromSaturationBrightness(s, Q);
                } else {
                    outputs.C = chromaFromColorfulness(M);
                }
            } else {
                outputs.C = inputs.C;
            }
        }
        if (someCorrelates.h) {
            outputs.h = isNaN(h) ? hq.toHue(H) : h;
        }
        if (someCorrelates.Q) {
            outputs.Q = isNaN(Q) ? brightness(J) : Q;
        }
        if (someCorrelates.M) {
            outputs.M = isNaN(M) ? colorfulness(C) : M;
        }
        if (someCorrelates.s) {
            if (isNaN(s)) {
                Q = isNaN(Q) ? brightness(J) : Q;
                M = isNaN(M) ? colorfulness(C) : M;
                outputs.s = saturation(M, Q);
            } else {
                outputs.s = s;
            }
        }
        if (someCorrelates.H) {
            outputs.H = isNaN(H) ? hq.fromHue(h) : H;
        }

        return outputs as IFullJchProps;
    }

    function fromXyz(XYZ: Vector3D): IJchProps {
        const RGB_c = correspondingColors(XYZ);
        const RGB_a = adaptedResponses(RGB_c);
        const [R_a, G_a, B_a] = RGB_a;

        const a = R_a - G_a * 12 / 11 + B_a / 11;
        const b = (R_a + G_a - 2 * B_a) / 9;
        const h_rad = atan2(b, a);
        const h = degree.fromRadian(h_rad);
        const e_t = 1 / 4 * (cos(h_rad + 2) + 3.8);
        const A = achromaticResponse(RGB_a);
        const J = 100 * pow(A / A_w, c * z);
        const t = (5e4 / 13 * N_c * N_cb * e_t * sqrt(a * a + b * b) / (R_a + G_a + 21 / 20 * B_a));
        const C = pow(t, 0.9) * sqrt(J / 100) * pow(1.64 - pow(0.29, n), 0.73);

        return fillOut(correlates, {J, C, h});
    }

    function toXyz(CAM: IJchProps): Vector3D {
        const {J, C, h} = fillOut(vitalCorrelates, CAM);
        const h_rad = degree.toRadian(h);
        const t = pow(C / (sqrt(J / 100) * pow(1.64 - pow(0.29, n), 0.73)), 10 / 9);
        const e_t = 1 / 4 * (cos(h_rad + 2) + 3.8);
        const A = A_w * pow(J / 100, 1 / c / z);

        const p_1 = 5e4 / 13 * N_c * N_cb * e_t / t;
        const p_2 = A / N_bb + 0.305;
        const q_1 = p_2 * 61 / 20 * 460 / 1403;
        const q_2 = 61 / 20 * 220 / 1403;
        const q_3 = 21 / 20 * 6300 / 1403 - 27 / 1403;

        const sin_h = sin(h_rad);
        const cos_h = cos(h_rad);

        let a;
        let b;

        if (t === 0 || isNaN(t)) {
            a = b = 0;
        } else if (abs(sin_h) >= abs(cos_h)) {
            b = q_1 / (p_1 / sin_h + q_2 * cos_h / sin_h + q_3);
            a = b * cos_h / sin_h;
        } else {
            a = q_1 / (p_1 / cos_h + q_2 + q_3 * sin_h / cos_h);
            b = a * sin_h / cos_h;
        }

        const RGB_a: Vector3D = [
            20 / 61 * p_2 + 451 / 1403 * a +  288 / 1403 * b,
            20 / 61 * p_2 - 891 / 1403 * a -  261 / 1403 * b,
            20 / 61 * p_2 - 220 / 1403 * a - 6300 / 1403 * b,
        ];

        const RGB_c: Vector3D = reverseAdaptedResponses(RGB_a);
        const XYZ = reverseCorrespondingColors(RGB_c);

        return XYZ;
    }

    return {fromXyz, toXyz, fillOut} as IXyzConverter;
}

export default Converter;
