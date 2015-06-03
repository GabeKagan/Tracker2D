/*
 * Long term thoughts: At some point in the near future, we might want to add a synchronization feature to help people create more complicated interlocking
 * See this for advice on how to get click and drag: http://simonsarris.com/blog/140-canvas-moving-selectable-shapes
*/

/*
    Medium term useful thing: Extrapolation feature.
*/

var isOverlayShowing = false; //Used to handle some pointer events CSS.
var pauseState = true;
var pasteStyle = 1 //1 is an overwrite paste, 2 is mixpaste.
//singleStep executes a single update and then pauses.
//Labels for all tools that require clicking on the field. Not in use yet.

var toolList = ['pencil', 'line', 'eraser', 'pause', 'selectBox','paste', 'query', 'moveBug','storeBug','turnBug','singleStep','modifyTile']; 
var selectedTool = 'pencil'; //Change as needed, default to pencil.
var saveContent; //A string representing the contents of the map.
var encodedContent; //Stores the base64 equivalent of saveContent. Remove ASAP!
var selectBoxCoords = new Array(4); //Stores two coordinate pairs.
var fieldOffset = [0,0] //Changed via interaction with the minimap, used to decide which part of the field's showing.

var storedBugPositions = new Array(32); //Stores 8 quadruples, representing bug coordinates and commands, and storage status.
var numberOfPropertiesSaved = storedBugPositions.length + AMOUNT_OF_SONG_PROPERTIES; //Simplifies some saveload logic
var renderMinimap = true; //The minimap should not be updated until a file is finished loading.

//See main.js for the UI images, although maybe we should move this to the rendering bloc.
var drawButtons = function() {
    //Pause button with 2 states
    if(pauseState == false) { ctx.drawImage(UIImages[0],PAUSE_PLAY_BUTTON_AREA[0],PAUSE_PLAY_BUTTON_AREA[1]); }
    else if(pauseState == true) { ctx.drawImage(UIImages[1],PAUSE_PLAY_BUTTON_AREA[0],PAUSE_PLAY_BUTTON_AREA[1]); }
    //Most buttons, though, do not change function when clicked.
    ctx.drawImage(UIImages[2],PENCIL_BUTTON_AREA[0],PENCIL_BUTTON_AREA[1]); 
    ctx.drawImage(UIImages[3],ERASER_BUTTON_AREA[0],ERASER_BUTTON_AREA[1]); 
    ctx.drawImage(UIImages[6],SELECTBOX_BUTTON_AREA[0],SELECTBOX_BUTTON_AREA[1]);
    //Actually putting the second menu row to use.
    ctx.drawImage(UIImages[17],HORIFLIP_BUTTON_AREA[0],HORIFLIP_BUTTON_AREA[1]);
    ctx.drawImage(UIImages[18],VERTFLIP_BUTTON_AREA[0],VERTFLIP_BUTTON_AREA[1]);
    //Draw a different paste button based on which type of paste is selected in the options pages.
    if(pasteStyle === 1){
        ctx.drawImage(UIImages[7],PASTE_BUTTON_AREA[0],PASTE_BUTTON_AREA[1]);
    } else if(pasteStyle === 2){ ctx.drawImage(UIImages[16],PASTE_BUTTON_AREA[0],PASTE_BUTTON_AREA[1]); } //Mixpaste.

    ctx.drawImage(UIImages[8],QUERY_BUTTON_AREA[0],QUERY_BUTTON_AREA[1]); 
    ctx.drawImage(UIImages[9],MOVEBUG_BUTTON_AREA[0],MOVEBUG_BUTTON_AREA[1]);     
    ctx.drawImage(UIImages[10],STOREBUG_BUTTON_AREA[0],STOREBUG_BUTTON_AREA[1]); 
    ctx.drawImage(UIImages[11],RESTOREBUG_BUTTON_AREA[0],RESTOREBUG_BUTTON_AREA[1]); 
    ctx.drawImage(UIImages[12],SONGPROPS_BUTTON_AREA[0],SONGPROPS_BUTTON_AREA[1]);
    ctx.drawImage(UIImages[13],EDIT_TILE_BUTTON_AREA[0],EDIT_TILE_BUTTON_AREA[1]); 
    ctx.drawImage(UIImages[14],HELP_BUTTON_AREA[0],HELP_BUTTON_AREA[1]);
    ctx.drawImage(UIImages[15],TURNBUG_BUTTON_AREA[0],TURNBUG_BUTTON_AREA[1]); 

    //Save and load functions
    ctx.drawImage(UIImages[4],SAVE_BUTTON_AREA[0],SAVE_BUTTON_AREA[1]); 
    ctx.drawImage(UIImages[5],LOAD_BUTTON_AREA[0],LOAD_BUTTON_AREA[1]); 
    

}

