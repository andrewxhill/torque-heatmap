
L.TileLayer.Torque = L.TileLayer.extend({
  options: {
    async: false
  },

  initialize: function (options) {
      //This will add 50 particles to the array with random positions
    L.setOptions(this, options);

    //TODO deal with options
    this._master = new L.TileLayer.TorqueMaster({},{'step':this.options.steps, 'degree':TorqueMaster.LINEAR, 'opacity':0.6});
    this._sql = new cartodb.SQL({ user: this.options.user, format: 'json'});

    this.options.map.addLayer(this._master);

    this._layers = 0;
  },
  _tracker: function(i) {
    //draw the canvas when complete
    this._layers = this._layers + i;
    if (this._layers == 0){
        this._master.reset()
    }
  },
  _loadTile: function (tile, tilePoint) {
    tile._layer = this;
    this._tracker(1);
    var that = this;
    var tileSql = "WITH hgrid AS ( " +
                "    SELECT CDB_RectangleGrid( " +
                "       CDB_XYZ_Extent({0}, {1}, {2}), ".format(tilePoint.x, tilePoint.y, this._map._zoom) +
                "       CDB_XYZ_Resolution({0}) * {1}, ".format(this._map._zoom, this.options.resolution) +
                "       CDB_XYZ_Resolution({0}) * {1} ".format(this._map._zoom, this.options.resolution) +
                "    ) as cell " +
                " ) " +
                " SELECT  " +
                "    x, y, log(sum(c)) sums, '{0}' tile ".format(tilePoint.x+":"+tilePoint.y) +
                " FROM ( " +
                "    SELECT " +
                "      round(CAST (st_x(st_centroid(hgrid.cell)) AS numeric),5) x, round(CAST (st_y(st_centroid(hgrid.cell)) AS numeric),5) y, {0} c ".format('count(cartodb_id)') +
                "    FROM " +
                "        hgrid, {0} i ".format(this.options.table) +
                "    WHERE " +
                "        ST_Intersects(i.the_geom_webmercator, hgrid.cell) " +
                "    GROUP BY " +
                "        hgrid.cell" +
                " ) f GROUP BY x, y";

    this._sql.execute(tileSql)
       .done(function(data) {
            that._redrawTile(data);
       });

    if (!this.options.async) {
      this.tileDrawn(tile);
    }
  },
  _redrawTile: function (data) {
    for(var i=0,l=data.rows.length; i<l; i++) {
        this._master.pushData(Math.floor(data.rows[i].x), Math.floor((data.rows[i].y)), data.rows[i].sums);
    }
    this._tracker(-1);
  },
  drawTile: function(data, tile, zoom){
    // console.log(this)
    // this._master._render();
  },
  redraw: function () {
    var tiles = this._tiles;

    for (var i in tiles) {
      if (tiles.hasOwnProperty(i)) {
        // console.log('rer')
        this._redrawTile(tiles[i]);
      }
    }
    // TODO, can I do data remove here?
    return this;
  },



  // drawTile: function (/*tile, tilePoint*/) {
  //   // override with rendering code
  // },

  tileDrawn: function (tile) {
    this._tileOnLoad.call(tile);
  },
  _createTileProto: function () {
    //TODO get rid of dom element entirely
    var proto = this._canvasProto = L.DomUtil.create('canvas', 'leaflet-tile');
    proto.width = proto.height = 0;
    proto.data  = [];
  },
  _createTile: function () {
    var tile = this._canvasProto.cloneNode(true);
    tile.onselectstart = tile.onmousemove = L.Util.falseFn;
    return tile;
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


