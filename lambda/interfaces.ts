import { APIGatewayEventRequestContext, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export type Handler = (
    event: APIGatewayProxyEvent,
    context: APIGatewayEventRequestContext
) => Promise<APIGatewayProxyResult> | APIGatewayProxyResult;
