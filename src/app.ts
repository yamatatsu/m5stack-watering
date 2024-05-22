import {
	CloudWatchLogsAction,
	CloudWatchPutMetricAction,
	IotEventsPutMessageAction,
} from "@aws-cdk/aws-iot-actions-alpha";
import * as iot from "@aws-cdk/aws-iot-alpha";
import {
	ClearTimerAction,
	SetTimerAction,
	TimerDuration,
} from "@aws-cdk/aws-iotevents-actions-alpha";
import * as iotevents from "@aws-cdk/aws-iotevents-alpha";
import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

const app = new cdk.App();
const stack = new cdk.Stack(app, "M5StackWateringStack");

// ======================
// IoT Events

const input = new iotevents.Input(stack, "Input", {
	attributeJsonPaths: ["deviceName", "sensorName", "moisture"],
});

const wet = new iotevents.State({
	stateName: "wet",
	onEnter: [
		{
			eventName: "start-detection",
			condition: iotevents.Expression.currentInput(input),
		},
	],
});
const dry = new iotevents.State({
	stateName: "dry",
	onEnter: [
		{
			eventName: "enter-dry",
			actions: [
				new SetTimerAction(
					"watering-timer",
					TimerDuration.fromDuration(cdk.Duration.days(1)),
				),
			],
		},
	],
	onInput: [
		{
			eventName: "timed-out",
			condition: iotevents.Expression.timeout("watering-timer"),
			actions: [
				{
					_bind(stack) {
						return {
							configuration: {
								iotTopicPublish: {
									mqttTopic: "M5StackWatering/cloud/${deviceName}/pump",
								},
							},
						};
					},
				},
			],
		},
	],
	onExit: [
		{
			eventName: "exit-dry",
			actions: [new ClearTimerAction("watering-timer")],
		},
	],
});
const threshold = iotevents.Expression.fromString("180");
const moisture = iotevents.Expression.inputAttribute(input, "moisture");
wet.transitionTo(dry, { when: iotevents.Expression.lt(moisture, threshold) });
dry.transitionTo(wet, { when: iotevents.Expression.gte(moisture, threshold) });

const detectorModelRole = new iam.Role(stack, "DetectorModelRole", {
	assumedBy: new iam.ServicePrincipal("iotevents.amazonaws.com"),
	inlinePolicies: {
		iotCore: new iam.PolicyDocument({
			statements: [
				new iam.PolicyStatement({ actions: ["iot:Publish"], resources: ["*"] }),
			],
		}),
	},
});

new iotevents.DetectorModel(stack, "DetectorModel", {
	detectorKey: "sensorName",
	initialState: wet,
	role: detectorModelRole,
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
		f(`
			SELECT
				topic() as topic,
				topic(3) as deviceName,
				topic(3) + topic(4) as sensorName,
				timestamp() as timestamp,
				*
			FROM 'M5StackWatering/devices/+/moisture'
		`),
	),
	actions: [
		new CloudWatchLogsAction(logGroup),
		new CloudWatchPutMetricAction({
			metricName: "${topic(3)}${topic(4)}",
			metricNamespace: "M5StackWatering",
			metricUnit: "None",
			metricValue: "${moisture}",
		}),
		new IotEventsPutMessageAction(input),
	],
	errorAction: new CloudWatchLogsAction(logGroup),
});

function f(str: string) {
	return str.trim().replace(/\t/g, "").replace(/\n/g, " ");
}
