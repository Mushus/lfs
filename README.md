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

```
yarn cdk deploy
```