var TileBuffer = function(fromX, toX, fromY, toY) {
    if(fromX === undefined){ this.fromX = 0; } else { this.fromX = fromX; }
    if(fromX === undefined){ this.fromY = 0; } else { this.fromY = fromY; }
    if(toX === undefined){ this.toX = fieldContents.length; } else { this.toX = toX; }
    if(toY === undefined){ this.toY = fieldContents[0].length; } else { this.toY = toY; }
    this.array = new Array((toX - fromX) + 1);
    for(var i = 0; i < this.array.length; ++i) {
            this.array[i] = new Array((toY - fromY) + 1);
    }

}

TileBuffer.prototype.fillBuffer = function(fromX, toX, fromY, toY, fillCommand) {
    this.fromX = fromX;
    this.fromY = fromY;
    this.toX = toX;
    this.toY = toY;
    //Stores a rectangle of tiles (a subset of the entire field). 
    //When saving, it fills up with the entire field. Otherwise, it probably covers a bit less.
    console.log("Filling the buffer");
    switch(fillCommand) {
        case 'save':
            this.array = fieldContents;
            //console.log(tileBuffer);
            break;
        case 'selectBox':
            //In this case, tileBuffer has to actually be defined.
            this.array = new Array((toX - fromX) + 1);
            for(var i = 0; i < this.array.length; ++i) {
                this.array[i] = new Array((toY - fromY) + 1);
            }
            //Only then can it be populated properly.
            for(var i = 0; i < this.array.length; ++i){
                for(var j = 0; j < this.array[i].length; ++j){
                    this.array[i][j] = fieldContents[fromX + i][fromY + j];
                }
            }
            console.log(this.array);
            break;
        default:
            break;
    }
}

//toX and toY are derived from the size of tileBuffer. TileX and tileY are where the user clicked.
TileBuffer.prototype.pasteBuffer = function(fromX, toX, fromY, toY, tileX, tileY) {
    //This is an overlap paste that replaces all contents.
    //The switch statement isn't as terse as it could be, but it's more readable and extensible in case we actually need more special pastes.
    for(var i = 0; i < defaultBuffer.array.length; ++i){
        for(var j = 0; j < defaultBuffer.array[i].length; ++j){
            //Conditional to prevent accidental writes outside the file, which could get crashy.
            //Horizontal overflows cause errors,  but don't break everything. I still consider this a bug.
            //tileX and tileY store offsets.
            if((i + tileX) < FILE_SIZE[0] || (j + tileY) < FILE_SIZE[1]) {
                switch(pasteStyle){
                    case 1: // Simplistic overwrite paste.
                        fieldContents[(i + tileX)][(j + tileY)] = defaultBuffer.array[i][j];
                        break; 
                    case 2: // More complicated mixpaste that doesn't overwrite occupied tiles with undefined ones.
                        if(fieldContents[(i + tileX)][(j + tileY)] instanceof Tile === false){
                            fieldContents[(i + tileX)][(j + tileY)] = defaultBuffer.array[i][j];
                        } else break;
                        break;
                } 
            }
        }
    }
}

