import { Handler } from "../interfaces";
import {
    authorizationRequired,
    getBasicAuthorization,
    internalServerError,
    invalidParameter,
    invalidUserOrPassword,
    json,
} from "../helper";
import { Convert } from "../parser";
import { UserPutRequestBody } from "../io";
import Cognito from "../adapter/cognito";

const authorizer = new Cognito();

export const handler: Handler = async (event, context) => {
    let requestBody: UserPutRequestBody;
    try {
        requestBody = Convert.toUserPutRequestBody(event.body ?? "");
    } catch (e) {
        console.log(e);
        return invalidParameter();
    }

    const { password: newPassword } = requestBody;

    const authParams = getBasicAuthorization(event);
    if (authParams.anonymous) {
        return authorizationRequired();
    }

    if (!authParams.id || !authParams.password) return invalidParameter();

    const authorizedUser = await authorizer.auth(authParams);
    if (!authorizedUser) {
        return invalidUserOrPassword();
    }

    try {
        await authorizer.updatePassword(authorizedUser, newPassword);
    } catch {
        return internalServerError();
    }

    return json(200, { message: "OK" });
};
