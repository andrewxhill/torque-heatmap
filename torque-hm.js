
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
        host += ':' + ( this.options.sqlapi_port || '80' );
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
  _checkPyramid: function(cb) {
    // Check it there's any pyramid set for this layer
    var sql = 'SELECT distinct res FROM {0}_pyramid ORDER BY res'.format(this.options.table);

    if ( this._pyramid_check_queue ) {
        this._pyramid_check_queue.push(cb);
        return;
    }

    this._pyramid_check_queue = [ cb ];

    console.log("Pyramid checker: " + sql);
    var that = this;

    var finish = function() {
        that._pyramid_checked = 1;
        _.each(that._pyramid_check_queue, function(c) { c(); });
        delete that._pyramid_check_queue;
    }

    this._sql.execute(sql)
       .done(function(data) {
            console.log("Pyramid checker response has " + data.rows.length + " rows");
            if ( data.rows.length ) {
              that._pyramid_resolutions = [];
              _.each(data.rows, function(r) {
                that._pyramid_resolutions.push(r.res);
              });
            } 
            finish();
       })
       .error(function(err) {
            console.log(err);
            finish();
       });

  },
  _loadTile: function (tile, tilePoint) {

    var that = this;

    if ( ! that._pyramid_checked ) {
      this._checkPyramid(function() {
        that._loadTile(tile, tilePoint);
      });
      return;
    }

    tile._layer = this;
    this._tracker(1);
    var that = this;
    var tileSql;

    // TODO: query pyramid if the resolution we need is lower than
    //       the max pyramid resolution
    if ( this._pyramid_resolutions ) {
      var res = this._pyramid_resolutions[0];
      tileSql = "WITH cte AS ( SELECT ST_SnapToGrid(ST_Centroid(ext), "
          + "CDB_XYZ_Resolution({0})*{1}) g"
                  . format(this._map._zoom, this.options.resolution) +
                ", {1}({0}) v " .format('sum((select sum(v) from cdb_torquepixel_dump(v,0)))', this.options.agg) +
                "FROM {0}\n".format(this.options.table + '_pyramid') +
                "WHERE ext && CDB_XYZ_Extent({0}, {1}, {2}) AND res = {3}\n"
                  .format(tilePoint.x, tilePoint.y, this._map._zoom, res) +
                " GROUP BY g ) SELECT st_x(g) x, st_y(g) y, v, '{0}'::text xy from cte"
                  . format(tilePoint.x+":"+tilePoint.y);
    } else {
      tileSql = "WITH cte AS ( SELECT ST_SnapToGrid(i.the_geom_webmercator, "
          + "CDB_XYZ_Resolution({0})*{1}) g"
                  . format(this._map._zoom, this.options.resolution) +
                ", {1}({0}) v " .format('count(cartodb_id)', this.options.agg) +
                "FROM {0} i\n".format(this.options.table) +
                "WHERE i.the_geom_webmercator && CDB_XYZ_Extent({0}, {1}, {2})\n"
                  .format(tilePoint.x, tilePoint.y, this._map._zoom) +
                " GROUP BY g ) SELECT st_x(g) x, st_y(g) y, v, '{0}'::text xy from cte"
                  . format(tilePoint.x+":"+tilePoint.y);
    }

    //console.log(tileSql);

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


