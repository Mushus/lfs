import { S3 } from "aws-sdk";
import dayjs from "dayjs";
import { Handler } from "../interfaces";
import { BatchRequestBody, BatchResponseBody, BatchRespObject } from "../io";
import { Convert } from "../parser";
import {
    success,
    invalidParameter,
    authorizationRequired,
    getBasicAuthorization,
    invalidUserOrPassword,
} from "../helper";
import { getEnvironment } from "../env";
import Cognito from "../adapter/cognito";

const s3 = new S3({
    signatureVersion: "v4",
});

const authorizer = new Cognito();

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
        return invalidParameter();
    }

    const { operation } = requestBody;

    const authParams = getBasicAuthorization(event);
    if (authParams.anonymous) {
        const isAllow = env.anonymousAuthority.includes(operation);
        if (!isAllow) {
            return authorizationRequired();
        }
    } else {
        if (!authParams.id || !authParams.password) return invalidParameter();

        if (!(await authorizer.auth(authParams))) {
            return invalidUserOrPassword();
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

            const url = await s3.getSignedUrlPromise(s3Operation, param);

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

    return success(body);
};