TileBuffer.prototype.transformBuffer = function(transformCommand){
    //Initialize by updating the buffer with our current contents; break if this does nothing.
    defaultBuffer.fillBuffer(selectBoxCoords[0],selectBoxCoords[1],selectBoxCoords[2],selectBoxCoords[3],'selectBox');
    if(defaultBuffer.array === undefined) { 
        console.log("It's empty");
        return;
    } else {
        var transformContents = new Array(defaultBuffer.array.length);
        for(var i = 0; i < transformContents.length; ++i) {
            transformContents[i] = new Array(defaultBuffer.array[i].length);
        }
        //Then transform the array.
        switch(transformCommand){
            case "horizontalFlip":
                for(var i = 0; i < defaultBuffer.array.length; ++i){
                    for(var j = 0; j < defaultBuffer.array[i].length; ++j){
                        transformContents[i][j] = defaultBuffer.array[(defaultBuffer.array.length - i) - 1][j]
                    }
                }
                break;
            //This is bugged.
            case "verticalFlip":
                for(var i = 0; i < defaultBuffer.array.length; ++i){
                    for(var j = 0; j < defaultBuffer.array[i].length; ++j){
                        transformContents[i][j] = defaultBuffer.array[i][(defaultBuffer.array.length - j) - 1]
                    }
                }
                break;
            default:
                break;
        }
        //console.log(transformContents);
        //Then paste it onto the field.
        defaultBuffer.array = transformContents;
        //This should be implicitly an overwrite at the same place we started.
        pasteStyle = 1;
        defaultBuffer.pasteBuffer(this.fromX, this.fromY, this.toX, this.toY, this.fromX, this.fromY);
    }
}

//Prettyprints some data to the queryInfo div, which should only show up when the query tool's selected.
function respondToQuery(X, Y) {
    var queryResponse = "";
    //Starting with the coordinates...
    queryResponse += "<p>Tile Coordinates: " + X + " , " + Y + "</p>";
    if(fieldContents[X][Y] !== undefined) {
        //We iterate through the tile properties.
        if(fieldContents[X][Y].note !== undefined ) { queryResponse += "<p>Pitch: " + Math.floor(fieldContents[X][Y].note * 44100);}
        else { queryResponse += "Does not reference a pitch."; }
        queryResponse += "<p> Instrument: " +  soundSet[fieldContents[X][Y].instrument][0] + "</p>";
        queryResponse += "<p> Audio Effect: " +  fieldContents[X][Y].dspEffect + "</p>";
        queryResponse += "<p> Audio Effect Parameter: " +  fieldContents[X][Y].dspValue + "</p>";        
        queryResponse += "<p> Flow Effect: " +  fieldContents[X][Y].flowEffect + "</p>";
        queryResponse += "<p> Flow Effect Parameter: " +  fieldContents[X][Y].flowValue + "</p>"; //Uncomment when relevant.
        queryResponse += "<p> Volume: " + (fieldContents[X][Y].volume * 100) + "%</p>";
        queryResponse += "<p> Points to this tile: " + fieldContents[X][Y].xPointer + " , " + fieldContents[X][Y].yPointer + "</p>";
    } else queryResponse += "No data in this tile.";
    //If there's a bug here, describe the one on top. This assumes that bugs should be allowed to overlap...
    for(var i = 0; i < bugList.length; ++i){
        //console.log(bugList[i].bugTile[0] + " , " + bugList[i].bugTile[1]);
        //console.log(X + " , " + Y);
        if( (bugList[i].bugTile[0]) === X && 
             bugList[i].bugTile[1] === Y) { 
            queryResponse += "<p>Bug name: " + bugList[i].name + "<p>";
            queryResponse += "<p>Current behavior: " + bugList[i].action + "<p>";
            if(bugList[i].inStorage === true) {
                queryResponse += "<p>This bug is in storage.</p>";
            }
            break;
        }
    }

    //We may want to call the playSound routine on this tile.
    $('#queryInfo').html(queryResponse);
}

