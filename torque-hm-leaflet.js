/**
 * Copyright 2010 Sun Ning <classicning@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
_OFFS = 2 * Math.PI * 6378137 / 2.0 / 180.0;
 
L.TileLayer.TorqueMaster = L.Class.extend({
 
    initialize: function(options, torqueOptions){
        this.torqueOptions = torqueOptions;
        this.data= [];
        this._onRenderingStart = null;
        this._onRenderingEnd = null;
        this._offset = null;
        this._drag = [0,0];
        this._xbuffer = this._ybuffer = 256;
        this.map = torqueOptions.map;
        this._zoom = this.map.getZoom();
        this._viz = [];
        this._initTorque(this.map, this.torqueOptions);
        // this.map.on("viewreset", this._redraw, this);
        // this.map.on("moveend", this._redraw, this);
        // this.map.on("dragend", this._redraw, this);
        this.map.on("zoomstart", this._zoomStart, this);
        this.map.on("zoomend", this._zoomCanvas, this);
        this.map.on("drag", this._dragCanvas , this);
        this.map.on("dragend", this._dragEnd , this);
        this._redraw();
    },
    onRenderingStart: function(cb){
        this._onRenderingStart = cb;
        console.log('start')
    },
 
    onRenderingEnd: function(cb) {
        this._onRenderingEnd = cb;
        console.log('end')
    },
 
    _initTorque: function(map, options){
        options = options || {};                        
        this._step = options.step || 1;
        this._degree = options.degree || TorqueMaster.LINEAR;
        this._opacity = options.opacity || 0.6;
        this._colorscheme = options.colorscheme || null;
 
        var bounds = this.map.getBounds();
        var topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());
        var mx = bounds.getNorthWest().lng * _OFFS ;
        var my = (Math.log( Math.tan((90 + bounds.getNorthWest().lat) * Math.PI / 360.0 )) / (Math.PI / 180.0)) * _OFFS ;
        this._offset = [mx, my];

        var container = document.createElement("div"); //L.DomUtil.create('div', 'leaflet-torque-container');
        container.class = 'torque-heatmap';
        container.style.position = 'absolute';
        container.style.width = this.map.getSize().x+"px";
        container.style.height = this.map.getSize().y+"px";
        container.style.width = this.map.getSize().x+"px";
        container.style.height = this.map.getSize().y+"px";
 
        var canv = document.createElement("canvas");
        canv.style.width = this.map.getSize().x+this._xbuffer*2+"px";
        canv.style.height = this.map.getSize().y+this._ybuffer*2+"px";
        canv.width = parseInt(canv.style.width);
        canv.height = parseInt(canv.style.height);
        canv.style.marginLeft = '-'+this._xbuffer+'px';
        canv.style.marginTop = '-'+this._ybuffer+'px';
        canv.style.opacity = this._opacity;
        canv.style.opacity = this._opacity;
        container.appendChild(canv);
 
        this.torque = new TorqueMaster(canv);
        this.torque.onRenderingStart = this._onRenderingStart;
        this.torque.onRenderingEnd = this._onRenderingEnd;
        this._div = container;
        //console.log(map._container.id)
        document.getElementById(this.map._container.id).appendChild(this._div);
        // $('body').append(this._div);
        // this.map.getPanes().overlayPane.appendChild(this._div);
    },

    pushData: function(xy, data) {
        for (var i = 0; i < data.length; i++){
            this.data.push({"x":data[i].x, "y":data[i].y, "v":data[i].v, "xy": xy});
        }
    },
    reset: function(viz){
        if (viz !== null) this._redraw(null, viz);
    },
    _zoomStart: function(e){
        this.torque.clear();
    },
    _zoomCanvas: function(e){
        this._redraw(e);
    },
    _dragEnd: function(e){
        console.log('e')
        var bounds = this.map.getBounds();
        var topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());

        var mx = bounds.getNorthWest().lng * _OFFS ;
        var my = (Math.log( Math.tan((90 + bounds.getNorthWest().lat) * Math.PI / 360.0 )) / (Math.PI / 180.0)) * _OFFS ;
        
        this._offset = [mx , my];
        this._drag = [topLeft.x, topLeft.y];
    },
    _dragCanvas: function(e){
        var bounds = this.map.getBounds();
        var topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());

        var mx = bounds.getNorthWest().lng * _OFFS ;
        var my = (Math.log( Math.tan((90 + bounds.getNorthWest().lat) * Math.PI / 360.0 )) / (Math.PI / 180.0)) * _OFFS ;

        this._offset = [mx , my];

        var offset = [this._drag[0] - topLeft.x, this._drag[1] - topLeft.y]
        this._drag = [topLeft.x, topLeft.y]
        this.torque.drag(offset);
    },
    _resetCanvasPosition: function() {
        var bounds = this.map.getBounds();
        var topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());

        var mx = bounds.getNorthWest().lng * _OFFS ;
        var my = (Math.log( Math.tan((90 + bounds.getNorthWest().lat) * Math.PI / 360.0 )) / (Math.PI / 180.0)) * _OFFS ;

        var nx = bounds.getSouthEast().lng * _OFFS ;
        var ny = (Math.log( Math.tan((90 + bounds.getSouthEast().lat) * Math.PI / 360.0 )) / (Math.PI / 180.0)) * _OFFS ;

        this._offset = [mx , my];
        this._resolution = [this.map.getSize().x / (nx - mx), this.map.getSize().y / (ny - my)];
        
        //topLeft = this.map.layerPointToContainerPoint(topLeft);
 
        // L.DomUtil.setPosition(this._div, topLeft);
    },
    _redraw: function(fn, viz) {
        if (this.data.length > 0) {
            if (viz != null) {
                this.viz = viz;
            }
                // console.log(viz)
            this._resetCanvasPosition();
            this.torque.clearData();
            var n = [];
            for (var i=0, l=this.data.length; i<l; i++) {
                if (this.viz.indexOf(this.data[i].xy) > -1){
                    n.push(this.data[i])
                    this.torque.push(
                            Math.floor((this.data[i].x -  this._offset[0]) * this._resolution[0]) + this._xbuffer, 
                            Math.floor((this.data[i].y -  this._offset[1]) * this._resolution[1]) + this._ybuffer,
                            this.data[i].v);
                }
            }
            this.data = n;
            // this.torque.clear();
            this.torque.render(this._step, this._degree, this._colorscheme);
            // } 

        }
        return this;
    }
 
});
