var express = require("express");
var multer = require('multer');
var app = express();
var upload = multer({ dest: './st_files/'});
var spawn = require('child_process').spawn;
var openplc = spawn('./core/openplc');

var plcRunning = true;
var compilationOutput = '';
var compilationEnded = false;
var compilationSuccess = false;

app.use(multer({ dest: './st_files/',
    rename: function (fieldname, filename) 
    {
		return filename;
    },
	onFileUploadStart: function (file) 
	{
		console.log(file.originalname + ' is starting ...');
	},
	onFileUploadComplete: function (file) 
	{
		console.log(file.fieldname + ' uploaded to  ' + file.path);
		console.log('finishing old program...');
		openplc.kill('SIGTERM');
		plcRunning = false;
		compilationOutput = '';
		compilationEnded = false;
		compilationSuccess = false;
		compileProgram(file.originalname);
	}
}));

app.get('/',function(req,res)
{
	showMainPage(req,res);
});

app.get('/run',function(req,res)
{
	if (plcRunning == false)
	{
		console.log('Starting OpenPLC Software...');
		openplc = spawn('./core/openplc');
		plcRunning = true;
	}
	
	var htmlString = '\
	<!DOCTYPE html>\
	<html>\
		<header>\
			<meta http-equiv="refresh" content="0; url=/" />\
		</header>\
	</html>';
	
	res.send(htmlString);
});

app.get('/stop',function(req,res)
{
	if (plcRunning == true)
	{
		console.log('Stopping OpenPLC Software...');
		openplc.kill('SIGTERM');
		plcRunning = false;
	}
	
	var htmlString = '\
	<!DOCTYPE html>\
	<html>\
		<header>\
			<meta http-equiv="refresh" content="0; url=/" />\
		</header>\
	</html>';
	
	res.send(htmlString);
});

app.post('/api/upload',function(req,res)
{
    upload(req,res,function(err) 
    {
        if(err) 
        {
            return res.end("Error uploading file.");
        }
		
        var htmlString = '\
		<!DOCTYPE html>\
		<html>\
			<header>\
				<meta http-equiv="refresh" content="0; url=/uploadStatus" />\
			</header>\
		</html>';
		
		res.send(htmlString);
    });
});

app.listen(8080,function()
{
    console.log("Working on port 8080");
});

app.get('/uploadStatus',function(req,res)
{
	var htmlString = '\
	<!DOCTYPE html>\
	<html>\
		<header>';
			if (!compilationEnded)
			{
				htmlString += '<meta http-equiv="refresh" content="3">';
			}
			htmlString += '\
			<meta name="viewport" content="width=device-width, user-scalable=no">\
			<style>\
				input[type=text] {border:0px; border-bottom:1px solid black; width:100%}\
				button[type=button] \
				{\
					padding:10px; \
					background-color:#4369DB; \
					border-radius:10px; \
					border-style:double; \
					color:white;\
					font-size:large;\
					margin: 5 auto;\
					width: 150px;\
				} \
			</style>\
		</header>\
		\
		<body>\
			<p align="center" style="font-family:verdana; font-size:60px; margin-top: 0px; margin-bottom: 10px">OpenPLC Server</p>\
			<p align="center" style="font-family:verdana; font-size:25px; margin-top: 0px; margin-bottom: 10px"><br>';
			if (compilationEnded)
			{
				if (compilationSuccess)
				{
					htmlString += 'Program compiled without errors!</p>';
				}
				else
				{
					htmlString += 'Error compiling program. Please check console log.</p>';
				}
			}
			else
			{
				htmlString += 'Uploading program...</p>';
			}
			htmlString += '\
			<div style="text-align:left; font-family:verdana; font-size:16px"> \
				<p>';
					htmlString += compilationOutput;
					htmlString += '\
				</p>\
			</div>\
		</body>\
	</html>';
	
	htmlString = htmlString.replace(/(?:\r\n|\r|\n)/g, '<br />');
	res.send(htmlString);
});

