import * as cdk from "@aws-cdk/core";
import * as cr from '@aws-cdk/custom-resources';
import * as cognito from '@aws-cdk/aws-cognito';

interface ComputeStackProps extends cdk.StackProps {
    userPool: cognito.IUserPool,
    userPoolClient: cognito.IUserPoolClient,
}

export default class UserPool extends cdk.Stack {
    public readonly clientSecret: string;

    constructor(scope: cdk.Construct, id: string, props: ComputeStackProps) {
        super(scope, id, props);

        const region = cdk.Stack.of(this).region;

        const describeCognitoUserPoolClient = new cr.AwsCustomResource(
            this,
            'DescribeCognitoUserPoolClient',
            {
                resourceType: 'Custom::DescribeCognitoUserPoolClient',
                onCreate: {
                    region,
                    service: 'CognitoIdentityServiceProvider',
                    action: 'describeUserPoolClient',
                    parameters: {
                        UserPoolId: props.userPool.userPoolId,
                        ClientId: props.userPoolClient.userPoolClientId,
                    },
                    physicalResourceId: cr.PhysicalResourceId.of(props.userPoolClient.userPoolClientId),
                },
                // TODO: can we restrict this policy more?
                policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
                    resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
                }),
            }
        );
        
        const userPoolClientSecret = describeCognitoUserPoolClient.getResponseField(
        'UserPoolClient.ClientSecret'
        )
        this.clientSecret = userPoolClientSecret;
        new cdk.CfnOutput(this, 'UserPoolClientSecret', {
            value: userPoolClientSecret,
        })

        console.log(userPoolClientSecret.toString());
    }
}