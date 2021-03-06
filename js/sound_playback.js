//Actual audio playback is now in its own file, which may increase readability in the long run.

function soundsAreReady(soundList) {
    soundsAreReady.called = true;
    //console.log(soundList);
    //Populate soundFont with all the sounds we need.
    soundFont = [];
    for(var i = 0; i < soundList.length; ++i) {
        soundFont.push(soundList[i]); //We fill up SoundFont with sounds...
    }
    $("#initButton").html("Loaded, click to write music"); //Clicking this button calls init().
}

//Legacy playback mechanism for version 1 files. Might get dummied out someday.
function playSound(buffer, pitch, dspEffect, dspValue, volume) {

    var source = audioEngine.createBufferSource();  
    source.buffer = buffer;
    var playbackMidPoint = source.buffer.duration; //Fallback.
    source.playbackRate.value = pitch; 

    //Volume adjustment is handled before effects are added.
    var volumeAdjustment = audioEngine.createGain();
    source.connect(volumeAdjustment);
    //Very basic error trapping in case we get nasty input that might potentially cause clipping.
    if(volume >= 0 && volume <= 1) { 
        volumeAdjustment.gain.value = volume; 
    } else { volumeAdjustment.gain.value = 0.6; }

    var biQuadFilter = audioEngine.createBiquadFilter();
    switch(dspEffect){
        //Removes all pitches above a value
        case 'lowpass':
            volumeAdjustment.connect(biQuadFilter);
            biQuadFilter.type = 'lowpass';
            biQuadFilter.frequency.value = dspValue;
            biQuadFilter.connect(audioEngine.destination);
            break;
        //Removes all pitches below a value
        case 'highpass':
            volumeAdjustment.connect(biQuadFilter);
            biQuadFilter.type = 'highpass';
            biQuadFilter.frequency.value = dspValue;
            biQuadFilter.connect(audioEngine.destination);
            break;
        //Removes all pitches that aren't near a value.
        case 'bandpass':
            volumeAdjustment.connect(biQuadFilter);
            biQuadFilter.type = 'bandpass';
            biQuadFilter.frequency.value = dspValue;
            biQuadFilter.connect(audioEngine.destination);
            break;
        //Boosts frequencies below a value
        case 'lowshelf':
            volumeAdjustment.connect(biQuadFilter);
            biQuadFilter.type = 'lowshelf';
            biQuadFilter.frequency.value = dspValue;
            biQuadFilter.gain.value = 6;
            biQuadFilter.connect(audioEngine.destination);
            break;
        //Boosts frequencies above a value
        case 'highshelf':
            volumeAdjustment.connect(biQuadFilter);
            biQuadFilter.type = 'highshelf';
            biQuadFilter.frequency.value = dspValue;
            biQuadFilter.gain.value = 6;
            biQuadFilter.connect(audioEngine.destination);
            break;
        //Boosts frequencies between values
        case 'peaking':
            volumeAdjustment.connect(biQuadFilter);
            biQuadFilter.type = 'peaking';
            biQuadFilter.frequency.value = dspValue;
            biQuadFilter.Q.value = 1;
            biQuadFilter.gain.value = 6;
            console.log(biQuadFilter);
            biQuadFilter.connect(audioEngine.destination);
            break;
        //Removes all pitches that ARE near a value
        case 'notch':
            volumeAdjustment.connect(biQuadFilter);
            biQuadFilter.type = 'notch';
            biQuadFilter.frequency.value = dspValue;
            biQuadFilter.Q.value = 1;
            biQuadFilter.connect(audioEngine.destination);
            break;
        //Separate from all the frequency filters
        case 'bendpitch':
            if(dspValue <= 16 && dspValue > 0) { source.playbackRate.value *= dspValue; } 
            else { console.log('bendpitch only takes values between 0 and 16, for the sake of sanity. Effect not applied.'); }
            volumeAdjustment.connect(audioEngine.destination);
            break;

        case 'stopplayback': //These share some logic and operate on start() accordingly.
        case 'startfromlater':
            //Takes values between 0-100 (floating point) and converts them into percentages of the file's length.
            if(dspValue >= 0 && dspValue < 100) {
                playbackMidPoint = source.buffer.duration * (dspValue/100);
            }
            volumeAdjustment.connect(audioEngine.destination);
            break;
        default:
            volumeAdjustment.connect(audioEngine.destination);
            break;
    }
    //console.log(playbackMidPoint);
    if(dspEffect == 'stopplayback'){
        source.start(0,0,playbackMidPoint); //Stops playing after a percentage of the duration.
    } else if(dspEffect == 'startfromlater') {
        source.start(0,playbackMidPoint); //Starts playing in the middle of the sound.
    } else {
        source.start(); //By default, we play the entire sound.
    } 
    
}

