import * as cdk from "@aws-cdk/core";
import * as cr from "@aws-cdk/custom-resources";
import * as cognito from "@aws-cdk/aws-cognito";

interface ComputeStackProps {}

export default class UserPool extends cdk.Construct {
    public readonly userPoolId: string;
    public readonly clientSecret: string;
    public readonly clientId: string;

    constructor(
        scope: cdk.Construct,
        id: string,
        props: ComputeStackProps = {}
    ) {
        super(scope, id);

        const userPool = new cognito.UserPool(this, "userPool", {
            mfa: cognito.Mfa.OPTIONAL,
            selfSignUpEnabled: false,
            signInAliases: {
                email: true,
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: false,
                requireUppercase: false,
                requireDigits: false,
                requireSymbols: false,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
            },
        });

        const userPoolClient = new cognito.UserPoolClient(this, "client", {
            userPool,
            userPoolClientName: "lfs",
            generateSecret: true,
        });

        const region = cdk.Stack.of(this).region;

        const describeCognitoUserPoolClient = new cr.AwsCustomResource(
            this,
            "DescribeCognitoUserPoolClient",
            {
                resourceType: "Custom::DescribeCognitoUserPoolClient",
                onCreate: {
                    region,
                    service: "CognitoIdentityServiceProvider",
                    action: "describeUserPoolClient",
                    parameters: {
                        UserPoolId: userPool.userPoolId,
                        ClientId: userPoolClient.userPoolClientId,
                    },
                    physicalResourceId: cr.PhysicalResourceId.of(
                        userPoolClient.userPoolClientId
                    ),
                },
                // TODO: can we restrict this policy more?
                policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
                    resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
                }),
            }
        );

        const userPoolClientSecret = describeCognitoUserPoolClient.getResponseField(
            "UserPoolClient.ClientSecret"
        );

        this.userPoolId = userPool.userPoolId;
        this.clientSecret = userPoolClientSecret;
        this.clientId = userPoolClient.userPoolClientId;
    }
}
