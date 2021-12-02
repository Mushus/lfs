export const getEnvironment = () => {
    const bucketName = process.env.BUCKET_NAME || "";
    const anonymousAuthority = parseList(process.env.ANONYMOUS_AUTHORITY, []);
    const expires = parseNumber(process.env.EXPIRES, 60 * 60);
    const userPoolId = process.env.USERPOOL_ID || "";
    const clientId = process.env.CLIENT_ID || "";
    const clientSecret = process.env.CLIENT_SECRET || "";
    return {
        bucketName,
        anonymousAuthority,
        expires,
        userPoolId,
        clientId,
        clientSecret,
    };
};

const parseNumber = (value: string | undefined, defaultValue?: number) => {
    if (value !== undefined && value !== "") {
        try {
            const parsed = Number(value);
            if (!Number.isNaN(parsed)) return parsed;
        } catch (e) {}
    }

    if (defaultValue === undefined) throw new Error("parse error");
    return defaultValue;
};

const parseBool = (value: string | undefined, defaultValue?: boolean) => {
    switch (value) {
        case "true":
        case "yes":
        case "1":
            return true;
        case "false":
        case "no":
        case "0":
            return false;
        default:
            if (defaultValue === undefined) throw new Error("parse error");
            return defaultValue;
    }
};

const parseList = (value: string | undefined, defaultValue?: string[]) => {
    if (value !== undefined && value !== "") {
        return value.split(",").map((s) => s.trim());
    }

    if (defaultValue === undefined) throw new Error("parse error");
    return defaultValue;
};