function showMainPage(req,res)
{
	var htmlString = '\
	<!DOCTYPE html>\
	<html>\
		<header>\
			<meta name="viewport" content="width=device-width, user-scalable=no">\
			<style>\
				input[type=text] {border:0px; border-bottom:1px solid black; width:100%}\
				button[type=button] \
				{\
					padding:10px; \
					background-color:#4369DB; \
					border-radius:10px; \
					border-style:double; \
					color:white;\
					font-size:large;\
					margin: 5 auto;\
					width: 150px;\
				} \
			</style>\
		</header>\
		\
		<body>\
			<p align="center" style="font-family:verdana; font-size:60px; margin-top: 0px; margin-bottom: 10px">OpenPLC Server</p>';
			if (plcRunning == true)
			{
				htmlString += '<p align="center" style="font-family:verdana; font-size:25px; margin-top: 0px; margin-bottom: 10px"><br>Current PLC Status: <font color = "green">Running</font></p>';
			}
			else
			{
				htmlString += '<p align="center" style="font-family:verdana; font-size:25px; margin-top: 0px; margin-bottom: 10px"><br>Current PLC Status: <font color = "red">Stopped</font></p>';
			}
			htmlString += '\
			<br>\
			<div style="text-align:center">  \
				<button type="button" onclick="location.href=\'run\';">Run</button>\
				<button type="button" style="background-color:crimson" onclick="location.href=\'stop\';">Stop</button>\
			</div> \
			<br><br><br>\
			<p align="center" style="font-family:verdana; font-size:25px; margin-top: 0px; margin-bottom: 10px">Change PLC Program</p>\
			<div style="text-align:center">  \
				<form id        =  "uploadForm"\
					enctype   =  "multipart/form-data"\
					action    =  "/api/upload"\
					method    =  "post">\
					<br>\
					<input type="file" name="file" id="file" class="inputfile" accept=".st">\
					<input type="submit" value="Upload Program" name="submit">\
				</form>\
			</div> \
		</body>\
	</html>';
	
	res.send(htmlString);
}

function compileProgram(fileName)
{
	console.log('compiling new program...');
	compilationOutput += 'compiling new program...\r\n';
	var compiler = spawn('./iec2c', ['./st_files/' + fileName]);
	
	compiler.stdout.on('data', function(data)
	{
		console.log('' + data);
		compilationOutput += data;
		compilationOutput += '\r\n';
	});
	compiler.stderr.on('data', function(data)
	{
		console.log('' + data);
		compilationOutput += data;
		compilationOutput += '\r\n';
	});
	compiler.on('close', function(code)
	{
		if (code != 0)
		{
			console.log('Error compiling program. Please check console log');
			compilationOutput += 'Error compiling program. Please check console log\r\n';
			compilationEnded = true;
		}
		else
		{
			console.log('Program compiled successfully');
			compilationOutput += 'Program compiled successfully\r\n';
			moveFiles();
		}
	});
}

function moveFiles()
{
	console.log('moving files...');
	compilationOutput += 'moving files...\r\n';
	var copier = spawn('mv', ['-f', 'POUS.c', 'POUS.h', 'LOCATED_VARIABLES.h', 'VARIABLES.csv', 'Config0.c', 'Config0.h', 'Res0.c', './core/']);
	copier.on('close', function(code)
	{
		if (code != 0)
		{
			console.log('error moving files');
			compilationOutput += 'error moving files\r\n';
			compilationEnded = true;
		}
		else
		{
			compileOpenPLC();
		}
	});
}

function compileOpenPLC()
{
	console.log('compiling OpenPLC...');
	compilationOutput += 'compiling OpenPLC...\r\n';
	
	var exec_script = spawn('bash', ['./build_core.sh']);
	
	exec_script.stdout.on('data', function(data)
	{
		console.log('' + data);
		compilationOutput += data;
	});
	exec_script.stderr.on('data', function(data)
	{
		console.log('' + data);
		compilationOutput += data;
	});
	exec_script.on('close', function(code)
	{
		if (code != 0)
		{
			console.log('exec error: ' + error);
			compilationOutput += 'exec error: ' + error + '\r\n';
			console.log('error compiling OpenPLC. Please check your program');
			compilationOutput += 'error compiling OpenPLC. Please check your program\r\n';
		}
		else
		{
			console.log('compiled without errors');
			compilationOutput += 'compiled without errors\r\n';
			console.log('Starting OpenPLC Software...');
			openplc = spawn('./core/openplc');
			plcRunning = true;
			compilationSuccess = true;
		}
		
		compilationEnded = true;
	});
}