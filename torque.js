
L.TileLayer.Torque = L.TileLayer.extend({
  options: {
    async: true
  },

  initialize: function (options) {
      //This will add 50 particles to the array with random positions
    L.setOptions(this, options);

    //TODO deal with options
    this._master = new L.TileLayer.TorqueMaster({},{'step':0.5, 'degree':TorqueMaster.LINEAR, 'opacity':0.7});

  },

  redraw: function () {
    var tiles = this._tiles;

    for (var i in tiles) {
      if (tiles.hasOwnProperty(i)) {
        // console.log('rer')
        this._redrawTile(tiles[i]);
      }
    }
    return this;
  },

  _redrawTile: function (tile) {
    console.log('redraw')
    this.drawTile(tile, tile._tilePoint, this._map._zoom);
  },

  _createTileProto: function () {
    // var proto = this._canvasProto = L.DomUtil.create('canvas', 'leaflet-tile');
    proto.width = proto.height = this.options.tileSize;
  },

  drawTile: function(canvas, tile, zoom){
        var W = 256, H = 256;
  },
  _createTile: function () {
    var tile = this._canvasProto.cloneNode(false);
    tile.onselectstart = tile.onmousemove = L.Util.falseFn;
    return tile;
  },
  _loadTile: function (tile, tilePoint) {

    tile._layer = this;
    tile._tilePoint = tilePoint;

    this._redrawTile(tile);
    if (!this.options.async) {
      this.tileDrawn(tile);
    }
  },

  // drawTile: function (/*tile, tilePoint*/) {
  //   // override with rendering code
  // },

  tileDrawn: function (tile) {
    this._tileOnLoad.call(tile);
  }
});


L.tileLayer.torque = function (options) {
return new L.TileLayer.Torque(options);
};


String.prototype.format = (function (i, safe, arg) {
    function format() {
        var str = this,
            len = arguments.length + 1;

        for (i = 0; i < len; arg = arguments[i++]) {
            safe = typeof arg === 'object' ? JSON.stringify(arg) : arg;
            str = str.replace(RegExp('\\{' + (i - 1) + '\\}', 'g'), safe);
        }
        return str;
    }

    //format.native = String.prototype.format;
    return format;
})();


