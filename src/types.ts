
import { TIlluminant, Vector3D } from "ciebase-ts";

export interface IRequiredJchProps {
    J: number;
    C: number;
    h: number;
}

export interface IOptionalJchProps {
    Q: number;
    M: number;
    s: number;
    H: number;
}

export interface IJchProps extends IRequiredJchProps, Partial<IOptionalJchProps> {}
export interface IFullJchProps extends IRequiredJchProps, IOptionalJchProps {}

export interface IXyzConverter {
    fromXyz(XYZ: Vector3D): IJchProps;
    toXyz(CAM: IJchProps): Vector3D;
    fillOut(correlates: { [key: string]: boolean }, inputs: IJchProps): IFullJchProps;
}

export type ICam = Vector3D;

export interface IViewingConditions {
    adaptingLuminance: number;
    backgroundLuminance: number;
    discounting: boolean;
    surroundType: "dim" | "dark" | "average";
    whitePoint: TIlluminant;
}

export interface ISpaceProps {
    K_L: number;
    c_1: number;
    c_2: number;
}

export interface ICAMProps {
    J: number;
    M: number;
    h: number;
}

export interface IUCSProps {
    J_p: number;
    a_p: number;
    b_p: number;
}
