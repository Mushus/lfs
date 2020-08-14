import crypto from "crypto";
import { S3, CognitoIdentityServiceProvider } from "aws-sdk";
import dayjs from "dayjs";
import { Handler } from "../interfaces";
import { BatchRequestBody, BatchResponseBody, BatchRespObject } from "../io";
import { Convert } from "../parser";

export const invalidParameter = () => ({
    statusCode: 400,
    headers: {},
    body: JSON.stringify({
        message: "invalid parameter",
    }),
});

const s3 = new S3({
    signatureVersion: "v4",
});

const cognito = new CognitoIdentityServiceProvider({
    apiVersion: "2016-04-18",
});

export const handler: Handler = async (event, context) => {
    const env = getEnvironment();

    if (!event.pathParameters) return invalidParameter();
    const { user, repo } = event.pathParameters;

    if (!user || !repo) return invalidParameter();
    if (!event.body) return invalidParameter();

    let requestBody: BatchRequestBody;
    try {
        requestBody = Convert.toBatchRequestBody(event.body);
    } catch (e) {
        console.log(e);
        return invalidParameter();
    }

    const { operation } = requestBody;

    const authorizationHeader = event.headers.authorization;
    const isAnonymous = !authorizationHeader;
    if (isAnonymous) {
        const isAllow = env.anonymousAuthority.includes(operation);
        if (!isAllow) {
            return {
                statusCode: 401,
                headers: {
                    "WWW-Authenticate": "Basic",
                },
                body: JSON.stringify({
                    message: "Authorization Required",
                }),
            };
        }
    } else {
        const decoder = new Buffer(authorizationHeader, "base64");
        const idpass = decoder.toString("ascii");

        const [id, password] = idpass.split(":");
        if (!id || !password) return invalidParameter();

        const { clientId = "", clientSecret = "", userPoolId = "" } = env;
        try {
            const secretHash = crypto
                .createHmac("sha256", clientSecret)
                .update(id + clientId)
                .digest("base64");
            const resp = await cognito
                .adminInitiateAuth({
                    UserPoolId: userPoolId,
                    ClientId: clientId,
                    AuthFlow: "ADMIN_NO_SRP_AUTH",
                    AuthParameters: {
                        USERNAME: id,
                        PASSWORD: password,
                        SECRET_HASH: secretHash,
                    },
                })
                .promise();
            console.log(resp);
        } catch (e) {
            return {
                statusCode: 401,
                headers: {
                    "WWW-Authenticate": "Basic",
                },
                body: JSON.stringify({
                    message: "Authorization Required",
                }),
            };
        }
    }

    const objectsProc = requestBody.objects.map(
        async ({ oid, size }): Promise<BatchRespObject> => {
            let s3Operation: "getObject" | "putObject";
            switch (operation) {
                case "upload":
                    s3Operation = "putObject";
                    break;
                case "download":
                    s3Operation = "getObject";
                    break;
            }

            const expiresAt = dayjs()
                .add(env.expires, "s")
                .format("YYYY-MM-DDTHH:mm:ssZ");

            const param = {
                Bucket: env.bucketName,
                Key: `${user}/${repo}/${oid}`,
                Expires: env.expires,
            };
            console.log(s3Operation, param);
            const url = await s3.getSignedUrlPromise(s3Operation, param);
            // const url = "test";
            const actions: BatchRespObject["actions"] = {
                [operation]: {
                    href: url,
                    header: {},
                    expires_at: expiresAt,
                },
            };

            return {
                oid,
                size,
                authenticated: true,
                actions,
            };
        }
    );

    const objects = await Promise.all(objectsProc);

    const body: BatchResponseBody = {
        transfer: "basic",
        objects,
    };

    console.log(JSON.stringify(body));

    return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify(body),
    };
};

const getEnvironment = () => {
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
