/*
# Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# 
# Licensed under the Apache License, Version 2.0 (the "License").
# You may not use this file except in compliance with the License.
# A copy of the License is located at
# 
#     http://www.apache.org/licenses/LICENSE-2.0
# 
# or in the "license" file accompanying this file. This file is distributed 
# on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either 
# express or implied. See the License for the specific language governing 
# permissions and limitations under the License.
#
*/

'use strict';
var log4js = require('log4js');
log4js.configure({
	appenders: {
	  out: { type: 'stdout' },
	},
	categories: {
	  default: { appenders: ['out'], level: 'info' },
	}
});
var logger = log4js.getLogger('MTAPI');
const WebSocketServer = require('ws');
var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var util = require('util');
var app = express();
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc')
const options = {
  definition: {
    openapi: '3.0.0', // Specification (optional, defaults to swagger: '2.0')
    info: {
      title: 'mtube API', // Title (required)
      version: '1.0.0', // Version (required)
    },
  },
  // Path to the API docs
  apis: ['./app.js'],
};
const swaggerSpec = swaggerJSDoc(options);

var cors = require('cors');
var hfc = require('fabric-client');
const uuidv4 = require('uuid/v4');

var connection = require('./connection.js');
var query = require('./query.js');
var invoke = require('./invoke.js');
var blockListener = require('./blocklistener.js');

hfc.addConfigFile('config.json');
var host = 'localhost';
var port = 3000;
var username = "";
var orgName = "";
var channelName = hfc.getConfigSetting('channelName');
var chaincodeName = hfc.getConfigSetting('chaincodeName');
// echo $PEER
// nd-wdbip5kkffdajdzxliak6rsha4.m-xc2ndal5yrgjbhewevgvgtimji.n-3gx7n35uzrcufli4opmo5alki4.managedblockchain.us-east-1.amazonaws.com:30003
var peers = hfc.getConfigSetting('peers');
///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// SET CONFIGURATIONS ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
app.options('*', cors());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: false
}));
app.use(function(req, res, next) {
	logger.info(' ##### New request for URL %s',req.originalUrl);
	return next();
});

//wrapper to handle errors thrown by async functions. We can catch all
//errors thrown by async functions in a single place, here in this function,
//rather than having a try-catch in every function below. The 'next' statement
//used here will invoke the error handler function - see the end of this script
const awaitHandler = (fn) => {
	return async (req, res, next) => {
		try {
			await fn(req, res, next)
		} 
		catch (err) {
			next(err)
		}
	}
}


