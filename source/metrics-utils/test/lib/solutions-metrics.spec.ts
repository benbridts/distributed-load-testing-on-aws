// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SolutionsMetrics } from "../../lib/solutions-metrics";
import { SolutionsMetricProps } from "../../lambda/helpers/types";
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";

test("Test that query definition correctly adds StartQuery/GetQueryResults permissions", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: "us-east-1" },
  });

  const sourceBucket = Bucket.fromBucketName(stack, "SourceCodeBucket", "testBucket");

  const props: SolutionsMetricProps = {
    metricDataProps: [],
    queryProps: [],
    sourceCodeBucket: sourceBucket,
    sourceCodePrefix: "testPrefix",
  };
  const solutionsMetrics = new SolutionsMetrics(stack, "test-one", props);
  solutionsMetrics.addLambdaBilledDurationMemorySize(
    [LogGroup.fromLogGroupName(stack, "LogGroupID", "SomeLogGroup")],
    "ExampleQuery"
  );
  const template = Template.fromStack(stack);
  assertPolicyStatementContains(template, [
    {
      Action: ["logs:StartQuery", "logs:GetQueryResults"],
      Effect: "Allow",
      Resource: Match.anyValue(),
    },
    {
      Action: "logs:DescribeQueryDefinitions",
      Effect: "Allow",
      Resource: "*",
    },
  ]);
});

test("Test that a metric data query correctly adds GetMetricData permission", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: "us-east-1" },
  });

  const sourceBucket = Bucket.fromBucketName(stack, "SourceCodeBucket", "testBucket");

  const props: SolutionsMetricProps = {
    metricDataProps: [],
    queryProps: [],
    sourceCodeBucket: sourceBucket,
    sourceCodePrefix: "testPrefix",
  };
  const solutionsMetrics = new SolutionsMetrics(stack, "test-one", props);
  solutionsMetrics.addLambdaInvocationCount("SomeFunctionName");
  const template = Template.fromStack(stack);
  assertPolicyStatementContains(template, [
    {
      Action: "cloudwatch:GetMetricData",
      Effect: "Allow",
      Resource: "*",
    },
  ]);
});

test("Test that a query definition and metric data query correctly adds all required permissions", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: "us-east-1" },
  });

  const sourceBucket = Bucket.fromBucketName(stack, "SourceCodeBucket", "testBucket");

  const props: SolutionsMetricProps = {
    metricDataProps: [],
    queryProps: [],
    sourceCodeBucket: sourceBucket,
    sourceCodePrefix: "testPrefix",
  };
  const solutionsMetrics = new SolutionsMetrics(stack, "test-one", props);
  solutionsMetrics.addLambdaBilledDurationMemorySize(
    [LogGroup.fromLogGroupName(stack, "LogGroupID", "SomeLogGroup")],
    "ExampleQuery"
  );
  solutionsMetrics.addLambdaInvocationCount("SomeFunctionName");
  const template = Template.fromStack(stack);
  assertPolicyStatementContains(template, [
    {
      Action: ["logs:StartQuery", "logs:GetQueryResults"],
      Effect: "Allow",
      Resource: Match.anyValue(),
    },
    {
      Action: "logs:DescribeQueryDefinitions",
      Effect: "Allow",
      Resource: "*",
    },
    {
      Action: "cloudwatch:GetMetricData",
      Effect: "Allow",
      Resource: "*",
    },
  ]);
});

test("Test that metric data queries are defined correctly", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: "us-east-1" },
  });

  const sourceBucket = Bucket.fromBucketName(stack, "SourceCodeBucket", "testBucket");

  const props: SolutionsMetricProps = {
    metricDataProps: [],
    queryProps: [],
    sourceCodeBucket: sourceBucket,
    sourceCodePrefix: "testPrefix",
  };
  const solutionsMetrics = new SolutionsMetrics(stack, "test-one", props);
  solutionsMetrics.addLambdaInvocationCount("SomeFunctionName");

  const template = Template.fromStack(stack);
  template.hasResourceProperties("AWS::Events::Rule", {
    ScheduleExpression: Match.anyValue(),
    State: "ENABLED",
    Targets: [
      {
        Arn: Match.anyValue(),
        Id: Match.anyValue(),
        InputTransformer: {
          InputPathsMap: Match.anyValue(),
          InputTemplate: Match.anyValue(),
        },
      },
    ],
  });
});

test("Test that multiple query definitions are defined correctly", () => {
  const stack = new cdk.Stack(undefined, undefined, {
    env: { account: "123456789012", region: "us-east-1" },
  });

  const sourceBucket = Bucket.fromBucketName(stack, "SourceCodeBucket", "testBucket");

  const props: SolutionsMetricProps = {
    metricDataProps: [],
    queryProps: [],
    sourceCodeBucket: sourceBucket,
    sourceCodePrefix: "testPrefix",
  };
  const solutionsMetrics = new SolutionsMetrics(stack, "test-one", props);
  solutionsMetrics.addLambdaBilledDurationMemorySize(
    [LogGroup.fromLogGroupName(stack, "LogGroupID", "SomeLogGroup")],
    "ExampleQuery"
  );
  solutionsMetrics.addLambdaBilledDurationMemorySize(
    [LogGroup.fromLogGroupName(stack, "LogGroupID2", "SomeLogGroup")],
    "ExampleQuery2"
  );
  const template = Template.fromStack(stack);
  template.hasResource("AWS::Logs::QueryDefinition", {
    Properties: {
      LogGroupNames: ["SomeLogGroup"],
      Name: {
        "Fn::Join": [
          "",
          [
            {
              Ref: "AWS::StackName",
            },
            "-ExampleQuery",
          ],
        ],
      },
      QueryString: Match.anyValue(),
    },
  });

  template.hasResource("AWS::Logs::QueryDefinition", {
    Properties: {
      LogGroupNames: ["SomeLogGroup"],
      Name: {
        "Fn::Join": [
          "",
          [
            {
              Ref: "AWS::StackName",
            },
            "-ExampleQuery2",
          ],
        ],
      },
      QueryString: Match.anyValue(),
    },
  });
});

function assertPolicyStatementContains(template: Template, pattern: any[]) {
  template.hasResourceProperties("AWS::IAM::Policy", {
    PolicyDocument: {
      Statement: Match.arrayWith(pattern),
    },
  });
}
