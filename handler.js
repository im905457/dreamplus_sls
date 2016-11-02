'use strict';
var mysql = require('mysql');
var doc = require('dynamodb-doc');
var dynamo = new doc.DynamoDB();
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('./config.json').toString());

var connection = mysql.createConnection({
	host: config.host,
	user: config.user,
	password: config.password,
	database: config.database,
	acquireTimeout: config.acquireTimeout,
	charset: config.charset
});
//connection.connect();

function display_json(object) {
	return JSON.stringify(object, null, 2)
}

function verify_token(token) {
	//確認TOKEN是否有效(是否登入)
	var response = false;
	var sql = 'SELECT * FROM dreamplus_story where pid=' + connection.escape(pid);
	const resp = (err, rows, fields) => {
		if(err){
			response = false;
		}else{
			if(rows.length > 0){
				response = true;
			}
		}
		cb(response);
	}
	connection.query(sql, resp);
}

function check_user(p_uid) {
	//確認user是否存在
	var response = false;
	var sql = 'SELECT * FROM dreamplus_story where pid=' + connection.escape(pid);
	const resp = (err, rows, fields) => {
		if(err){
			response = false;
		}else{
			if(rows.length > 0){
				response = true;
			}
		}
		cb(response);
	}
	connection.query(sql, resp);
}

function check_log(p_uid) {
	//確認LOG是否存在
	var response = false;
	var sql = 'SELECT * FROM dreamplus_story where pid=' + connection.escape(pid);
	const resp = (err, rows, fields) => {
		if(err){
			response = false;
		}else{
			if(rows.length > 0){
				response = true;
			}
		}
		cb(response);
	}
	connection.query(sql, resp);
}

function get_content(pid, cb) {
	//取得募資專案詳細內容@RDS
	var sql = "select a.*, IFNULL(sum(b.num),0) as num, IFNULL(sum(b.amount),0) as sum from dreamplus_list a left join dreamplus_status b on a.pid=b.pid group by pid";
	var response = [];
	var obj = {};
	
	if(pid > 0){
		sql = "select x.*, y.* from dreamplus_list x join (SELECT a.*, IFNULL(sum(b.num),0) as num, IFNULL(sum(b.amount),0) as sum FROM dreamplus_options a left join dreamplus_status b on a.pid=b.pid and a.oid=b.oid group by pid, oid) y on x.pid=y.pid where x.type='0' and x.pid=" + connection.escape(pid);
	}
	//console.log(sql);
	const resp = (err, rows, fields) => {
		if(err){
			response = {
				status: 401,
				message: "status:fail, Connection Error"
			}
			console.log(err);
		}else{
			if(rows.length>0){
				response = {
					status: 200
				}
				if(pid > 0){
					obj['options'] = {};
					for (var i = 0; i < rows.length; i++) {
						//console.log(rows[i].project_name+' , '+rows[i].content);
						obj.project_code = rows[i].project_code;
						obj.project_name = rows[i].project_name;
						obj['type'] = rows[i].type;
						obj['category'] = rows[i].category;
						obj['amount'] = rows[i].total_amount;
						obj['s_institution'] = rows[i].s_institution;
						obj['l_institution'] = rows[i].l_institution;
						obj['start_time'] = rows[i].start_time;
						obj['end_time'] = rows[i].end_time;
						obj['description'] = rows[i].description;
						obj['cover_img'] = rows[i].cover_img;
						obj['video_url'] = rows[i].video_url;
						obj['relate_url'] = rows[i].relate_url;
						obj['v_link'] = rows[i].v_link;
						obj['s_link'] = rows[i].s_link;
						obj['options'][rows[i].oid] = ({ oid:rows[i].oid, content:rows[i].content, set:rows[i].set, amount:rows[i].amount, payment:rows[i].payment, num:rows[i].num, sum:rows[i].sum })
					}
					response['message'] = obj;
				}else{
					response['message'] = rows;
				}
			}else{
				response = {
					status: 400,
					message: "status:fail, Emtpy Record"
				}
				console.log('empty record');
			}
		}
		cb(response);
	}
	connection.query(sql, resp);
}

function get_timeline(pid, cb) {
	//取得專案timeline
	var response = [];
	var sql = "SELECT * FROM dreamplus_story where pid=" + connection.escape(pid);
	const resp = (err, rows, fields) => {
		if(err){
			response = null;
		}else{
			if(rows.length > 0){
				response = rows;
			}else{
				response = null;
			}
		}
		cb(response);
	}
	connection.query(sql, resp);
}