//Under constant extension. I think I fixed the pointer saving bug, but send me a message if I didn't.
function saveFile() {
    pauseState = true;
    defaultBuffer.fillBuffer(0, FILE_SIZE[0], 0, FILE_SIZE[1], 'save');
    selectBoxCoords = [0,0,0,0]; //Clear the selection to prevent a pastebug.
    if(defaultBuffer.array === fieldContents) { 
        //console.log("We're ready to save now."); 
    } else { console.log("Something went wrong in saveFile() or fillBuffer(). Real error trapping later."); }
    //Bake everything into a string.
    saveContent = "";
    //console.log(tileBuffer.length);
    //The very first line contains the amount of tiles.
    saveContent += FILE_SIZE[0] + "," + FILE_SIZE[1] + '\n';

    //Dump all tiles to a string. Parses top to bottom before moving left to right.
    for(var i = 0; i < defaultBuffer.array.length; ++i){
        for(var j = 0; j < defaultBuffer.array[i].length; ++j){
            if(defaultBuffer.array[i][j] !== undefined) { 
                saveContent += defaultBuffer.array[i][j].toString();
            } else saveContent += "undefined"; //In the load function, lines with only the word "undefined" on them will not become tiles.
            saveContent += '\n';
        }

    }
    //Dump the bug properties! Extends the file by 32 lines.
    for(var i = 0; i < storedBugPositions.length; ++i) {
        saveContent += storedBugPositions[i] + '\n';
    }

    //Dump song properties next.
    saveContent += TEMPO + '\n' + PLAYFIELD_SIZE + '\n' + author + '\n' + songDescription + '\n' + songTitle;
    //console.log(saveContent);
    var encodeToFile = new Blob([saveContent]); 
    saveAs(encodeToFile, songTitle + ".txt");
    //It will be some time before we can actually get this to a user.
}

function loadFile(evt) {
    pauseState = true;
    renderMinimap = false;
    hideUI();
    //We need to implement error trapping at some point.
    var file = evt.target.files[0];
    //Only parse if valid. For now, this just means if the file is a file at all.
    if(file){
        var reader = new FileReader();
        reader.onload = function(e) { 
            var fileContents = e.target.result;
            saveContent = fileContents;
            //Actual save parsing begins here.
            var loadingWorkArray = saveContent.split("\n");
            var loadDimensions = loadingWorkArray[0].split(",");
            var tileLength = loadDimensions[0]*loadDimensions[1];
            FILE_SIZE = [loadDimensions[0],loadDimensions[1]];
            //Kludge.
            PLAYFIELD_SIZE = loadDimensions[0]/64; 
            resizeFile();

            //1 to (max index - 4) for now
            //Dump the tiles to fieldContents.
            for(var i = 0; i < loadDimensions[0]; ++i){
                for(var j = 0; j < loadDimensions[1]; ++j) {
                    var currentIndex = (j*loadDimensions[1]) + i; //Flow control seems to be right.

                    if(loadingWorkArray[currentIndex + 1] !== "undefined") {
                        var currentTile = loadingWorkArray[currentIndex + 1].split(",");
                        fieldContents[j][i] = new Tile(currentTile[0],currentTile[1],
                                                       currentTile[2],currentTile[3],
                                                       currentTile[4],currentTile[5],
                                                       currentTile[6],undefined,
                                                       currentTile[7],currentTile[8]);

                        //console.log(fieldContents[j][i]);
                    } else if(loadingWorkArray[currentIndex + 1] === "undefined"){
                        fieldContents[j][i] = undefined;
                    }
                }
            }
            //Load bug properties. There's a serious offset here; might need tweaking.
            for(var i = 0; i < (loadingWorkArray.length - tileLength - AMOUNT_OF_SONG_PROPERTIES - 4); i+=4){
                //console.log(loadingWorkArray[i + tileLength + 1]);
                bugList[(i/4)].bugTile[0] = $.parseJSON(loadingWorkArray[i + tileLength + 1]);
                bugList[(i/4)].bugTile[1] = $.parseJSON(loadingWorkArray[i + tileLength + 2]);
                bugList[(i/4)].action = loadingWorkArray[i + tileLength + 3];
                bugList[(i/4)].inStorage = $.parseJSON(loadingWorkArray[i + tileLength + 4]);
                //console.log(bugList[i/4]);
            }
            //Run the obligatory bug checking loop and store the loaded bug positions in the buffer.
            for(var i = 0; i < bugList.length; ++i) {
                checkBug(i);
            }
            storeBugPositions();
            restoreBugPositions(true); //The program will pause when the bugs have been restored to their positions.
            //Song properties are stored at the very end of the file.
            TEMPO = loadingWorkArray[loadingWorkArray.length - 5];
            updateFrequency = TICK_MULTIPLIER/TEMPO; //Important that we derive this value.
            $("#tempoSpinner").value = TEMPO;
            PLAYFIELD_SIZE = loadingWorkArray[loadingWorkArray.length - 4];
            $("#fieldSizeSpinner").value = PLAYFIELD_SIZE*64;
            author = loadingWorkArray[loadingWorkArray.length - 3];
            songDescription = loadingWorkArray[loadingWorkArray.length - 2];
            songTitle = loadingWorkArray[loadingWorkArray.length - 1];
        }

        reader.readAsText(file);
        renderMinimap = true;
    } else {
        alert("File load failed for some reason.");
        renderMinimap = true;
        return;
    }
}

