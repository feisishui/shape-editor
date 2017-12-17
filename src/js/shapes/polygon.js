/*
// Copyright (C) 2017 University of Dundee & Open Microscopy Environment.
// All rights reserved.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

/* globals Raphael: false */
/* globals console: false */

var Polygon = function Polygon(options) {

    var self = this;
    this.manager = options.manager;
    this.paper = options.paper;

    if (options.id) {
        this._id = options.id;
    } else {
        this._id = this.manager.getRandomId();
    }
    this._points = options.points;
    // this._rotation = options.rotation || 0;

    this._strokeColor = options.strokeColor;
    this._strokeWidth = options.strokeWidth || 2;
    this._selected = false;
    this._zoomFraction = 1;
    if (options.zoom) {
        this._zoomFraction = options.zoom / 100;
    }
    this.handle_wh = 6;

    this.element = this.paper.path("");
    this.element.attr({'fill-opacity': 0.01,
                        'fill': '#fff',
                        'cursor': 'pointer'});

    if (this.manager.canEdit) {
        // Drag handling of element
        this.element.drag(
            function(dx, dy) {
                // DRAG, update location and redraw
                dx = dx / self._zoomFraction;
                dy = dy / self._zoomFraction;

                var offsetX = dx - this.prevX;
                var offsetY = dy - this.prevY;
                this.prevX = dx;
                this.prevY = dy;

                // Manager handles move and redraw
                self.manager.moveSelectedShapes(offsetX, offsetY, true);
            },
            function() {
                self._handleMousedown();
                this.prevX = 0;
                this.prevY = 0;
                return false;
            },
            function() {
                // STOP
                // notify manager if rectangle has moved
                if (this.prevX !== 0 || this.prevY !== 0) {
                    self.manager.notifySelectedShapesChanged();
                }
                return false;
            }
        );
    }

    // create handles...
    this.createHandles();
    // and draw the Polygon
    this.drawShape();
};

Polygon.prototype.toJson = function toJson() {
    var rv = {
        'type': "Polygon",
        'points': this._points,
        // 'rotation': this._rotation,
        'strokeWidth': this._strokeWidth,
        'strokeColor': this._strokeColor
    };
    if (this._id) {
        rv.id = this._id;
    }
    return rv;
};

Polygon.prototype.compareCoords = function compareCoords(json) {

    var selfJson = this.toJson(),
        match = true;
    if (json.type !== selfJson.type) {
        return false;
    }
    return json.points === selfJson.points;
};

// Useful for pasting json with an offset
Polygon.prototype.offsetCoords = function offsetCoords(json, dx, dy) {
    json.points = json.points.split(" ").map(function(xy){
        return xy.split(",").map(function(c, i){
            return parseFloat(c, 10) + [dx, dy][i]
        }).join(",")
    }).join(" ");
    return json;
};

// Shift this shape by dx and dy
Polygon.prototype.offsetShape = function offsetShape(dx, dy) {
    // Offset all coords in points string "229,171 195,214 195,265 233,33"
    var points = this._points.split(" ").map(function(xy){
        return xy.split(",").map(function(c, i){
            return parseFloat(c, 10) + [dx, dy][i]
        }).join(",")
    }).join(" ");
    this._points = points;
    this.drawShape();
};

// handle start of drag by selecting this shape
// if not already selected
Polygon.prototype._handleMousedown = function _handleMousedown() {
    if (!this._selected) {
        this.manager.selectShapes([this]);
    }
};

Polygon.prototype.setColor = function setColor(strokeColor) {
    this._strokeColor = strokeColor;
    this.drawShape();
};

Polygon.prototype.getStrokeColor = function getStrokeColor() {
    return this._strokeColor;
};

Polygon.prototype.setStrokeColor = function setStrokeColor(strokeColor) {
    this._strokeColor = strokeColor;
    this.drawShape();
};

Polygon.prototype.setStrokeWidth = function setStrokeWidth(strokeWidth) {
    this._strokeWidth = strokeWidth;
    this.drawShape();
};

Polygon.prototype.getStrokeWidth = function getStrokeWidth() {
    return this._strokeWidth;
};

Polygon.prototype.destroy = function destroy() {
    console.trace('destroy?');
    this.element.remove();
    // this.handles.remove();
};

Polygon.prototype.intersectRegion = function intersectRegion(region) {

    var bbox = this.element.getBBox();
    if (bbox.x > (region.x + region.width) ||
        bbox.y > (region.y + region.height) ||
        (bbox.x + bbox.width) < region.x ||
        (bbox.y + bbox.height < region.y)) {
        return false;
    }
    return true;
};