app.get('/api-docs.json', (req, res) => {
	res.setHeader('Content-Type', 'application/json');
	res.send(swaggerSpec);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START SERVER /////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
var server = http.createServer(app).listen(port, function() {});
logger.info('****************** SERVER STARTED ************************');
logger.info('***************  Listening on: http://%s:%s  ******************',host,port);
server.timeout = 240000;

function getErrorMessage(field) {
	var response = {
		success: false,
		message: field + ' field is missing or Invalid in the request'
	};
	return response;
}

///////////////////////////////////////////////////////////////////////////////
//////////////////////////////// START WEBSOCKET SERVER ///////////////////////
///////////////////////////////////////////////////////////////////////////////
const wss = new WebSocketServer.Server({ server });
wss.on('connection', function connection(ws) {
	logger.info('****************** WEBSOCKET SERVER - received connection ************************');
	ws.on('message', function incoming(message) {
		console.log('##### Websocket Server received message: %s', message);
	});

	ws.send('something');
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
// Health check - can be called by load balancer to check health of REST API
app.get('/health', awaitHandler(async (req, res) => {
	res.sendStatus(200);
}));
///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS START HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////
//
//
// POST addContent by mCreator
//
 /**
 * @swagger
 *
 * /content:
 *   post:
 *     summary: register Content on mtbue
 *     tags:
 *       - Creator
 *     description: register Content
 *     parameters:
 *     - name: X-username
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     - name: X-orgName
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uniqID:
 *                 type: string
 *               ownerID:
 *                 type: string
 *               infos:
 *                 type: string
 *               regDate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Execution result
 */
app.post('/content', awaitHandler(async (req, res) => {
	logger.info('================ POST on content (add content)');
	var args = req.body;
	var fcn = "registerContent";

	let username = req.header("X-username");
	let orgName = req.header("X-orgName");

    logger.info('##### POST on addContent - username : ' + username);
	logger.info('##### POST on addContent - userOrg : ' + orgName);
	logger.info('##### POST on addContent - channelName : ' + channelName);
	logger.info('##### POST on addContent - chaincodeName : ' + chaincodeName);
	logger.info('##### POST on addContent - fcn : ' + fcn);
	logger.info('##### POST on addContent - args : ' + JSON.stringify(args));
	logger.info('##### POST on addContent - peers : ' + peers);
	

	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, args, fcn, username, orgName);
	logger.info('================ POST on content: ' + message.toString());
	res.send(message);

}));

// 
//get query
// querycontent
/**
 * @swagger
 *
 * /content/{uniqID}:
 *   get:
 *     summary: queryContent
 *     tags:
 *       - Creator
 *     parameters:
 *     - name: X-username
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     - name: X-orgName
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     - name: uniqID
 *       in: path
 *       required: true
 *       description: Get a specific Content by uniqID
 *       schema:
 *         type: string
 *     responses:
 *       200:
 *         description: Execution result
 */

app.get('/content/:uniqID', awaitHandler(async (req, res) => {
	//app.get('querycontent', awaitHandler(async (req, res) => {
		logger.info('================ GET on content by uniqID ');
		logger.info('uniqID : ' + req.params.uniqID);
		//let args = [];
		let args = req.params.uniqID;
		
		let fcn = "queryContent";
		let username = req.header("X-username");
		let orgName = req.header("X-orgName");
		logger.info('=====' + args);

		//??
		let response = await connection.getRegisteredUser(username, orgName, true);


		logger.info('##### End point : /queryContent');
		logger.info('##### POST on addContent - username : ' + username);
		logger.info('##### POST on addContent - userOrg : ' + orgName);
		logger.info('##### POST on addContent - channelName : ' + channelName);
		logger.info('##### POST on addContent - chaincodeName : ' + chaincodeName);
		logger.info('##### POST on addContent - fcn : ' + fcn);
		logger.info('##### POST on addContent - args : ' + args);
		logger.info('##### POST on addContent - peers : ' + peers);
	
		let message = await query.queryChaincode(peers, channelName, chaincodeName, args, fcn, username, orgName);
		res.send(message);
	}));

//
//
// POST production by mDistrituber
//
//
 /**
 * @swagger
 *
 * /production:
 *   post:
 *     summary:  production ready
 *     tags:
 *       - Distributor
 *     description:  production.
 *     parameters:
 *     - name: X-username
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     - name: X-orgName
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uniqID:
 *                 type: string
 *               prodDate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Execution result
 */
app.post('/production', awaitHandler(async (req, res) => {
	logger.info('================ POST on production');
	var args = req.body;
	var fcn = "production";

	let username = req.header("X-username");
	let orgName = req.header("X-orgName");

    logger.info('##### POST on production - username : ' + username);
	logger.info('##### POST on production - userOrg : ' + orgName);
	logger.info('##### POST on production - channelName : ' + channelName);
	logger.info('##### POST on production - chaincodeName : ' + chaincodeName);
	logger.info('##### POST on production - fcn : ' + fcn);
	logger.info('##### POST on production - args : ' + JSON.stringify(args));
	logger.info('##### POST on production - peers : ' + peers);
	

	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, args, fcn, username, orgName);
	logger.info(message.toString());
	res.send(message);

}));

//
//
// POST request to use by mSeller
//
//
 /**
 * @swagger
 *
 * /use:
 *   post:
 *     summary: request  use 
 *     tags:
 *       - Seller
 *     description: Add  use.
 *     parameters:
 *     - name: X-username
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     - name: X-orgName
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uniqID:
 *                 type: string
 *               sellerID:
 *                 type: string
 *               useDate:
 *                 type: string
 *     responses:
 *       200:
 *         description: Execution result
 */
app.post('/use', awaitHandler(async (req, res) => {
	logger.info('================ POST on use (reqeust to use)');
	var args = req.body;
	var fcn = "use";

	let username = req.header("X-username");
	let orgName = req.header("X-orgName");

    logger.info('##### POST on addContent - username : ' + username);
	logger.info('##### POST on addContent - userOrg : ' + orgName);
	logger.info('##### POST on addContent - channelName : ' + channelName);
	logger.info('##### POST on addContent - chaincodeName : ' + chaincodeName);
	logger.info('##### POST on addContent - fcn : ' + fcn);
	logger.info('##### POST on addContent - args : ' + JSON.stringify(args));
	logger.info('##### POST on addContent - peers : ' + peers);
	

	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, args, fcn, username, orgName);
	res.send(message);

}));


//
//
// POST request to allow by mDistributor
//
//
 /**
 * @swagger
 *
 * /allow:
 *   post:
 *     summary: add allow 
 *     tags:
 *       - Distributor
 *     description: Add allow.
 *     parameters:
 *     - name: X-username
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     - name: X-orgName
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uniqID:
 *                 type: string
 *               startDate:
 *                 type: string
 *               expired:
 *                 type: string
 *               by:
 *                 type: string
 *     responses:
 *       200:
 *         description: Execution result
 */
app.post('/allow', awaitHandler(async (req, res) => {
	logger.info('================ POST on use (reqeust to use)');
	var args = req.body;
	var fcn = "allow";

	let username = req.header("X-username");
	let orgName = req.header("X-orgName");

    logger.info('##### POST on addContent - username : ' + username);
	logger.info('##### POST on addContent - userOrg : ' + orgName);
	logger.info('##### POST on addContent - channelName : ' + channelName);
	logger.info('##### POST on addContent - chaincodeName : ' + chaincodeName);
	logger.info('##### POST on addContent - fcn : ' + fcn);
	logger.info('##### POST on addContent - args : ' + JSON.stringify(args));
	logger.info('##### POST on addContent - peers : ' + peers);
	

	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, args, fcn, username, orgName);
	res.send(message);

}));


