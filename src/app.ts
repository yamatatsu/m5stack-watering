import {
	CloudWatchLogsAction,
	CloudWatchPutMetricAction,
} from "@aws-cdk/aws-iot-actions-alpha";
import * as iot from "@aws-cdk/aws-iot-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";

const app = new cdk.App();
const stack = new cdk.Stack(app, "M5StackWateringStack");

const logGroup = new logs.LogGroup(stack, "LogGroup", {
	logGroupName: "/M5StackWateringRule",
	removalPolicy: cdk.RemovalPolicy.DESTROY,
});

new iot.TopicRule(stack, "TopicRule", {
	topicRuleName: "M5StackWateringRule",
	sql: iot.IotSql.fromStringAsVer20160323(
		"SELECT topic() as topic, topic(2) + topic(3) as sensorName, timestamp() as timestamp, * FROM '/M5StackWatering/+/moisture'",
	),
	actions: [
		new CloudWatchLogsAction(logGroup),
		new CloudWatchPutMetricAction({
			metricName: "moisture",
			metricNamespace: "M5StackWatering",
			metricUnit: "None",
			metricValue: "${moisture}",
		}),
	],
	errorAction: new CloudWatchLogsAction(logGroup),
});