function playSound2(buffer, pitch, volume, effects){
    //console.log(buffer, pitch, volume, effects);
    //Everything begins the same as the old version.
    var source = audioEngine.createBufferSource();  
    source.buffer = buffer;
    var playbackMidPoint = source.buffer.duration; //Fallback.
    source.playbackRate.value = pitch; 
    var volumeAdjustment = audioEngine.createGain();
    source.connect(volumeAdjustment);
    if(volume >= 0 && volume <= 1) { 
        volumeAdjustment.gain.value = volume; 
    } else { volumeAdjustment.gain.value = 0.6; }


    //The bulk of the new code starts here. Some variable definitions first.
    var DSPNodes = new Array(effects.length); //Used to actually store node objects.
    var startSound = 0;
    var endSound = source.buffer.duration;
    var delayDuration = 0;
    //Chew through the effect array that got passed in.
    for(var i = 0; i < effects.length; ++i){
        //console.log(effects[i].type);
        switch(effects[i].type){
            //Case for biQuadFilters
            case "lowpass":
            case "highpass":
            case "bandpass":
            case "lowshelf":
            case "highshelf":
            case "peaking":
            case "notch":
            case "allpass":
                DSPNodes[i] = audioEngine.createBiquadFilter();
                DSPNodes[i].type = effects[i].type;
                if(effects[i].frequency != null) { DSPNodes[i].frequency.value = effects[i].frequency; }
                if(effects[i].quality != null) { DSPNodes[i].Q.value = effects[i].quality; }
                if(effects[i].gain != null) { DSPNodes[i].gain.value = effects[i].gain; }
                break;
            //We still need to generate nodes even if we aren't using them for filters.
            //This code creates a lowpass filter removing everything above 65536 Hz.
            //Essentially, it removes nothing because you can't possibly hear anything that high.
            case "bendpitch":
                if(effects[i].bendpitch <= 16 && effects[i].bendpitch > 0 && effects[i].bendpitch != null) { 
                    source.playbackRate.value *= effects[i].bendpitch; } 
                else { console.log('bendpitch only takes values between 0 and 16, for the sake of sanity. Effect not applied.'); }
                DSPNodes[i] = audioEngine.createBiquadFilter();
                DSPNodes[i].frequency.value = 65536;
                break;
            //These effects use duration values and don't really proc until playback time.
            case "startfromlater":
                if(effects[i].cutoff != null) { startSound = source.buffer.duration * (effects[i].cutoff/100); }
                DSPNodes[i] = audioEngine.createBiquadFilter();
                DSPNodes[i].frequency.value = 65536; 
                break;
            case "stopplayback":
                if(effects[i].cutoff != null) { endSound = source.buffer.duration * (effects[i].cutoff/100); }
                DSPNodes[i] = audioEngine.createBiquadFilter();
                DSPNodes[i].frequency.value = 65536; 
                break;
            case "delayplayback":
                if(effects[i].duration != null) { delayDuration = effects[i].duration; }
                DSPNodes[i] = audioEngine.createBiquadFilter();
                DSPNodes[i].frequency.value = 65536; 
                break;
            default:
                DSPNodes[i] = audioEngine.createBiquadFilter();
                DSPNodes[i].frequency.value = 65536;
                break;
        }
        //The first node needs special treatment.
        if(i == 0){
            volumeAdjustment.connect(DSPNodes[i]);
            //console.log("Connected volumeAdjustment");
        } else {
            DSPNodes[i - 1].connect(DSPNodes[i]);
            //console.log(DSPNodes);
        }
    }
    //Sanitize certain types of input if necessary. For now, that's just the cutoff effects.
    if(startSound > endSound){
        var swapCutoff = startSound;
        startSound = endSound;
        endSound = swapCutoff;
    }

    //Then finish up and actually play the sound!
    if(DSPNodes.length == 0){
        volumeAdjustment.connect(audioEngine.destination);
    } else {
        DSPNodes[DSPNodes.length - 1].connect(audioEngine.destination);
        //console.log(DSPNodes[DSPNodes.length - 1]);
    }
    //source.start();
    source.start( (audioEngine.currentTime + delayDuration) ,startSound,endSound); //Starts playing after [delayDuration] seconds, percentages determined by startSound and endSound.
}