var b = document.body;
var c = document.getElementsByTagName('canvas')[0];
var a = c.getContext('2d');
document.body.clientWidth; // fix bug in webkit: http://qfox.nl/weblog/218

var d = document.getElementById('debug');

var robotList = [];
var foodList = [];

var fieldSize = 600;
var foodTime = 10; // bigger is less food

var numRobots = 4;
var deathCount = 0;
var evolutionVariance = 0.1;

c.width = c.height = fieldSize;
c.style.width = c.style.height = fieldSize + "px";
c.style.border = "1px solid black";

var startDate = new Date();
var endDate;

var nextId = 0;

/****************************************
Robot
****************************************/
function Robot(x, y){
	this.id = ++nextId;
	
	this.x = x;
	this.y = y;
	
	this.radius = 10.0;
	this.speed = 3.0;
	this.angle = 0.0;
	this.targetAngle = 0.0;
	this.turnRate = 10.0;
	
	// higher is less fertile
	this.fertility = 500;
	
	this.mx = 0;
	this.my = 0;
	
	this.score = 10;
	this.maxScore = 20;
	this.hungerTimer = 100;
	this.hunger = 0;
	this.color = "rgb(0,0,125)";
}

Robot.prototype.evolve = function(parent){
	this.radius = (Math.random() * (parent.radius * evolutionVariance * 2) - (parent.radius * evolutionVariance)) + parent.radius;
	this.speed = (Math.random() * (parent.speed * evolutionVariance * 2) - (parent.speed * evolutionVariance)) + parent.speed;
	this.turnRate = (Math.random() * (parent.turnRate * evolutionVariance * 2) - (parent.turnRate * evolutionVariance)) + parent.turnRate;
	this.fertility = (Math.random() * (parent.fertility * evolutionVariance * 2) - (parent.fertility * evolutionVariance)) + parent.fertility;
	this.hungerTimer = (Math.random() * (parent.hungerTimer * evolutionVariance * 2) - (parent.hungerTimer * evolutionVariance)) + parent.hungerTimer;
}

Robot.prototype.eat = function(){
	this.score++;
}

Robot.prototype.tick = function(){
	// Handle appetite
	this.hunger++;
	if(this.hunger >= this.hungerTimer){
		this.hunger = 0;
		this.score--;
	}
	
	// Head towards food
	var maxFood = this.getClosestFood();
	if(maxFood != undefined && this.score < this.maxScore){
		this.targetAngle = 
			180 - Math.atan2(
				maxFood.x - this.x,
				maxFood.y - this.y
			) * (180.0 / Math.PI);
	}
	else{
		if(this.angle == this.targetAngle && Math.floor(Math.random()*10) == 1 ){
			this.targetAngle = this.targetAngle + (Math.random() * 180 - 90);
		}
	}
	
	// Keep the angle between 0 and 360
	while(this.angle >= 360) this.angle -= 360;
	while(this.angle < 0) this.angle += 360;
	while(this.targetAngle >= 360) this.targetAngle -= 360;
	while(this.targetAngle < 0) this.targetAngle += 360;
	
	// Now, turn!
	var diff = Math.abs(this.angle - this.targetAngle);
	
	if(
		this.angle - this.targetAngle > 180
		|| (
			this.angle - this.targetAngle < 0
			&& 360 + this.angle - this.targetAngle > 180
		)
	){
		if(diff < this.turnRate)
			this.angle += diff;
		else
			this.angle += this.turnRate;
	}
	else if(this.angle != this.targetAngle){
		if(diff < this.turnRate)
			this.angle -= diff;
		else
			this.angle -= this.turnRate;
	}
	
	// Keep the angle between 0 and 360
	while(this.angle >= 360) this.angle -= 360;
	while(this.angle < 0) this.angle += 360;
	while(this.targetAngle >= 360) this.targetAngle -= 360;
	while(this.targetAngle < 0) this.targetAngle += 360;
	
	// Move the robot
	this.mx = (this.speed) * Math.sin(this.angle * (Math.PI/180));
	this.my = (this.speed) * Math.cos(this.angle * (Math.PI/180));
	this.x += this.mx;
	this.y -= this.my;
	
	// Keep robot in bounds
	if(this.x >= c.width-this.radius) this.x = c.width-this.radius;
	if(this.y >= c.height-this.radius) this.y = c.height-this.radius;
	if(this.x <= this.radius) this.x = this.radius;
	if(this.y <= this.radius) this.y = this.radius;
	
	var blue = Math.floor(250*(this.score/this.maxScore));
	if(blue > 250)
		blue = 250;
	var red = Math.floor(250 - blue);
	if(red < 0)
		red = 0;
	this.color = "rgb("+red+",0,"+blue+")";
}

Robot.prototype.getClosestFood = function(){
	var maxSmell = curSmell = 0;
	var maxFood;
	for(var i in foodList){
		curSmell = foodList[i].getSmell(this.x, this.y);
		if(curSmell > maxSmell){
			maxSmell = curSmell;
			maxFood = foodList[i];
		}
	}
	
	return maxFood;
}

