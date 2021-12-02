import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AnonymousUser, UnauthorizedUser } from "./interfaces";

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
    body: JSON.stringify(body) + "\n",
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

export const invalidUserOrPassword = () =>
    json(
        401,
        {
            message: "Invalid User Or Password",
        },
        {
            "WWW-Authenticate": "Basic",
        }
    );

export const invalidParameter = () =>
    json(400, {
        message: "Invalid parameter",
    });

export const internalServerError = () =>
    json(500, {
        message: "Internal server error",
    });

export const getBasicAuthorization = (
    event: APIGatewayProxyEvent
): AnonymousUser | UnauthorizedUser => {
    const authorizationHeader = event.headers["Authorization"];
    if (!authorizationHeader) {
        return { anonymous: true };
    }

    const basicValue = authorizationHeader.replace(/^Basic\s/, "");
    const idpass = Buffer.from(basicValue, "base64").toString("ascii");
    const [id = "", password = ""] = idpass.split(":");

    return {
        anonymous: false,
        authorized: false,
        id,
        password,
    };
};
