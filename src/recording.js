function Recording (options){
  this.options = options || (options = {});
  this.loading = false;
  this.timeBetweenLoops = options.timeBetweenLoops || 50;

  // see https://github.com/leapmotion/leapjs/blob/master/Leap_JSON.rst
  this.packingStructure = [
    'id',
    'timestamp',
    // this should be replace/upgraded with a whitelist instead of a blacklist.
    // leaving out r,s,y, and gestures
    {hands: [[
      'id',
      'type',
      'direction',
      'palmNormal',
      'palmPosition',
      'palmVelocity',
      'stabilizedPalmPosition',
      'pinchStrength',
      'grabStrength',
      'confidence',
      'armBasis',
      'armWidth',
      'elbow',
      'wrist'
      // leaving out r, s, t, sphereCenter, sphereRadius
    ]]},
    {pointables: [[
      'id',
      'direction',
      'handId',
      'length',
      'stabilizedTipPosition',
      'tipPosition',
      'tipVelocity',
      'tool',
      'carpPosition',
      'mcpPosition',
      'pipPosition',
      'dipPosition',
      'btipPosition',
      'bases',
      'type'
      // leaving out touchDistance, touchZone
    ]]},
    {interactionBox: [
      'center', 'size'
    ]}
  ];

  this.setFrames(options.frames || [])
}


