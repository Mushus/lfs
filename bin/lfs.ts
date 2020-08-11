#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { LfsStack } from '../lib/lfs-stack';

const app = new cdk.App();
new LfsStack(app, 'LfsStack');
