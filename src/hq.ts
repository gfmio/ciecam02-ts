// tslint:disable:variable-name object-literal-sort-keys

import {corLerp} from "./helpers";

const {floor} = Math;

const uniqueHues = [
    {s: "R", h: 20.14, e: 0.8, H: 0},
    {s: "Y", h: 90.00, e: 0.7, H: 100},
    {s: "G", h: 164.25, e: 1.0, H: 200},
    {s: "B", h: 237.53, e: 1.2, H: 300},
    {s: "R", h: 380.14, e: 0.8, H: 400},
];

const hueSymbols = uniqueHues.map((v) => v.s).slice(0, -1).join("");

export function fromHue(h: number) {
    if (h < uniqueHues[0].h) {
        h += 360;
    }

    let j = 0;
    while (uniqueHues[j + 1].h < h) {
        j++;
    }

    const d_j = (h - uniqueHues[j].h) / uniqueHues[j].e;
    const d_k = (uniqueHues[j + 1].h - h) / uniqueHues[j + 1].e;
    const H_j = uniqueHues[j].H;

    return H_j + 100 * d_j / (d_j + d_k);
}

export function toHue(H: number) {
    const j = floor(H / 100);
    const amt = H % 100;
    const [{ e: e_j, h: h_j }, { e: e_k, h: h_k }] = uniqueHues.slice(j, j + 2);
    const h = ((amt * (e_k * h_j - e_j * h_k) - 100 * h_j * e_k) / (amt * (e_k - e_j) - 100 * e_k));
    return h;
}

const shortcuts: { [key: string]: string | undefined } = {
    O: "RY",
    S: "YG",
    T: "G25B",
    C: "GB",
    A: "B25G",
    V: "B25R",
    M: "BR",
    P: "R25B",
};

export function fromNotation(N: string): number {
    const a = N.match(/^([a-z])(?:(.+)?([a-z]))?$/i);
    const H1 = a[1];
    const P = a[2] || "50";
    const H2 = a[3] || H1;

    const extractHue = (v: string) => {
        v = v.toUpperCase();
        const sc = shortcuts[v];
        return sc ? fromNotation(sc) : 100 * hueSymbols.indexOf(v);
    };

    const nH1 = extractHue(H1);
    const nH2 = extractHue(H2);
    const nP = parseFloat(P) / 100;

    return corLerp(nH1, nH2, nP, "H");
}

export function toNotation(H: number) {
    let i = floor(H / 100);
    let j = (i + 1) % hueSymbols.length;
    let p = (H - i * 100);
    if (p > 50) {
        [i, j] = [j, i];
        p = 100 - p;
    }
    if (p < 1) {
        return hueSymbols[i];
    } else {
        return hueSymbols[i] + p.toFixed() + hueSymbols[j];
    }
}

export default {
    fromHue,
    toHue,
    fromNotation,
    toNotation,
};
