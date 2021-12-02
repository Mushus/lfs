import { CognitoIdentityServiceProvider } from "aws-sdk";
import { getEnvironment } from "../env";
import crypto from "crypto";
import { AuthorizedUser, UnauthorizedUser } from "../interfaces";

export default class Cognito {
    private instance: CognitoIdentityServiceProvider;
    private clientId: string;
    private clientSecret: string;
    private userPoolId: string;

    constructor() {
        this.instance = new CognitoIdentityServiceProvider({
            apiVersion: "2016-04-18",
        });

        const { clientId, clientSecret, userPoolId } = getEnvironment();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.userPoolId = userPoolId;
    }

    async auth(user: UnauthorizedUser): Promise<AuthorizedUser | undefined> {
        try {
            const secretHash = crypto
                .createHmac("sha256", this.clientSecret)
                .update(user.id + this.clientId)
                .digest("base64");

            await this.instance
                .adminInitiateAuth({
                    UserPoolId: this.userPoolId,
                    ClientId: this.clientId,
                    AuthFlow: "ADMIN_NO_SRP_AUTH",
                    AuthParameters: {
                        USERNAME: user.id,
                        PASSWORD: user.password,
                        SECRET_HASH: secretHash,
                    },
                })
                .promise();
        } catch (e) {
            console.log(e);
            return undefined;
        }

        return {
            ...user,
            authorized: true,
        };
    }

    async updatePassword(
        user: AuthorizedUser,
        newPassword: string
    ): Promise<void> {
        this.instance
            .adminSetUserPassword({
                UserPoolId: this.userPoolId,
                Username: user.id,
                Password: newPassword,
                Permanent: true,
            })
            .send();
    }
}