Robot.prototype.render = function(){
	a.beginPath();
	a.fillStyle = this.color;
	a.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
	a.fill();
	
	a.beginPath();
	a.strokeStyle = "rgb(0,200,0)";	
	a.lineWidth = 3;
	a.moveTo(this.x,this.y);
	
	var x2 = this.x + this.radius * Math.cos((this.angle-90) * (Math.PI / 180.0))
	var y2 = this.y + this.radius * Math.sin((this.angle-90) * (Math.PI / 180.0))
	
	a.lineTo(x2, y2);
	a.stroke();
}


/****************************************
* Food
****************************************/
function Food(x, y){
	this.x = x;
	this.y = y;
	
	this.smell = 150;
	this.radius = 5;
}

Food.prototype.getSmell = function(mx, my){
	var curSmell = this.smell;

	var distance =
			Math.sqrt(Math.pow(Math.abs(this.x - mx), 2.0)
			+ Math.pow(Math.abs(this.y - my), 2.0));

	curSmell -= distance;
	
	if(curSmell < 0.0)
		curSmell = 0.0;
	
	return curSmell;
}

Food.prototype.render = function(){
	a.beginPath();
	a.fillStyle = "rgb(0,150,0)";
	a.arc(this.x, this.y, this.radius, 0, 2*Math.PI, false);
	a.fill();
}


/****************************************
* Main
****************************************/
function intersecting(a, b){
	var distance = Math.sqrt((b.x - a.x)*(b.x - a.x) + (b.y - a.y)*(b.y - a.y));
	if(distance < (a.radius + b.radius))
		return true;
	
	return false;
}

function runtimeString(){
	endDate = new Date();
	var runtime = endDate.getTime() - startDate.getTime();
	
	var seconds = String(Math.floor(runtime/1000) % 60);
	if(seconds.length < 2) seconds = "0" + seconds;
	
	var minutes = String(Math.floor(runtime/(1000*60)) % 60);
	if(minutes.length < 2) minutes = "0" + minutes;
	
	var hours = String(Math.floor(runtime/(1000*60*60)));
	if(hours.length < 2) hours = "0" + hours;
	
	return hours + ":" + minutes + ":" + seconds;
}

function init(){
	for(var i=0; i<numRobots; i++)
		robotList.push(new Robot(Math.random()*(fieldSize-40) + 20, Math.random()*(fieldSize-40) + 20));
}

function tick(){
	if(Math.floor(Math.random()*foodTime) == 1.0){
		foodList.push(new Food(Math.floor(Math.random()*(fieldSize-40) + 20),Math.floor(Math.random()*(fieldSize-40) + 20)));
	}
	
	// Tick food list
	for(var f in foodList){
		for(var r in robotList){
			if(robotList[r].score < robotList[r].maxScore && intersecting(foodList[f], robotList[r]))
			{
				foodList.splice(f, 1);
				robotList[r].eat();
				break;
			}
		}
	}
	
	// Tick robot list
	for(var i in robotList){
		robotList[i].tick();
		
		if(robotList[i].score < 0){
			robotList.splice(i, 1);
			deathCount++;
		}
		else{
			if(robotList[i].score >= robotList[i].maxScore * 0.8 && Math.floor(Math.random()*robotList[i].fertility) == 1){
				var newRobot = new Robot(robotList[i].x, robotList[i].y);
				newRobot.evolve(robotList[i]);
				robotList.push(newRobot);
			}
		}
	}
	
	// Render (this is grouped together and put last to prevent blinking)
	a.clearRect(0, 0, c.width, c.height);
	for(var f in foodList)
		foodList[f].render();
	for(var r in robotList)
		robotList[r].render();
	
	var colored = true;
	
	var debugText = "";
	debugText += "Time: " + runtimeString() + "<br />";
	debugText += "Robots: " + robotList.length + "<br />";
	debugText += "Deaths: " + deathCount + "<br />";
	debugText += "<table><tr><td>#</td><td>Life</td><td>Size</td><td>Speed</td><td>Turn</td><td>Infertility</td><td>Hunger</td></tr>";
	for(var r in robotList){
		debugText += "<tr class='"+colored+"'><td>"+robotList[r].id+"</td><td>"+robotList[r].score+"</td><td>"+(Math.round( robotList[r].radius * 10 ) / 10)+"</td><td>"+(Math.round( robotList[r].speed * 10 ) / 10)+"</td><td>"+(Math.round( robotList[r].turnRate * 10 ) / 10)+"</td><td>"+(Math.round( robotList[r].fertility * 10 ) / 10)+"</td><td>"+(Math.round( robotList[r].hungerTimer * 10 ) / 10)+"</td></tr>";
		colored = !colored;
	}
	debugText += "</table>";
	d.innerHTML = debugText;
}

// Main
init();
window.setInterval( function(){
	tick();
}, 20);
