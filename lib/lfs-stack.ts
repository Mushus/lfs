import { NodejsFunction } from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import * as apigateway from "@aws-cdk/aws-apigateway";
import * as s3 from "@aws-cdk/aws-s3";
import * as iam from "@aws-cdk/aws-iam";
import UserPool from "./UserPool";

export class LfsStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, "bucket");
        const bucketName = bucket.bucketName;

        const userPool = new UserPool(this, "userPools");

        const environment = {
            ANONYMOUS_AUTHORITY: "download",
            BUCKET_NAME: bucketName,
            EXPIRES: String(60 * 60),
            USERPOOL_ID: userPool.userPoolId,
            CLIENT_ID: userPool.clientId,
            CLIENT_SECRET: userPool.clientSecret,
        };

        const batchFunc = new NodejsFunction(this, "batchFunc", {
            entry: "lambda/handler/batch.ts",
            environment,
        });
        bucket.grantReadWrite(batchFunc);
        batchFunc.addToRolePolicy(
            new iam.PolicyStatement({
                resources: [userPool.userPoolArn],
                actions: ["cognito-idp:AdminInitiateAuth"],
            })
        );

        const lockFunc = new NodejsFunction(this, "lockFunc", {
            entry: "lambda/handler/lock.ts",
        });

        const userMePutFunc = new NodejsFunction(this, "userMePutFunc", {
            entry: "lambda/handler/userMePut.ts",
            environment,
        });
        userMePutFunc.addToRolePolicy(
            new iam.PolicyStatement({
                resources: [userPool.userPoolArn],
                actions: [
                    "cognito-idp:AdminInitiateAuth",
                    "cognito-idp:AdminSetUserPassword",
                ],
            })
        );

        const gateway = new apigateway.RestApi(this, "gateway", {
            restApiName: `lfs`,
        });

        const lfsResource = gateway.root.addResource("lfs");
        const userResource = lfsResource.addResource("{user}");
        const repoResource = userResource.addResource("{repo}");
        const objectResource = repoResource.addResource("objects");
        const batchResource = objectResource.addResource("batch");
        batchResource.addMethod(
            "POST",
            new apigateway.LambdaIntegration(batchFunc)
        );
        const lockResource = repoResource.addResource("locks");
        const verifyResource = lockResource.addResource("verify");
        verifyResource.addMethod(
            "POST",
            new apigateway.LambdaIntegration(lockFunc)
        );

        const user = gateway.root.addResource("user");
        const userMeResource = user.addResource("me");
        userMeResource.addMethod(
            "POST",
            new apigateway.LambdaIntegration(userMePutFunc)
        );
    }
}
