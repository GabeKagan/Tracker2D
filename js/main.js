    

//UI constants:
var FILE_SIZE = [30,23]; //This is how many tiles are on the screen right now. It will eventually change.
var TILE_SIZE = 24; //This is more cumbersome early on, but I will eventually need to implement zooming, and this might help
var LEFT_VERTICAL_BAR = [0,0,80,800];
var BOTTOM_HORIZONTAL_BAR = [80,552,720,48];

var fieldContents = new Array(30);
var rows = FILE_SIZE[0];
//Everything is undefined by default.
for(var i = 0; i < rows; ++i) {
    fieldContents[i] = new Array(23);
}




//Use Web Audio API or something to actually play audio.
var testSound = new Audio('Ach.wav');
var bugImage = new Image();
bugImage.src = "images/placeholder_bug.png";

var fieldBoundaries = [80,0,800,552]; //This is the area not covered by the AI; x-coords 80-> 800, y-coords 0->552

//Set up a canvas to draw on.
//All these drawing steps need to be functionalized since they'll get repeated a ton. 
var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

//Kludge. Extend to involve all 'bug' images and then work from there. I guess.
bugImage.onload = function() {
    init();
}

function init() {
    ctx.fillStyle = "#000000";
    //There has to be a better way to handle the names. Apparently apply() in JS might be usable?
    ctx.fillRect(LEFT_VERTICAL_BAR[0],LEFT_VERTICAL_BAR[1],LEFT_VERTICAL_BAR[2],LEFT_VERTICAL_BAR[3]); 
    ctx.fillStyle = "#888888";
    ctx.fillRect(BOTTOM_HORIZONTAL_BAR[0],BOTTOM_HORIZONTAL_BAR[1],BOTTOM_HORIZONTAL_BAR[2],BOTTOM_HORIZONTAL_BAR[3]);
    ctx.fillStyle = "#BBBBBB";

    //Draw boundaries between tiles, vertical first
    for(var i = 80; i < fieldBoundaries[2]; i += 24) {
        ctx.beginPath();
        ctx.moveTo(i,0);
        ctx.lineTo(i,552);
        ctx.stroke();
    }
    for(var i = 0; i < fieldBoundaries[3]; i += 24) {
        ctx.beginPath();
        ctx.moveTo(0,i);
        ctx.lineTo(800,i);
        ctx.stroke();
    }

    //Ach squares.
    fieldContents[1][1] = new Tile("test", undefined, undefined, undefined);
    fieldContents[6][1] = new Tile("test", undefined, undefined, undefined);
    fieldContents[11][1] = new Tile("test", undefined, undefined, undefined);
    fieldContents[16][1] = new Tile("test", undefined, undefined, undefined);
    fieldContents[21][1] = new Tile("test", undefined, undefined, undefined);
    fieldContents[26][1] = new Tile("test", undefined, undefined, undefined);

    for(var i = 0; i < FILE_SIZE[0]; ++i){
        
        for(var j = 0; j < FILE_SIZE[1]; ++j){
            
            if(typeof fieldContents[i][j] === 'object'){
                paintTile(i,j, "#0000FF");
            }   
        }
    }
      
    document.addEventListener("click", interact);

    //Draws a test bug, spawning at tile [0,1] without any behavior.
    var bug1 = new Bug(fieldBoundaries[0] + (TILE_SIZE*0),fieldBoundaries[1] + (TILE_SIZE*1),null);
    console.log(bug1);
    bug1.drawBug();
    //Experimentally moving the bug. Needs an implementation that wipes the screen as needed.
        setInterval(function(){
            var bugTile = [(bug1.x - 80)/24, bug1.y/24];
            if(bug1.x < 800) {
                //console.log(bugTile);
                bug1.x += 24;
                bug1.drawBug();
                //If the bug is on a blue tile, play ach.wav
                if(fieldContents[bugTile[0]][bugTile[1]] != undefined){
                    testSound.play();
                }
            }
        }, 200)

    //}
    //bug1.x += 72;
    //bug1.drawBug();


}

//Move this where it's needed
function paintTile(tileX, tileY, color){
    ctx.fillStyle = color //Pass in #hexadecimal for best results.
    ctx.fillRect(fieldBoundaries[0] + (TILE_SIZE*tileX), 
                 fieldBoundaries[1] + (TILE_SIZE*tileY),
                (TILE_SIZE*1), 
                (TILE_SIZE*1));

}

function interact(e) {
    var cursorX = e.pageX - $('#canvas').offset().left;
    var cursorY = e.pageY - $('#canvas').offset().top;
    console.log("Clicked " + cursorX + ", " + cursorY);
    if(cursorX <= 80 && cursorX > 0) { console.log("LEFT_VERTICAL_BAR"); }
    if(cursorY >= 540 && cursorY <= 600 && cursorX >= 80) { console.log("BOTTOM_HORIZONTAL_BAR"); }
    //If we're inside the playfield, convert to a tile.
    if(cursorX >= 80 && cursorX <= 800 && cursorY >= 0 && cursorY <= 540){
        console.log("In the playfield");
        var currentTile = getTile(cursorX, cursorY);
        console.log(currentTile);
        //if(currentTile[0] == 1 && currentTile[1] == 1) { testSound.play(); } //Debug
    }
}

function getTile(x,y) {
    var tileX = Math.floor((x - 80)/TILE_SIZE);
    var tileY = Math.floor(y/TILE_SIZE);
    return [tileX, tileY];
}

function convertTiletoPixels(x,y){
    var pixelX = (x*24) + 80;
    var pixelY = y*24;
    return [pixelX, pixelY];
}

