/*
 * Copyright (c) 2014 Gloey Apps
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @author: Hein Rutjes (IjzerenHein)
 * @license MIT
 * @copyright Gloey Apps, 2014
 */

/*jslint browser:true, nomen:true, vars:true, plusplus:true*/
/*global define*/

define(function(require, exports, module) {
    'use strict';

    // import dependencies
    var Engine = require('famous/core/Engine');
    var CanvasSurface = require('famous/surfaces/CanvasSurface');
    var View = require('famous/core/View');

    /**
     * @class Lagometer
     * @extends View
     * @constructor
     * @param {Object} [options] Configuration options
     */
    function Lagometer(options) {
        View.apply(this, arguments);

        // Create sample-buffer
        this.samples = [];
        this.sampleIndex = 0;
        this.Samples = this.options.size[0];

        // Install render-handlers
        Engine.on('prerender', this._onEngineRender.bind(this, true));
        Engine.on('postrender', this._onEngineRender.bind(this, false));

        // Create drawing canvas
        this.canvas = new CanvasSurface();
        this.add(this.canvas);
    }
    Lagometer.prototype = Object.create(View.prototype);
    Lagometer.prototype.constructor = Lagometer;

    Lagometer.DEFAULT_OPTIONS = {
        size: [100, 100],
        min: 0,
        max: 34,
        backgroundColor: 'rgba(200, 0, 0, 0.8)',
        borderColor: 'rgba(255, 0, 0, 0.8)',
        textColor: 'rgba(255, 255, 255, 0.8)',
        font: '28px Arial',
        frameColor: '#00FF00',
        scriptColor: '#BBBBFF'
    };

    /**
     * @method _onEngineRender
     */
    Lagometer.prototype._onEngineRender = function(pre) {
        var currentTime = Date.now();
        if (pre) {

            // Determine the time that was spent between two 'animation-frames'
            if (this.lastTime !== undefined) {
                this.frameTime = currentTime - this.lastTime;
                if (this.maxFrameTime === undefined) {
                    this.maxFrameTime = this.frameTime;
                }
                this.maxFrameTime = Math.max(this.frameTime, this.maxFrameTime);
                if (this.minFrameTime === undefined) {
                    this.minFrameTime = this.frameTime;
                }
                this.minFrameTime = Math.min(this.frameTime, this.minFrameTime);
            }
            this.lastTime = currentTime;

        } else if (this.frameTime !== undefined) {

            // Determine the time that was spent in the script
            this.scriptTime = currentTime - this.lastTime;
            if (this.maxScriptTime === undefined) {
                this.maxScriptTime = this.scriptTime;
            }
            this.maxScriptTime = Math.max(this.scriptTime, this.maxScriptTime);
            if (this.minScriptTime === undefined) {
                this.minScriptTime = this.scriptTime;
            }
            this.minScriptTime = Math.min(this.scriptTime, this.minScriptTime);

            // Create sample
            var sample = {
                lastTime: this.lastTime,
                frameTime: this.frameTime,
                scriptTime: this.scriptTime
            };
            var maxSamples = this.options.size[0] * 2;
            if (this.samples.length < maxSamples) {
                this.sampleIndex = this.samples.length;
                this.samples.push(sample);
            }
            else {
                this.sampleIndex = (this.sampleIndex + 1) % maxSamples;
                this.samples[this.sampleIndex] = sample;
            }
        }
    };

    /**
     * @method _drawSamples
     */
    Lagometer.prototype._drawSamples = function(draw) {

        draw.context.beginPath();
        var i;
        var bufferIndex = draw.index;
        var size = draw.size;
        var yScale =  size[1] / (draw.max - draw.min);
        for (i = 0; i < draw.buffer.length; i++) {
            var x = size[0] - i;
            var sample = draw.buffer[bufferIndex][draw.property];
            var y = size[1] - ((sample - draw.min) * yScale);
            if (i === 0) {
                draw.context.moveTo(x, y);
            }
            else {
                draw.context.lineTo(x, y);
            }
            bufferIndex--;
            if (bufferIndex < 0) {
                bufferIndex = draw.buffer.length - 1;
                }
        }
        draw.context.lineWidth = 1;
        draw.context.strokeStyle = draw.color;
        draw.context.stroke();
    };

    /**
     * @method _getFPS
     */
    Lagometer.prototype._getFPS = function(count) {
        count = Math.min(count, this.samples.length);
        var bufferIndex = this.sampleIndex;
        var i;
        var fps = 0;
        for (i = 0; i < count; i++) {
            var sample = this.samples[bufferIndex];
            fps += sample.frameTime;
            bufferIndex--;
            if (bufferIndex < 0) {
                bufferIndex = this.samples.length - 1;
            }
        }
        return 1000 / (fps / count);
    };

    /**
     * Renders the view.
     *
     * @method render
     * @private
     * @ignore
     */
    Lagometer.prototype.render = function render() {
        var context = this.canvas.getContext('2d');
        var size = this.getSize();
        var canvasSize = [size[0] * 2, size[1] * 2];
        this.canvas.setSize(size, canvasSize);

        // Clear background
        context.clearRect(0, 0, canvasSize[0], canvasSize[1]);
        context.fillStyle = this.options.backgroundColor;
        context.fillRect(0, 0, canvasSize[0], canvasSize[1]);
        context.lineWidth = 1;
        context.strokeStyle = this.options.borderColor;
        context.strokeRect(0, 0, canvasSize[0], canvasSize[1]);

        // Calculate min/max
        var min = this.options.min;
        var max = this.options.max;
        //var min = Math.min(this.minFrameTime, this.minScriptTime);
        //var max = Math.max(this.maxFrameTime, this.maxScriptTime);
        /*var range = max - min;
        var i;
        if (this.samples.length) {
            min = this.samples[0].frameTime;
            max = this.samples[0].frameTime;
            for (i = 0; i < this.samples.length; i++) {
                min = Math.min(min, this.samples[i].frameTime);
                max = Math.max(max, this.samples[i].frameTime);
            }
            min = 0;
        }*/

        // Prepare text drawing
        context.fillStyle = this.options.textColor;
        context.font = this.options.font;

        // Draw fps (calculated over last 20 frames)
        var fps = Math.round(this._getFPS(20));
        context.fillText(fps + ' fps', canvasSize[0] - 84, 26);

        // Draw frame-times
        this._drawSamples({
            context: context,
            size: canvasSize,
            buffer: this.samples,
            index: this.sampleIndex,
            min: min,
            max: max,
            property: 'frameTime',
            color: this.options.frameColor
        });

        // Draw script-times
        this._drawSamples({
            context: context,
            size: canvasSize,
            buffer: this.samples,
            index: this.sampleIndex,
            min: min,
            max: max,
            property: 'scriptTime',
            color: this.options.scriptColor
        });

        // Call super
        return this._node.render();
    };

    module.exports = Lagometer;
});