//General UI handling function called whenever the user opens up a UI element through Canvas.
//The timeouts prevent clicks from bleeding through to other elements.
function hideUI(){
    if($("#saveExport").hasClass("currentlyHidden") === false) { 
        setTimeout(function() {$("#saveExport").addClass("currentlyHidden");}, 50);
    }
    if($("#loadExport").hasClass("currentlyHidden") === false) { 
        setTimeout(function() {$("#loadExport").addClass("currentlyHidden");}, 50);
    }
    if($("#modifySongProperties").hasClass("currentlyHidden") === false) { 
        setTimeout(function() {$("#modifySongProperties").addClass("currentlyHidden");}, 50);
    }
    if($("#modifyTile").hasClass("currentlyHidden") === false) { 
        setTimeout(function() {$("#modifyTile").addClass("currentlyHidden");}, 50);
    }
    if($("#helpPage").hasClass("currentlyHidden") === false) { 
        setTimeout(function() {$("#helpPage").addClass("currentlyHidden");}, 50);
    }
    if($("#queryInfo").hasClass("currentlyHidden") === false) { 
        setTimeout(function() {$("#queryInfo").addClass("currentlyHidden");}, 50);
    } 
}

//checkBug and getBug need to be merged properly.
//This one just checks the status of the bug without altering it.
function checkBug(bugVal){
    var getBugHTML = "";
    if(bugList[bugVal].inStorage === false && bugList[bugVal] !== undefined) { 
        switch(bugVal) {
            case 0:
                $('#bugStorageUnit1').html('<button type="button" onclick="getBug(0)">1</button>');
                break;
            case 1:
                $('#bugStorageUnit2').html('<button type="button" onclick="getBug(1)">2</button>');
                break;
            case 2:
                $('#bugStorageUnit3').html('<button type="button" onclick="getBug(2)">3</button>');
                break;
            case 3:
                $('#bugStorageUnit4').html('<button type="button" onclick="getBug(3)">4</button>');
                break;            
            case 4:
                $('#bugStorageUnit5').html('<button type="button" onclick="getBug(4)">5</button>');
                break;
            case 5:
                $('#bugStorageUnit6').html('<button type="button" onclick="getBug(5)">6</button>');
                break;            
            case 6:
                $('#bugStorageUnit7').html('<button type="button" onclick="getBug(6)">7</button>');
                break;            
            case 7:
                $('#bugStorageUnit8').html('<button type="button" onclick="getBug(7)">8</button>');
                break;
            default:
                break;
        }

    } else if(bugList[bugVal].inStorage === true) {
        getBugHTML = '<button type="button" onclick="getBug(' + bugVal + ')">' + bugList[bugVal].image.outerHTML + '</button>';
        //console.log(getBugHTML);
        switch(bugVal) {
            case 0:
                $('#bugStorageUnit1').html(getBugHTML);
                break;
            case 1:
                $('#bugStorageUnit2').html(getBugHTML);
                break;            
            case 2:
                $('#bugStorageUnit3').html(getBugHTML);
                break;
            case 3:
                $('#bugStorageUnit4').html(getBugHTML);
                break;            
            case 4:
                $('#bugStorageUnit5').html(getBugHTML);
                break;
            case 5:
                $('#bugStorageUnit6').html(getBugHTML);
                break;            
            case 6:
                $('#bugStorageUnit7').html(getBugHTML);
                break;
            case 7:
                $('#bugStorageUnit8').html(getBugHTML);
                break;
            default:
                break;
        }
    }
}