function get_sponsers(pid) {
	//取得專案贊助人名單@dynamoDB
}

function get_messages(pid) {
	//取得專案訊息@dynamoDB
}

// Your first function handler
module.exports.read = (event, context) => {
	const pid = event.path.id;
	
	get_content(pid, function(get_content_response) {  
		get_timeline(pid, function(get_timeline_response) {  
			//console.log(get_content_response.status);
			//console.log(get_timeline_response);
			if(get_timeline_response!=null){
				get_content_response['timeline'] = get_timeline_response;
			}
			context.done(JSON.stringify(get_content_response));
		});
	});
};

module.exports.create = (event, context) => {	
	//const operation = event.method;
	//console.log(event.method);
	//console.log(operation);
	//console.log(event.body);
	//console.log(event.body.keys);
	var response = [];
	const sql = 'insert into dreamplus_log set ?';
	var myDate = new Date();
	var AddDays = 3;
	var addDate = myDate.setDate(myDate.getDate() + AddDays);
	var date_format = new Date(addDate).toISOString().replace('T', ' ').substr(0, 19);
	var insert_data = {
		p_uid: event.body.p_uid,
		pid: event.body.pid,
		psid: event.body.psid,
		amount: event.body.amount,
		donate: event.body.donate,
		pstatus: 0,
		term: date_format,
		time: '0000-00-00 00:00:00',
		basis: event.body.basis,
		addressee: event.body.addressee,
		address: event.body.address,
		codezip: event.body.codezip,
		phone: event.body.phone
	};
	
	const cb = (err, rows) => {
		console.log(insert_data);
		if(err){
			response = {
				status: 401,
				message: "status:fail, Connection Error"
			}
			console.log(err);
			context.fail(JSON.stringify(response));
		}else{
			response = {
				status: 200,
				message: "Success"
			}
			console.log("Success");
			context.done(JSON.stringify(response));
		}
	}
	connection.query(sql, insert_data, cb);
};

module.exports.control = (event, context, response) => {
	console.log('Event: ', display_json(event))
    console.log('Context: ', display_json(context))
	const operation = event.method
    switch (operation) {
        case 'POST':
            var uuid = require('node-uuid');
            var uuid_v1 = uuid.v1();
			console.log(uuid_v1);
			var myDate = new Date();
			var AddDays = 3;
			var addDate = myDate.setDate(myDate.getDate() + AddDays);
			var date_format = new Date(addDate).toISOString().replace('T', ' ').substr(0, 19);
			var tableName = "dreamplus_dynamodb";
			var item = {
				p_uid: uuid_v1,
				amount: event.body.amount,
				donate: event.body.donate,
				basis: event.body.basis,
				term: date_format,
				time: '0000-00-00 00:00:00',
				address: event.body.address
			};
					
			var params = {
				TableName: tableName,
				Item: item
			};
			console.log(params);
			dynamo.putItem(params, function(err, data) {
				if (err) {
					context.fail(new Error('Error: ' + err));
				} else {
					context.done(null, { message: "Create Success" });
				}
			});
            break
		case 'GET':
			if(event.path.id > 0){
				var param = {
					TableName: "dreamplus_dynamodb",
					Key: {
						"p_uid": "e65cae30-99b6-11e6-b1a7-6381556c2a97"
					}
				};
				dynamo.getItem(param, function(err, data) {
					if (err) {
						context.fail(err);
					} else {
						console.log(data);
						context.done(null, data);
					}
				});
			}else{
				dynamo.scan({TableName : "dreamplus_dynamodb"}, function(err, data) {
					if (err) {
						context.fail(err);
					} else {
						//response.writeHead(200, {"Content-Type": "application/json"});
						console.log(data);
						context.done(null, data);
						//response.end(JSON.stringify(data));
					}
				});
			}
			break
		case 'PUT':
			p_uid = event.path.p_uid;
			var param = {
				TableName: "dreamplus_dynamodb",
				Key: {"p_uid": p_uid},
				ExpressionAttributeNames: {'#p': 'pstatus'},
				ExpressionAttributeValues: {':i': 1},
				UpdateExpression: 'SET #p = #p + :i'
			};
			dynamo.updateItem(param, function(err, data) {
				if (err) {
					context.fail(err);
				} else {
					//console.log(data);
					//context.done(null, data);
					context.succeed();
				}
			});
			response.writeHead(200);
			response.end();
			break
        default:
            context.fail(new Error('Unrecognized operation "' + operation + '"'))
    }
};
// You can add more handlers here, and reference them in serverless.yml