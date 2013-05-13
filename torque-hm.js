
L.TileLayer.Torque = L.TileLayer.extend({
  options: {
    async: true
  },

  initialize: function (options) {
      //This will add 50 particles to the array with random positions
    L.setOptions(this, options);

    //TODO deal with options
    this._master = new L.TileLayer.TorqueMaster({},{map: this.options.map, 'step':this.options.steps, 'degree':TorqueMaster.LINEAR, 'opacity':0.6});
    var host = this.options.sqlapi_domain || 'cartodb.com';
    if ( this.options.sqlapi_port ) host += ':' + this.options.sqlapi_port;
    this._sql = new cartodb.SQL({ user: this.options.user, format: 'json', host: host, protocol: this.options.sqlapi_protocol, version: this.options.sqlapi_version });

    // this.options.map.addLayer(this._master);

    this._layerc = 0;
  },
  _tracker: function(i) {
    //draw the canvas when complete
    this._layerc = this._layerc + i;
    if (this._layerc == 0){
        var r = [];
        for (k in this._tiles){
          r.push(k);
        }
        // console.log(r)
        this._master.reset(r)
    }
  },
  _loadTile: function (tile, tilePoint) {
    tile._layer = this;
    this._tracker(1);
    var that = this;
    var tileSql = "WITH grid AS (\n" +
                   " SELECT CDB_RectangleGrid( " +
                      " CDB_XYZ_Extent({0}, {1}, {2}), ".format(tilePoint.x, tilePoint.y, this._map._zoom) +
                      " CDB_XYZ_Resolution({0}) * {1}, ".format(this._map._zoom, this.options.resolution) +
                      " CDB_XYZ_Resolution({0}) * {1} ".format(this._map._zoom, this.options.resolution) +
                   " ) as cell " +
                " ),\n" +
                " hgrid AS (\n" +
                   " SELECT cell, " +
                     " round(CAST (st_x(st_centroid(cell)) AS numeric),5) x, " +
                     " round(CAST (st_y(st_centroid(cell)) AS numeric),5) y " +
                   " FROM grid " +
                " )\n" +
                "SELECT g.x, g.y, {1}({0}) v, '{2}'::text xy "
                  .format('count(cartodb_id)', this.options.agg, tilePoint.x+":"+tilePoint.y) +
                "FROM hgrid g, {0} i\n".format(this.options.table) +
                "WHERE i.the_geom_webmercator && CDB_XYZ_Extent({0}, {1}, {2})\n"
                  .format(tilePoint.x, tilePoint.y, this._map._zoom) +
                  " AND ST_Intersects(i.the_geom_webmercator, g.cell)\n" +
                "GROUP BY g.x, g.y ";
    
    this._sql.execute(tileSql)
       .done(function(data) {
            that._redrawTile(data);
       });

    if (!this.options.async) {
      this.tileDrawn(tile);
    }
  },
  _redrawTile: function (data, z) {
    if (data.rows.length>0){  
      this._master.pushData(data.rows[0].xy, data.rows);
      //TODO create a function that just redraws the 
      // tile+stepSize buffer area of the master canvas on new data load
    }
    this._tracker(-1);
  },
  redraw: function () {
    console.log('redraw')
    var tiles = this._tiles;

    for (var i in tiles) {
      if (tiles.hasOwnProperty(i)) {
        // console.log('rer')
        this._redrawTile(tiles[i]);
      } else {
        console.log(i);
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


