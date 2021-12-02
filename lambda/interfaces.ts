import {
    APIGatewayEventRequestContext,
    APIGatewayProxyEvent,
    APIGatewayProxyResult,
} from "aws-lambda";

export type Handler = (
    event: APIGatewayProxyEvent,
    context: APIGatewayEventRequestContext
) => Promise<APIGatewayProxyResult> | APIGatewayProxyResult;

export interface AnonymousUser {
    anonymous: true;
}
export interface UnauthorizedUser {
    anonymous: false;
    authorized: false;
    id: string;
    password: string;
}

export interface AuthorizedUser {
    anonymous: false;
    authorized: true;
    id: string;
    password: string;
}