function getBug(bugVal, edit){
    if(edit !== true && edit !== false){ edit = false; } //Error trapping.
    var getBugHTML = '<button type="button" onclick="getBug(' + bugVal + ',true)">' + bugList[bugVal].image.outerHTML + '</button>';
    if(bugList[bugVal].inStorage === false && bugList[bugVal] !== undefined) {
        if(edit === true){
            bugList[bugVal].inStorage = true;
            //getBugHTML = '<button type="button" onclick="getBug(' + bugVal + ',true)">' + bugList[bugVal].image.outerHTML + '</button>';
            //console.log(getBugHTML);
            moveToStorage(bugVal);
        } else if (edit === false) { moveFromStorage(bugVal); }

    } else if(bugList[bugVal].inStorage === true) {
        if(edit === true){
            bugList[bugVal].inStorage = false;
            moveFromStorage(bugVal);
        } else if (edit === false) { moveToStorage(bugVal); } //Something's buggy here.
    }
    //Local functions that should only be called within getBug.
    function moveToStorage(bugVal){
        switch(bugVal) {
            case 0:
                $('#bugStorageUnit1').html(getBugHTML);
                break;
            case 1:
                $('#bugStorageUnit2').html(getBugHTML);
                break;            
            case 2:
                $('#bugStorageUnit3').html(getBugHTML);
                break;
            case 3:
                $('#bugStorageUnit4').html(getBugHTML);
                break;            
            case 4:
                $('#bugStorageUnit5').html(getBugHTML);
                break;
            case 5:
                $('#bugStorageUnit6').html(getBugHTML);
                break;            
            case 6:
                $('#bugStorageUnit7').html(getBugHTML);
                break;
            case 7:
                $('#bugStorageUnit8').html(getBugHTML);
                break;
            default:
                break;
        }
    }
    function moveFromStorage(bugVal){
        switch(bugVal) {
            case 0:
                $('#bugStorageUnit1').html('<button type="button" onclick="getBug(0,true)">1</button>');
                break;
            case 1:
                $('#bugStorageUnit2').html('<button type="button" onclick="getBug(1,true)">2</button>');
                break;
            case 2:
                $('#bugStorageUnit3').html('<button type="button" onclick="getBug(2,true)">3</button>');
                break;
            case 3:
                $('#bugStorageUnit4').html('<button type="button" onclick="getBug(3,true)">4</button>');
                break;            
            case 4:
                $('#bugStorageUnit5').html('<button type="button" onclick="getBug(4,true)">5</button>');
                break;
            case 5:
                $('#bugStorageUnit6').html('<button type="button" onclick="getBug(5,true)">6</button>');
                break;            
            case 6:
                $('#bugStorageUnit7').html('<button type="button" onclick="getBug(6,true)">7</button>');
                break;            
            case 7:
                $('#bugStorageUnit8').html('<button type="button" onclick="getBug(7,true)">8</button>');
                break;
            default:
                break;
        }
    }
}

