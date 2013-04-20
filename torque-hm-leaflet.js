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
    },
 
    onRenderingStart: function(cb){
        this._onRenderingStart = cb;
        console.log('start')
    },
 
    onRenderingEnd: function(cb) {
        this._onRenderingEnd = cb;
        console.log('end')
    },
 
    onAdd: function(map) {
        this.map = map;
        this._initTorque(this.map, this.torqueOptions);
        map.on("viewreset", this._redraw, this);
        map.on("moveend", this._redraw, this);
        map.on("dragend", this._redraw, this);
        map.on("zoomend", this._redraw, this);
        this._redraw();
    },
 
    onRemove: function(map) {
        map.getPanes().overlayPane.removeChild(this._div);
        map.off("viewreset", this._redraw, this);
        map.off("moveend", this._redraw, this);
        map.off("dragend", this._redraw, this);
        map.off("zoomend", this._redraw, this);
    },
 
    _initTorque: function(map, options){
        options = options || {};                        
        this._step = options.step || 1;
        this._degree = options.degree || TorqueMaster.LINEAR;
        this._opacity = options.opacity || 0.6;
        this._colorscheme = options.colorscheme || null;
 
        var container = L.DomUtil.create('div', 'leaflet-torque-container');
        container.style.position = 'absolute';
        container.style.width = this.map.getSize().x+"px";
        container.style.height = this.map.getSize().y+"px";
 
        var canv = document.createElement("canvas");
        canv.style.width = this.map.getSize().x+"px";
        canv.style.height = this.map.getSize().y+"px";
        canv.width = parseInt(canv.style.width);
        canv.height = parseInt(canv.style.height);
        canv.style.opacity = this._opacity;
        container.appendChild(canv);
 
        this.torque = new TorqueMaster(canv);
        this.torque.onRenderingStart = this._onRenderingStart;
        this.torque.onRenderingEnd = this._onRenderingEnd;
        this._div = container;
        this.map.getPanes().overlayPane.appendChild(this._div);
    },
 
    pushDatax: function(x, y, v) {
        this.data.push({"x":x, "y":y, "v":v});
    },
    pushData: function(xy, data) {
        for (var i = 0; i < data.length; i++){
            this.data.push({"x":data[i].x, "y":data[i].y, "v":data[i].v, "xy": xy});
        }
    },
    reset: function(viz){
        if (viz !== null) this._redraw(null, viz);
    },
    _resetCanvasPosition: function() {
        var bounds = this.map.getBounds();
        var topLeft = this.map.latLngToLayerPoint(bounds.getNorthWest());

        var mx = bounds.getNorthWest().lng * _OFFS 
        var my = (Math.log( Math.tan((90 + bounds.getNorthWest().lat) * Math.PI / 360.0 )) / (Math.PI / 180.0)) * _OFFS 

        var nx = bounds.getSouthEast().lng * _OFFS 
        var ny = (Math.log( Math.tan((90 + bounds.getSouthEast().lat) * Math.PI / 360.0 )) / (Math.PI / 180.0)) * _OFFS =
        

        this._offset = [mx, my];
        this._resolution = [this.map.getSize().x / (nx - mx), this.map.getSize().y / (ny - my)];
        
        //topLeft = this.map.layerPointToContainerPoint(topLeft);
 
        L.DomUtil.setPosition(this._div, topLeft);
    },
 
    _redraw: function(fn, viz) {
        this._resetCanvasPosition();
        this.torque.clearData();
        if (this.data.length > 0) {
            if (viz != null) {
                var n = [];
                for (var i=0, l=this.data.length; i<l; i++) {
                    if (viz.indexOf(this.data[i].xy) > -1){
                        n.push(this.data[i])
                        this.torque.push(
                                Math.floor((this.data[i].x -  this._offset[0]) * this._resolution[0]), 
                                Math.floor((this.data[i].y -  this._offset[1]) * this._resolution[1]),
                                this.data[i].v);
                    }
                }
                this.data = n;
            } else {
                for (var i=0, l=this.data.length; i<l; i++) {
                        this.torque.push(
                                Math.floor((this.data[i].x -  this._offset[0]) * this._resolution[0]), 
                                Math.floor((this.data[i].y -  this._offset[1]) * this._resolution[1]),
                                this.data[i].v);
                }
            }
            this.torque.clear();
            this.torque.render(this._step, this._degree, this._colorscheme);
        }
        return this;
    }
 
});