import {
	CloudWatchLogsAction,
	CloudWatchPutMetricAction,
	IotEventsPutMessageAction,
} from "@aws-cdk/aws-iot-actions-alpha";
import * as iot from "@aws-cdk/aws-iot-alpha";
import {} from "@aws-cdk/aws-iotevents-actions-alpha";
import * as iotevents from "@aws-cdk/aws-iotevents-alpha";
import * as cdk from "aws-cdk-lib";
import * as logs from "aws-cdk-lib/aws-logs";

const app = new cdk.App();
const stack = new cdk.Stack(app, "M5StackWateringStack");

// ======================
// IoT Events

const input = new iotevents.Input(stack, "Input", {
	attributeJsonPaths: ["sensorName", "moisture"],
});

const threshold = iotevents.Expression.fromString("2000");
const moisture = iotevents.Expression.inputAttribute(input, "moisture");

const wet = new iotevents.State({
	stateName: "wet",
	onEnter: [
		{
			eventName: "start-detection",
			condition: iotevents.Expression.currentInput(input),
		},
	],
});
const dry = new iotevents.State({ stateName: "dry" });
wet.transitionTo(dry, { when: iotevents.Expression.gte(moisture, threshold) });
dry.transitionTo(wet, { when: iotevents.Expression.lt(moisture, threshold) });

new iotevents.DetectorModel(stack, "DetectorModel", {
	detectorKey: "sensorName",
	initialState: wet,
});

// ======================
// IoT Core

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
		new IotEventsPutMessageAction(input),
	],
	errorAction: new CloudWatchLogsAction(logGroup),
});