//Paints the minimap in the upper left corner.
function paintMiniMap(){
    var currentMiniMapPixel;
    var miniMapImage = ctx.createImageData(64, 64); //Constant size, with zoom based on file_size.
    var miniMapContents = new Array(64);
    //Make a separate array with our color data and pixels.

    for(var i = 0; i < 64; ++i){
        miniMapContents[i] = new Array(64);
        for(var j = 0; j < 64; ++j) {
            if(fieldContents[i*PLAYFIELD_SIZE][j*PLAYFIELD_SIZE] !== undefined){
                miniMapContents[i][j] = tinycolor(fieldContents[i*PLAYFIELD_SIZE][j*PLAYFIELD_SIZE].color).toRgb();
            }
        }
    }

    //tinycolor(variable).toRgb();

    //miniMapImage is a one-dimensional array that needs to be mapped to a 2D one, and each pixel takes up 4 values (RGBA)
    //When large fields are implemented, we need to multiply some of these fields by the multipliers.
    for(var i = 0; i < 64; ++i){
        for(var j = 0; j < 64; ++j){
            var miniMapIndex = ((j*64 + i)) * 4; //Multiply or divide by undetermined value
            //Build our image. For now, we use grey pixels, but we'll add color here when it's in the actual field.
            //Maybe we can use transparencies effectively at higher zoom levels.
            if(miniMapContents[i][j] !== undefined) {
                miniMapImage.data[miniMapIndex + 0] = miniMapContents[i][j].r;
                miniMapImage.data[miniMapIndex + 1] = miniMapContents[i][j].g;
                miniMapImage.data[miniMapIndex + 2] = miniMapContents[i][j].b;
                miniMapImage.data[miniMapIndex + 3] = 255; //(255/PLAYFIELD_SIZE) eventually
            } else {
                miniMapImage.data[miniMapIndex + 0] = 255;
                miniMapImage.data[miniMapIndex + 1] = 255;
                miniMapImage.data[miniMapIndex + 2] = 255;
                miniMapImage.data[miniMapIndex + 3] = 255;
            }
        }
    }
    //Paint the image once it's complete.
    ctx.putImageData(miniMapImage, 8, 8);
    //Draw an unfilled rectangle over the player's view.
    //This will make it more apparent that there is a minimap and that the player can use it to look around.
    ctx.beginPath();
    ctx.lineWidth = "1";
    ctx.rect(8 + (fieldOffset[0]/PLAYFIELD_SIZE), 8 + (fieldOffset[1]/PLAYFIELD_SIZE),
            (FIELD_SIZE[0]/PLAYFIELD_SIZE),(FIELD_SIZE[1]/PLAYFIELD_SIZE));
    ctx.stroke(); 
}

//Used for the minimap.
//This should be extended so that the user can scroll by clicking and dragging.
function moveViewingField(X,Y) {
    //Adjust what the user put in to centralize it.
    var adjustedX = (X * PLAYFIELD_SIZE) - Math.floor(FIELD_SIZE[0]/2);
    var adjustedY = (Y * PLAYFIELD_SIZE) - Math.floor(FIELD_SIZE[1]/2);

    //Where the user clicked becomes the leftmost corner of the view.
    //Change this so it goes for the center, instead.
    //If this means part of the view would go offscreen, center as close to the edge as possible.
    if(adjustedX + FIELD_SIZE[0] > FILE_SIZE[0]) {
        adjustedX = FILE_SIZE[0] - FIELD_SIZE[0]; 
    } else if(adjustedX < 0) {
        adjustedX = 0;
    }

    if(adjustedY + FIELD_SIZE[1] > FILE_SIZE[1]) {
        adjustedY = FILE_SIZE[1] - FIELD_SIZE[1];
    } else if(adjustedY < 0) {
        adjustedY = 0;
    }

    fieldOffset = [adjustedX,adjustedY];
    console.log(fieldOffset);
}