Recording.prototype = {

  setFrames: function (frames) {
    this.frameData = frames;
    this.frameIndex = 0;
    this.frameCount = frames.length;
    this.leftCropPosition = 0;
    this.rightCropPosition = this.frameCount;
    this.setMetaData();
  },

  addFrame: function(frameData){
    this.frameData.push(frameData);
  },

  currentFrame: function () {
    return this.frameData[this.frameIndex];
  },

  nextFrame: function () {
    var frameIndex = this.frameIndex + 1;
    // || 1 to prevent `mod 0` error when finishing recording before setFrames has been called.
    frameIndex = frameIndex % (this.rightCropPosition || 1);
    if ((frameIndex < this.leftCropPosition)) {
      frameIndex = this.leftCropPosition;
    }
    return this.frameData[frameIndex];
  },


  advanceFrame: function () {
    this.frameIndex++;

    if (this.frameIndex >= this.rightCropPosition && !this.options.loop) {
      this.frameIndex--;
      // there is currently an issue where angular watching the right handle position
      // will cause this to fire prematurely
      // when switching to an earlier recording
      return false
    }


    this.frameIndex = this.frameIndex % (this.rightCropPosition || 1);

    if ((this.frameIndex < this.leftCropPosition)) {
      this.frameIndex = this.leftCropPosition;
    }

    return true
  },

  // resets to beginning if at end
  readyPlay: function(){
    this.frameIndex++;
    if (this.frameIndex >= this.rightCropPosition) {
      this.frameIndex = this.frameIndex % (this.rightCropPosition || 1);

      if ((this.frameIndex < this.leftCropPosition)) {
        this.frameIndex = this.leftCropPosition;
      }
    }else{
      this.frameIndex--;
    }
  },

  cloneCurrentFrame: function(){
    return JSON.parse(JSON.stringify(this.currentFrame()));
  },


  // this method would be well-moved to its own object/class -.-
  // for every point, lerp as appropriate
  // note: currently hand and finger props are hard coded, but things like stabilizedPalmPosition should be optional
  // should have this be set from the packingStructure or some such, but only for vec3s.
  createLerpFrameData: function(t){
    // http://stackoverflow.com/a/5344074/478354
    var currentFrame = this.currentFrame(),
        nextFrame = this.nextFrame(),
        handProps   = ['palmPosition', 'stabilizedPalmPosition', 'sphereCenter', 'direction', 'palmNormal', 'palmVelocity'],
        fingerProps = ['mcpPosition', 'pipPosition', 'dipPosition', 'tipPosition', 'direction'],
        frameData = this.cloneCurrentFrame(),
        numHands = frameData.hands.length,
        numPointables = frameData.pointables.length,
        len1 = handProps.length,
        len2 = fingerProps.length,
        prop, hand, pointable;

    for (var i = 0; i < numHands; i++){
      hand = frameData.hands[i];

      for (var j = 0; j < len1; j++){
        prop = handProps[j];

        if (!currentFrame.hands[i][prop]){
          continue;
        }

        if (!nextFrame.hands[i]){
          continue;
        }

        Leap.vec3.lerp(
          hand[prop],
          currentFrame.hands[i][prop],
          nextFrame.hands[i][prop],
          t
        );

//        console.assert(hand[prop]);
      }

    }

    for ( i = 0; i < numPointables; i++){
      pointable = frameData.pointables[i];

      for ( j = 0; j < len2; j++){
        prop = fingerProps[j];

        if (!currentFrame.pointables[i][prop]){
          continue;
        }

        if (!nextFrame.hands[i]){
          continue;
        }

        Leap.vec3.lerp(
          pointable[prop],
          currentFrame.pointables[i][prop],
          nextFrame.pointables[i][prop],
          0
        );
//          console.assert(t >= 0 && t <= 1);
//          if (t > 0) debugger;

      }

    }

    return frameData;
  },

  // returns ms
  timeToNextFrame: function () {
    var elapsedTime = (this.nextFrame().timestamp - this.currentFrame().timestamp) / 1000;
    if (elapsedTime < 0) {
      elapsedTime = this.timeBetweenLoops; //arbitrary pause at slightly less than 30 fps.
    }
//    console.assert(!isNaN(elapsedTime));
    return elapsedTime;
  },


  blank: function(){
    return this.frameData.length === 0;
  },

  // sets the crop-point of the current recording to the current position.
  leftCrop: function () {
    this.leftCropPosition = this.frameIndex
  },

  // sets the crop-point of the current recording to the current position.
  rightCrop: function () {
    this.rightCropPosition = this.frameIndex
  },

  // removes every other frame from the array
  // Accepts an optional `factor` integer, which is the number of frames
  // discarded for every frame kept.
  cullFrames: function (factor) {
    factor || (factor = 1);
    for (var i = 0; i < this.frameData.length; i++) {
      this.frameData.splice(i, factor);
    }
    this.setMetaData();
  },

  // Returns the average frames per second of the recording
  frameRate: function () {
    if (this.frameData.length == 0) {
      return 0
    }
    return this.frameData.length / (this.frameData[this.frameData.length - 1].timestamp - this.frameData[0].timestamp) * 1000000;
  },

  // returns frames without any circular references
  croppedFrameData: function () {
    return this.frameData.slice(this.leftCropPosition, this.rightCropPosition);
  },


  setMetaData: function () {

    var newMetaData = {
      formatVersion: 2,
      generatedBy: 'LeapJS Playback 0.2.1',
      frames: this.rightCropPosition - this.leftCropPosition,
      protocolVersion: this.options.requestProtocolVersion,
      serviceVersion: this.options.serviceVersion,
      frameRate: this.frameRate().toPrecision(2),
      modified: (new Date).toString()
    };

    this.metadata || (this.metadata = {});

    for (var key in newMetaData) {
      this.metadata[key] = newMetaData[key];
    }

    if (!this.metadata.title && this.url){
      this.metadata.title = this.url.replace(/(\.json)?(\.lz)?$/, '')
    }

  },

  // returns an array
  // the first item is the keys of the following items
  // nested arrays are expected to have idententical siblings
  packedFrameData: function(){
    var frameData = this.croppedFrameData(),
      packedFrames = [],
      frameDatum;

    packedFrames.push(this.packingStructure);

    for (var i = 0, len = frameData.length; i < len; i++){
      frameDatum = frameData[i];

      packedFrames.push(
        this.packArray(
          this.packingStructure,
          frameDatum
        )
      );

    }

    return packedFrames;
  },

  // recursive method
  // creates a structure of frame data matching packing structure
  // there may be an issue here where hands/pointables are wrapped in one more array than necessary
  packArray: function(structure, data){
    var out = [], nameOrHash;

    for (var i = 0, len1 = structure.length; i < len1; i++){

      // e.g., nameOrHash is either 'id' or {hand: [...]}
      nameOrHash = structure[i];

      if ( typeof  nameOrHash === 'string'){

        out.push(
          data[nameOrHash]
        );

      }else if (Object.prototype.toString.call(nameOrHash) == "[object Array]") {
        // nested array, such as hands or fingers

        for (var j = 0, len2 = data.length; j < len2; j++){
          out.push(
            this.packArray(
              nameOrHash,
              data[j]
            )
          );
        }

      } else { // key-value (nested object) such as interactionBox

//        console.assert(nameOrHash);

        for (var key in nameOrHash) break;

//        console.assert(key);
//        console.assert(nameOrHash[key]);
//        console.assert(data[key]);

        out.push(this.packArray(
          nameOrHash[key],
          data[key]
        ));

      }

    }

    return out;
  },

  // expects the first array element to describe the following arrays
  // this algorithm copies frames to a new array
  // could there be merit in something which would do an in-place substitution?
  unPackFrameData: function(packedFrames){
    var packingStructure = packedFrames[0];
    var frameData = [],
        frameDatum;

    for (var i = 1, len = packedFrames.length; i < len; i++) {
      frameDatum = packedFrames[i];
      frameData.push(
        this.unPackArray(
          packingStructure,
          frameDatum
        )
      );

    }

    return frameData;
  },

  // data is a frame or subset of frame
  // returns a frame object
  // this is the structure of the array
  // gets unfolded to key-value pairs
  // e.g.:
  //  this.packingStructure = [
  //    'id',
  //    'timestamp',
  //    {hands: [[
  //      'id',
  //      'direction',
  //      'palmNormal',
  //      'palmPosition',
  //      'palmVelocity'
  //    ]]},
  //    {pointables: [[
  //      'direction',
  //      'handId',
  //      'length',
  //      'stabilizedTipPosition',
  //      'tipPosition',
  //      'tipVelocity',
  //      'tool'
  //    ]]},
  //    {interactionBox: [
  //      'center', 'size'
  //    ]}
  //  ];
  unPackArray: function(structure, data){
    var out = {}, nameOrHash;

    for (var i = 0, len1 = structure.length; i < len1; i++){

     // e.g., nameOrHash is either 'id' or {hand: [...]}
     nameOrHash = structure[i];

     if ( typeof  nameOrHash === 'string'){

       out[nameOrHash] = data[i];

     }else if (Object.prototype.toString.call(nameOrHash) == "[object Array]") {
       // nested array, such as hands or fingers
       // nameOrHash ["id", "direction", "palmNormal", "palmPosition", "palmVelocity"]
       // data [ [ 31, [vec3], [vec3], ...] ]

       var subArray = [];

       for (var j = 0, len2 = data.length; j < len2; j++){
         subArray.push(
           this.unPackArray(
             nameOrHash,
             data[j]
           )
         );
       }
       return subArray;

     } else { // key-value (nested object) such as interactionBox

       for (var key in nameOrHash) break;

       out[key] = this.unPackArray(
         nameOrHash[key],
         data[i]
       );

     }

    }

    return out;
  },

  toHash: function () {
    this.setMetaData();
    return {
      metadata: this.metadata,
      frames: this.packedFrameData()
    }
  },

  // Returns the cropped data as JSON or compressed
  // http://pieroxy.net/blog/pages/lz-string/index.html
  export: function (format) {
    var json = JSON.stringify(this.toHash());

    if (format == 'json') return json;

    return LZString.compressToBase64(json);
  },

  save: function(format){
    var filename;

    filename = this.metadata.title ? this.metadata.title.replace(/\s/g, '') : 'leap-playback-recording';

    if (this.metadata.frameRate) {
      filename += "-" + (Math.round(this.metadata.frameRate)) + "fps";
    }

    if (format === 'json') {

      saveAs(new Blob([this.export('json')], {
        type: "text/JSON;charset=utf-8"
      }), filename + ".json");

    } else {

      saveAs(new Blob([this.export('lz')], {
        type: "application/x-gzip;charset=utf-8"
      }),  filename + ".json.lz");

    }

  },

  decompress: function (data) {
    return LZString.decompressFromBase64(data);
  },

  loaded: function(){
    return !!(this.frameData && this.frameData.length)
  },


  // optional callback once frames are loaded, will have a context of player
  loadFrameData: function (callback) {
    var xhr = new XMLHttpRequest(),
        url = this.url,
        recording = this;

    xhr.onreadystatechange = function () {
      if (xhr.readyState === xhr.DONE) {
        if (xhr.status === 200 || xhr.status === 0) {
          if (xhr.responseText) {

            recording.readFileData(xhr.responseText, callback);

          } else {
            console.error('Leap Playback: "' + url + '" seems to be unreachable or the file is empty.');
          }
        } else {
          console.error('Leap Playback: Couldn\'t load "' + url + '" (' + xhr.status + ')');
        }
      }
    };

    xhr.addEventListener('progress', function(oEvent){

      if ( recording.options.loadProgress ) {

        if (oEvent.lengthComputable) {
          var percentComplete = oEvent.loaded / oEvent.total;
          recording.options.loadProgress( recording, percentComplete, oEvent );
        }

      }

    });

    this.loading = true;

    xhr.open("GET", url, true);
    xhr.send(null);
  },

  readFileData: function(responseData, callback){

    var url = this.url;

    if (url && url.split('.')[url.split('.').length - 1] == 'lz') {
      responseData = this.decompress(responseData);
    }

    if ( Leap._.isString(responseData) ) {
      responseData = JSON.parse(responseData);
    }

    if (responseData.metadata.formatVersion == 2) {
      responseData.frames = this.unPackFrameData(responseData.frames);
    }

    this.metadata = responseData.metadata;

    this.setFrames(responseData.frames);

    this.loading = false;

    if (callback) {
      callback.call(this, responseData.frames);
    }

  }

};