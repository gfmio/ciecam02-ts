
import { IJchProps } from "./types";

const {abs, pow, sqrt} = Math;

export function corLerp(a: number, b: number, t: number, cor: "H" | "h" | any): number {
    const m =
        cor === "h" ? 360 :
        cor === "H" ? 400 :
        undefined;

    if (m) {
        const d = abs(a - b);
        if (d > m / 2) {
            if (a > b) {
                b += m;
            } else {
                a += m;
            }
        }
    }

    return ((1 - t) * a + t * b) % (m || Infinity);
}

export function lerp(
    start: { [key: string]: number },
    end: { [key: string]: number },
    t: number,
): { [key: string]: number } {
    const res: { [key: string]: number } = {};

    for (const cor of Object.keys(start)) {
        res[cor] = corLerp((start as any)[cor] as number, (end as any)[cor] as number, t, cor);
    }

    return res;
}

export function distance(start: { [key: string]: number }, end: { [key: string]: number }): number {
    let d = 0;
    // tslint:disable-next-line:forin
    for (const cor of Object.keys(start)) {
        d += pow((start as any)[cor] - (end as any)[cor], 2);
    }
    return sqrt(d);
}

export function cfs(str: string): { [key: string]: true } {
    const res: { [key: string]: true } = {};
    str.split("").forEach((key) => { res[key] = true; });
    return res;
}
