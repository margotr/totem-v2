// JavaScript code for the micro:bit Demo app.

/**
 * Object that holds application data and functions.
 */
var app = {};

/**
 * Data that is plotted on the canvas.
 */
app.dataPoints = [];

/**
 * Timeout (ms) after which a message is shown if the micro:bit wasn't found.
 */
app.CONNECT_TIMEOUT = 3000;

/**
 * Object that holds micro:bit UUIDs.
 */
app.microbit = {};

app.microbit.ACCELEROMETER_SERVICE = 'e95d0753-251d-470a-a062-fa1922dfa9a8';
app.microbit.ACCELEROMETER_DATA = 'e95dca4b-251d-470a-a062-fa1922dfa9a8';

var BLE_NOTIFICATION_UUID = '00002902-0000-1000-8000-00805f9b34fb';

/**
 * Initialise the application.
 */
app.initialize = function () {
	document.addEventListener(
		'deviceready',
		function () { evothings.scriptsLoaded(app.onDeviceReady) },
		false);

	// Called when HTML page has been loaded.
	$(document).ready(function () {
		// Adjust canvas size when browser resizes
		$(window).resize(app.respondCanvas);

		// Adjust the canvas size when the document has loaded.
		app.respondCanvas();
	});

	// Initialize Firebase
	var config = {
		apiKey: "AIzaSyB3oX3E-b0nLgpfByDAck8X4vdr0rRYhkM",
		authDomain: "totem-v2.firebaseapp.com",
		databaseURL: "https://totem-v2.firebaseio.com",
		projectId: "totem-v2",
		storageBucket: "totem-v2.appspot.com",
		messagingSenderId: "447302954959"
	};

	firebase.initializeApp(config);
	app.database = firebase.database();
};

/**
 * Adjust the canvas dimensions based on its container's dimensions.
 */
app.respondCanvas = function () {
	var canvas = $('#canvas')
	var container = $(canvas).parent()
	canvas.attr('width', $(container).width()) // Max width
	// Not used: canvas.attr('height', $(container).height() ) // Max height
};

function onConnect(context) {
	console.log("Client Connected");
	console.log(context);
}

app.onDeviceReady = function () {
	app.showInfo('Activate the micro:bit and tap Start.');
};

app.showInfo = function (info) {
	document.getElementById('info').innerHTML = info;
};

app.onStartButton = function () {
	console.log("Firebase stuff")
	firebase.database().set('/users/1/').push({boodschap: 'Hallo!'})
	console.log("Done")
	app.onStopButton();
	app.startScan();
	app.showInfo('Status: Scanning...');
	app.startConnectTimer();
};

app.onStopButton = function () {
	// Stop any ongoing scan and close devices.
	app.stopConnectTimer();
	evothings.easyble.stopScan();
	evothings.easyble.closeConnectedDevices();
	app.showInfo('Status: Stopped.');
};

app.startConnectTimer = function () {
	// If connection is not made within the timeout
	// period, an error message is shown.
	app.connectTimer = setTimeout(
		function () {
			app.showInfo('Status: Scanning... ' +
				'Please start the micro:bit.');
		},
		app.CONNECT_TIMEOUT)
}

app.stopConnectTimer = function () {
	clearTimeout(app.connectTimer);
}

app.startScan = function () {
	evothings.easyble.startScan(
		function (device) {
			// Connect if we have found an micro:bit.
			if (app.deviceIsMicrobit(device)) {
				// app.showInfo('Status: Device found: ' + device.name + '.');
				evothings.easyble.stopScan();
				app.connectToDevice(device);
				app.stopConnectTimer();
			}
		},
		function (errorCode) {
			app.showInfo('Error: startScan: ' + errorCode + '.');
		});
};

app.deviceIsMicrobit = function (device) {
	// console.log('device name: ' + device.name);
	return (device != null) &&
		(device.name != null) &&
		((device.name.indexOf('MicroBit') > -1) ||
			(device.name.indexOf('micro:bit') > -1));
};

/**
 * Read services for a device.
 */
app.connectToDevice = function (device) {
	device.connect(
		function (device) {
			app.showInfo('Status: Connected - reading micro:bit services...');
			app.readServices(device);
		},
		function (errorCode) {
			app.showInfo('Error: Connection failed: ' + errorCode + '.');
			evothings.ble.reset();
		});
};

app.readServices = function (device) {
	device.readServices(
		[app.microbit.ACCELEROMETER_SERVICE], // Accelerometer service UUID.
		// Function that monitors accelerometer data.
		app.startAccelerometerNotification,
		// Use this function to monitor magnetometer data
		// (comment out the above line if you try this).
		//app.startMagnetometerNotification,
		function (errorCode) {
			console.log('Error: Failed to read services: ' + errorCode + '.');
		});
};

/**
 * Read accelerometer data.
 * FirmwareManualBaseBoard-v1.5.x.pdf
 */
app.startAccelerometerNotification = function (device) {
	app.showInfo('Status: Starting accelerometer notification...');

	// Due to https://github.com/evothings/cordova-ble/issues/30
	// ... we have to do double work to make it function properly
	// on both Android and iOS. This first part is only needed for Android
	// and causes an error message on iOS that is safe to ignore.

	// Set accelerometer notification to ON.
	device.writeDescriptor(
		app.microbit.ACCELEROMETER_DATA,
		BLE_NOTIFICATION_UUID,
		new Uint8Array([1, 0]),
		function () {
			console.log('Status: writeDescriptor ok.');
		},
		function (errorCode) {
			// This error will happen on iOS, since this descriptor is not
			// listed when requesting descriptors. On iOS you are not allowed
			// to use the configuration descriptor explicitly. It should be
			// safe to ignore this error.
			console.log('Error: writeDescriptor: ' + errorCode + '.');
		});

	// Start accelerometer notification.
	device.enableNotification(
		app.microbit.ACCELEROMETER_DATA,
		function (data) {
			app.showInfo('Status: Data stream active - accelerometer');
			var dataArray = new Uint8Array(data);
			//console.log(evothings.util.typedArrayToHexString(data));
			var values = app.getAccelerometerValues(dataArray);
			showWorkMode(values);
			// app.drawDiagram(values);
		},
		function (errorCode) {
			console.log('Error: enableNotification: ' + errorCode + '.');
		});
};

/**
 * Calculate accelerometer values from raw data for micro:bit.
 * @param data - an Uint8Array.
 * @return Object with fields: x, y, z.
 */
app.getAccelerometerValues = function (data) {
	// We want to scale the values to +/- 1.
	// Documentation says: "Values are in the range +/-1000 milli-newtons, little-endian."
	// Actual maximum values is measured to be 2048.
	var divisor = 2048;

	// Calculate accelerometer values.
	app.rawX = evothings.util.littleEndianToInt16(data, 0);
	app.rawY = evothings.util.littleEndianToInt16(data, 2);
	app.rawZ = evothings.util.littleEndianToInt16(data, 4);
	var ax = app.rawX / divisor;
	var ay = app.rawY / divisor;
	var az = app.rawZ / divisor;

	// log raw values every now and then
	var now = new Date().getTime();	// current time in milliseconds since 1970.
	if (!app.lastLog || now > app.lastLog + 100) {
		// console.log([app.rawX, app.rawY, app.rawZ]);
		//console.log(evothings.util.typedArrayToHexString(data));
		app.lastLog = now;
	}

	// Return result.
	return { x: ax, y: ay, z: az };
};


// Initialize the app.
app.initialize();