# LFS

LFS is a secure, cloud-native implementation of the Git LFS server. You can easily build this server yourself.

## feature

-   S3 as a data store
-   UserPool as user management

## install

-   install node
-   install yarn
-   install docker

Configure AWS access keys.

```
export AWS_ACCESS_KEY_ID=AKXXXXXXXXXXXXXXXXXXX
export AWS_SECRET_ACCESS_KEY=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
export AWS_DEFAULT_REGION=ap-northeast-1
```

CDK's initial setup

```
yarn cdk bootstrap
```

Deploy Application
git

```
yarn cdk deploy
```

When you run `yarn cdk deploy`, you will see the following output.

```
Outputs:
LfsStack.gatewayEndpointDA8D204E = https://xxxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/
```

## usage

For example, if the repository you want to use Git LFS is `[UserName]/[RepoName]`, you can use lfs by writing `.lfsconfig` file like this.

```
[remote "origin"]
	lfsurl = https://xxxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/lfs/[UserName]/[RepoName]
```

### user creation

You can create users by operating Cognito from the AWS console.
