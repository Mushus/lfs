// To parse this data:
//
//   import { Convert, BatchRequestBody, BatchResponseBody, BatchRespObject, BatchRespOperation, UserPutRequestBody } from "./file";
//
//   const batchRequestBody = Convert.toBatchRequestBody(json);
//   const batchResponseBody = Convert.toBatchResponseBody(json);
//   const batchRespObject = Convert.toBatchRespObject(json);
//   const batchRespOperation = Convert.toBatchRespOperation(json);
//   const userPutRequestBody = Convert.toUserPutRequestBody(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface BatchRequestBody {
    objects:    Object[];
    operation:  Operation;
    ref?:       Ref;
    transfers?: string[];
}

export interface Object {
    oid:  string;
    size: number;
}

export enum Operation {
    Download = "download",
    Upload = "upload",
}

export interface Ref {
    name: string;
}

export interface BatchResponseBody {
    objects:  BatchRespObject[];
    transfer: Transfer;
}

export interface BatchRespObject {
    actions:       Actions;
    authenticated: boolean;
    oid:           string;
    size:          number;
}

export interface Actions {
    download?: BatchRespOperation;
    upload?:   BatchRespOperation;
}

export interface BatchRespOperation {
    expires_at: string;
    header:     { [key: string]: string };
    href:       string;
}

export enum Transfer {
    Basic = "basic",
}

export interface UserPutRequestBody {
    password: string;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toBatchRequestBody(json: string): BatchRequestBody {
        return cast(JSON.parse(json), r("BatchRequestBody"));
    }

    public static batchRequestBodyToJson(value: BatchRequestBody): string {
        return JSON.stringify(uncast(value, r("BatchRequestBody")), null, 2);
    }

    public static toBatchResponseBody(json: string): BatchResponseBody {
        return cast(JSON.parse(json), r("BatchResponseBody"));
    }

    public static batchResponseBodyToJson(value: BatchResponseBody): string {
        return JSON.stringify(uncast(value, r("BatchResponseBody")), null, 2);
    }

    public static toBatchRespObject(json: string): BatchRespObject {
        return cast(JSON.parse(json), r("BatchRespObject"));
    }

    public static batchRespObjectToJson(value: BatchRespObject): string {
        return JSON.stringify(uncast(value, r("BatchRespObject")), null, 2);
    }

    public static toBatchRespOperation(json: string): BatchRespOperation {
        return cast(JSON.parse(json), r("BatchRespOperation"));
    }

    public static batchRespOperationToJson(value: BatchRespOperation): string {
        return JSON.stringify(uncast(value, r("BatchRespOperation")), null, 2);
    }

    public static toUserPutRequestBody(json: string): UserPutRequestBody {
        return cast(JSON.parse(json), r("UserPutRequestBody"));
    }

    public static userPutRequestBodyToJson(value: UserPutRequestBody): string {
        return JSON.stringify(uncast(value, r("UserPutRequestBody")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any = ''): never {
    if (key) {
        throw Error(`Invalid value for key "${key}". Expected type ${JSON.stringify(typ)} but got ${JSON.stringify(val)}`);
    }
    throw Error(`Invalid value ${JSON.stringify(val)} for type ${JSON.stringify(typ)}`, );
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases, val);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue("array", val);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue("Date", val);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue("object", val);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, prop.key);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val);
    }
    if (typ === false) return invalidValue(typ, val);
    while (typeof typ === "object" && typ.ref !== undefined) {
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "BatchRequestBody": o([
        { json: "objects", js: "objects", typ: a(r("Object")) },
        { json: "operation", js: "operation", typ: r("Operation") },
        { json: "ref", js: "ref", typ: u(undefined, r("Ref")) },
        { json: "transfers", js: "transfers", typ: u(undefined, a("")) },
    ], "any"),
    "Object": o([
        { json: "oid", js: "oid", typ: "" },
        { json: "size", js: "size", typ: 3.14 },
    ], "any"),
    "Ref": o([
        { json: "name", js: "name", typ: "" },
    ], "any"),
    "BatchResponseBody": o([
        { json: "objects", js: "objects", typ: a(r("BatchRespObject")) },
        { json: "transfer", js: "transfer", typ: r("Transfer") },
    ], "any"),
    "BatchRespObject": o([
        { json: "actions", js: "actions", typ: r("Actions") },
        { json: "authenticated", js: "authenticated", typ: true },
        { json: "oid", js: "oid", typ: "" },
        { json: "size", js: "size", typ: 3.14 },
    ], "any"),
    "Actions": o([
        { json: "download", js: "download", typ: u(undefined, r("BatchRespOperation")) },
        { json: "upload", js: "upload", typ: u(undefined, r("BatchRespOperation")) },
    ], "any"),
    "BatchRespOperation": o([
        { json: "expires_at", js: "expires_at", typ: "" },
        { json: "header", js: "header", typ: m("") },
        { json: "href", js: "href", typ: "" },
    ], "any"),
    "UserPutRequestBody": o([
        { json: "password", js: "password", typ: "" },
    ], "any"),
    "Operation": [
        "download",
        "upload",
    ],
    "Transfer": [
        "basic",
    ],
};
