import { Handler } from "../interfaces";
import { json } from "../helper";

export const handler: Handler = async (event, context) => {
    return json(404, { message: "Lock Is Not Implemented" });
};