Polygon.prototype.getPath = function getPath() {
    // Convert points string "229,171 195,214 195,265 233,33"
    // to Raphael path "M229,171L195,214L195,265L233,33Z"
    // Handles scaling by zoomFraction
    var f = this._zoomFraction;
    var path = this._points.split(" ").map(function(xy){
        return xy.split(",").map(function(c){return parseInt(c, 10) * f}).join(",");
    }).join("L");
    path = "M" + path + "Z";
    return path;
};

Polygon.prototype.isSelected = function isSelected() {
    return this._selected;
};

Polygon.prototype.setZoom = function setZoom(zoom) {
    this._zoomFraction = zoom / 100;
    this.drawShape();
};

Polygon.prototype.updateHandle = function updateHandle(handleIndex, x, y, shiftKey) {
    var coords = this._points.split(" ");
    coords[handleIndex] = x + "," + y;
    this._points = coords.join(" ");
};

Polygon.prototype.drawShape = function drawShape() {

    var strokeColor = this._strokeColor,
        strokeW = this._strokeWidth * this._zoomFraction;

    var f = this._zoomFraction;
    var path = this.getPath();

    this.element.attr({'path': path,
                       'stroke': strokeColor,
                       'stroke-width': strokeW});
    // this.element.transform('r'+ this._rotation);

    if (this.isSelected()) {
        this.element.toFront();
        this.handles.show().toFront();
    } else {
        this.handles.hide();
    }

    // handles have been updated (model coords)
    var hnd, hx, hy;
    this._points.split(" ").forEach(function(xy, i){
        var xy = xy.split(",");
        hx = parseInt(xy[0]) * this._zoomFraction;
        hy = parseInt(xy[1]) * this._zoomFraction;
        hnd = this.handles[i];
        hnd.attr({'x':hx-this.handle_wh/2, 'y':hy-this.handle_wh/2});
    }.bind(this));
};

Polygon.prototype.setSelected = function setSelected(selected) {
    this._selected = !!selected;
    this.drawShape();
};


Polygon.prototype.createHandles = function createHandles() {
    // ---- Create Handles -----

    // NB: handleIds are used to calculate coords
    // so handledIds are scaled to MODEL coords, not zoomed.

    var self = this,
        // map of centre-points for each handle
        handleAttrs = {'stroke': '#4b80f9',
                        'fill': '#fff',
                        'cursor': 'move',
                        'fill-opacity': 1.0};

    // draw handles
    self.handles = this.paper.set();
    var _handle_drag = function() {
        return function (dx, dy, mouseX, mouseY, event) {
            dx = dx / self._zoomFraction;
            dy = dy / self._zoomFraction;
            // on DRAG...
            var absX = dx + this.ox,
                absY = dy + this.oy;
            self.updateHandle(this.h_id, absX, absY, event.shiftKey);
            self.drawShape();
            return false;
        };
    };
    var _handle_drag_start = function() {
        return function () {
            // START drag: simply note the location we started
            // we scale by zoom to get the 'model' coordinates
            this.ox = (this.attr("x") + this.attr('width')/2) / self._zoomFraction;
            this.oy = (this.attr("y") + this.attr('height')/2) / self._zoomFraction;
            return false;
        };
    };
    var _handle_drag_end = function() {
        return function() {
            // simply notify manager that shape has changed
            self.manager.notifyShapesChanged([self]);
            return false;
        };
    };

    var hsize = this.handle_wh,
        hx, hy, handle;
    this._points.split(" ").forEach(function(xy, i){
        var xy = xy.split(",");
        hx = parseInt(xy[0]);
        hy = parseInt(xy[1]);

        handle = self.paper.rect(hx-hsize/2, hy-hsize/2, hsize, hsize);
        handle.attr({'cursor': 'move'});
        handle.h_id = i;
        // handle.line = self;

        if (self.manager.canEdit) {
            handle.drag(
                _handle_drag(),
                _handle_drag_start(),
                _handle_drag_end()
            );
        }
        self.handles.push(handle);
    });

    self.handles.attr(handleAttrs).hide();     // show on selection
};


// Class for creating Lines.
var CreatePolygon = function CreatePolygon(options) {

    this.paper = options.paper;
    this.manager = options.manager;

    // Keep track of points during Polygon creation
    this.pointsList = [];
};

// TODO - Implement Polygon creation!

CreatePolygon.prototype.startDrag = function startDrag(startX, startY) {

};

CreatePolygon.prototype.drag = function drag(dragX, dragY, shiftKey) {

};

CreatePolygon.prototype.stopDrag = function stopDrag() {

};
