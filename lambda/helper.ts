import { APIGatewayProxyResult } from "aws-lambda";

export const json = (
    statusCode: number,
    body: any,
    headers: { [k: string]: string } = {}
): APIGatewayProxyResult => ({
    statusCode,
    headers: {
        "content-type": "application/vnd.git-lfs+json",
        ...headers,
    },
    body: JSON.stringify(body),
});

export const success = (body: any, headers: { [k: string]: string } = {}) =>
    json(200, body, headers);

export const authorizationRequired = () =>
    json(
        401,
        {
            message: "Authorization Required",
        },
        {
            "WWW-Authenticate": "Basic",
        }
    );

export const invalidParameter = () =>
    json(400, {
        message: "invalid parameter",
    });
