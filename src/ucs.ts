// tslint:disable:variable-name

import {degree} from "ciebase-ts";
import { ICAMProps, ISpaceProps, IUCSProps } from "./types";

const {sqrt, pow, exp, log, cos, sin, atan2} = Math;

const uniformSpaces: { [key: string]: ISpaceProps | undefined } = {
    LCD: {K_L: 0.77, c_1: 0.007, c_2: 0.0053},
    SCD: {K_L: 1.24, c_1: 0.007, c_2: 0.0363},
    UCS: {K_L: 1.00, c_1: 0.007, c_2: 0.0228},
};

export interface ICamUcsConverter {
    fromCam(CAM: ICAMProps): IUCSProps;
    toCam(UCS: IUCSProps): ICAMProps;
    distance(UCS1: IUCSProps, UCS2: IUCSProps): number;
}

export function Converter(name: string = "UCS"): ICamUcsConverter {
    const {K_L, c_1, c_2} = uniformSpaces[name];

    function fromCam(CAM: ICAMProps): IUCSProps {
        const {J, M, h} = CAM;
        const h_rad = degree.toRadian(h);
        const J_p = (1 + 100 * c_1) * J / (1 + c_1 * J);
        const M_p = (1 / c_2) * log(1 + c_2 * M);
        const a_p = M_p * cos(h_rad);
        const b_p = M_p * sin(h_rad);
        return {J_p, a_p, b_p};
    }

    function toCam(UCS: IUCSProps): ICAMProps {
        const {J_p, a_p, b_p} = UCS;
        const J = -J_p / (c_1 * J_p - 100 * c_1 - 1);
        const M_p = sqrt(pow(a_p, 2) + pow(b_p, 2));
        const M = (exp(c_2 * M_p) - 1) / c_2;
        const h_rad = atan2(b_p, a_p);
        const h = degree.fromRadian(h_rad);
        return {J, M, h};
    }

    function distance(UCS1: IUCSProps, UCS2: IUCSProps): number {
        return sqrt(pow((UCS1.J_p - UCS2.J_p) / K_L, 2) + pow(UCS1.a_p - UCS2.a_p, 2) + pow(UCS1.b_p - UCS2.b_p, 2));
    }

    return {fromCam, toCam, distance};
}

export default Converter;