function storeBugPositions() {
    pauseState = true;
    for(var i = 0; i < storedBugPositions.length; i+=4){
        storedBugPositions[i] = bugList[(i/4)].bugTile[0];
        storedBugPositions[i+1] = bugList[(i/4)].bugTile[1];
        storedBugPositions[i+2] = bugList[(i/4)].action;
        storedBugPositions[i+3] = bugList[(i/4)].inStorage;
    }
    //console.log(storedBugPositions);
    //console.log("Bug positions stored");
}

function restoreBugPositions(pauseOnRestore) {
    //We only want to pause if the calling function requests it. 
    console.log(pauseOnRestore);
    if(pauseOnRestore !== true) {  
        pauseState = false;
    } else if(pauseOnRestore === true){ pauseState = true; }

    if(storedBugPositions === [] || storedBugPositions.length !== 32) {
        console.log("Stored bug positions are glitchy.");
        return;
    } else {
        for(var i = 0; i < storedBugPositions.length; i+=4){
            //This is literally the opposite of what we do in storeBugPositions().
            bugList[(i/4)].bugTile[0] = storedBugPositions[i];
            bugList[(i/4)].bugTile[1] = storedBugPositions[i+1];
            bugList[(i/4)].action = storedBugPositions[i+2];
            bugList[(i/4)].inStorage = storedBugPositions[i+3];
        }
        for(var i = 0; i < bugList.length; ++i) {
            getBug(i,false);
        }
        //Inform the timer as well. This should be incorporated into a more general reset function.
        elapsedTime = 0;
        $("#elapsedTime").html(elapsedTime);
    }
}

//Takes input from the volume slider.
function updateInputVolume(volumeNumber) {
    $("#currentInputVolume").html(volumeNumber); //Adjusts the value.
    currentVolume = volumeNumber/100;
}

//Switches between overwrite and mixpaste. 
function changePasteStyle() {
    if(pasteStyle === 1) {
        pasteStyle = 2;
        $("#selectPasteStyle").html("Change from Mix to Overwrite");
    } else if(pasteStyle === 2){
        pasteStyle = 1;
        $("#selectPasteStyle").html("Change from Overwrite to Mix");
    }
}

//Initializes everything, but only responds if the soundSet is loaded. Move to main.js?
function loadIfReady(){
    if(soundsAreReady.called) { init(); }
    //Otherwise, inform the user somehow. We can't use alert because it breaks the load routine..
}

function estimateSongLength(){
    console.log("Not implemented yet");
    //This should only attempt to estimate the song's length if there are definite end conditions.
    //For now, this means either a freeze or revert tile is on the field.
    //Two ways to go about this that might be combined:
    //1. Simulate X moves into the future without actually playing their sounds.
    //2. Set the 'maximum' length when a bug moves over such a tile.
    //Self-modifying tracks with complicated counters and teleporters and such aren't going to be easy to measure.
    //This might get into the halting problem, you know?
}

function resizeFile(){
        //If we're shrinking the map, clean out the areas that will be removed.
        if(fieldContents.length > FILE_SIZE[0]){
            for(var i = FILE_SIZE[0]; i < fieldContents.length; ++i){
                for(var j = FILE_SIZE[1]; j < fieldContents[i].length; ++j){
                    fieldContents[i][j] = undefined;
                }
            }
        }

        fieldContents.length = FILE_SIZE[0];
        //Everything is undefined by default;
        for(var i = 0; i < fieldContents.length; ++i) {
            if(fieldContents[i] == undefined){
                fieldContents[i] = new Array(FILE_SIZE[1]);
            }
            fieldContents[i].length = FILE_SIZE[1];
        }
        console.log(fieldContents);

}