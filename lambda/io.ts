export interface BatchRequestBody {
    operation: "upload" | "download";
    transfers?: Array<"basic" | string>;
    ref?: {
        name: string;
    };
    objects: Array<{
        oid: string;
        size: number;
    }>;
}

export interface BatchResponseBody {
    transfer: "basic";
    objects: BatchRespObject[];
}

export interface BatchRespObject {
    oid: string;
    size: number;
    authenticated: boolean;
    actions: {
        upload?: BatchRespOperation;
        download?: BatchRespOperation;
    };
}

export interface BatchRespOperation {
    href: string;
    header: {
        [key: string]: string;
    };
    expires_at: string;
}

export interface UserPutRequestBody {
    password: string;
}