//
//
// POST request to count by mDistributor
//
//
 /**
 * @swagger
 *
 * /count:
 *   post:
 *     summary: add count 
 *     tags:
 *       - Seller
 *     description: Add count.
 *     parameters:
 *     - name: X-username
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     - name: X-orgName
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uniqID:
 *                 type: string
 *               date:
 *                 type: string
 *               selllerID:
 *                 type: string

 *     responses:
 *       200:
 *         description: Execution result
 */
app.post('/count', awaitHandler(async (req, res) => {
	logger.info('================ POST on count (count)');
	var args = req.body;
	var fcn = "count";

	let username = req.header("X-username");
	let orgName = req.header("X-orgName");

    logger.info('##### POST on addContent - username : ' + username);
	logger.info('##### POST on addContent - userOrg : ' + orgName);
	logger.info('##### POST on addContent - channelName : ' + channelName);
	logger.info('##### POST on addContent - chaincodeName : ' + chaincodeName);
	logger.info('##### POST on addContent - fcn : ' + fcn);
	logger.info('##### POST on addContent - args : ' + JSON.stringify(args));
	logger.info('##### POST on addContent - peers : ' + peers);
	

	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, args, fcn, username, orgName);
	res.send(message);

}));

//
//
// POST request to check by mDistributor
//
//
 /**
 * @swagger
 *
 * /check:
 *   post:
 *     summary: add check 
 *     tags:
 *       - Distributor
 *     description: Add check.
 *     parameters:
 *     - name: X-username
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     - name: X-orgName
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uniqID:
 *                 type: string
 *               distID:
 *                 type: string
 *     responses:
 *       200:
 *         description: Execution result
 */
app.post('/check', awaitHandler(async (req, res) => {
	logger.info('================ POST on check (check)');
	var args = req.body;
	var fcn = "check";

	let username = req.header("X-username");
	let orgName = req.header("X-orgName");

    logger.info('##### POST on addContent - username : ' + username);
	logger.info('##### POST on addContent - userOrg : ' + orgName);
	logger.info('##### POST on addContent - channelName : ' + channelName);
	logger.info('##### POST on addContent - chaincodeName : ' + chaincodeName);
	logger.info('##### POST on addContent - fcn : ' + fcn);
	logger.info('##### POST on addContent - args : ' + JSON.stringify(args));
	logger.info('##### POST on addContent - peers : ' + peers);
	

	let message = await invoke.invokeChaincode(peers, channelName, chaincodeName, args, fcn, username, orgName);
	res.send(message);

}));


///////////////////////////////////////////////////////////////////////////////
///////////////////////// REST ENDPOINTS END HERE ///////////////////////////
///////////////////////////////////////////////////////////////////////////////


/**
 * @swagger
 *
 * /users:
 *   post:
 *     summary: Register and enroll user.
 *     tags:
 *       - UserRegister
 *     description: A user must be registered and enrolled before any queries or transactions can be invoked
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               orgName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Execution result
 */
app.post('/users', awaitHandler(async (req, res) => {
	logger.info('================ POST on Users');
	let username = req.body.username;
	let orgName = req.body.orgName;
	logger.info('##### End point : /users');
	logger.info('##### POST on Users - username : ' + username);
	logger.info('##### POST on Users - userorg  : ' + orgName);
	let response = await connection.getRegisteredUser(username, orgName, true);
	logger.info('##### POST on Users - returned from registering the username %s for organization %s', username, orgName);
	logger.info('##### POST on Users - getRegisteredUser response secret %s', response.secret);
	logger.info('##### POST on Users - getRegisteredUser response secret %s', response.message);
    if (response && typeof response !== 'string') {
        logger.info('##### POST on Users - Successfully registered the username %s for organization %s', username, orgName);
		logger.info('##### POST on Users - getRegisteredUser response %s', response);
		// Now that we have a username & org, we can start the block listener
		await blockListener.startBlockListener(channelName, username, orgName, wss);
		res.json(response);
	} else {
		logger.error('##### POST on Users - Failed to register the username %s for organization %s with::%s', username, orgName, response);
		res.json({success: false, message: response});
	}
}));


app.get('/health', awaitHandler(async (req, res) => {
	res.sendStatus(200);
}));

/************************************************************************************
 * Error handler
 ************************************************************************************/
app.use(function(error, req, res, next) {
	res.status(500).json({ error: error.toString() });
});
