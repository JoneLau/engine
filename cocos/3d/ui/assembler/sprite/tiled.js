/****************************************************************************
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

// const js = require('../../../../../platform/js');
// const assembler = require('../2d/tiled');
// const vec3 = cc.vmath.vec3;
import * as js from '../../../core/utils/js';
import { vec3, mat4 } from '../../../core/vmath/index';
import RenderData from '../../../3d/ui/renderData';

let vec3_temps = [];
for (let i = 0; i < 4; i++) {
    vec3_temps.push(vec3.create());
}

let matrix = mat4.create();

export default class Tiled {
    static type = 'tiled';

    static vertexOffset = 6;
    static uvOffset = 3;
    static colorOffset = 5;

    static createData(comp) {
        let renderData = RenderData.add();
        comp._renderData = renderData.data;
        comp._renderDataPoolID = renderData.pooID;
        renderData = comp._renderData;
        return renderData;
    }

    static removeData(comp) {
        if (comp._renderData) {
            RenderData.remove(comp._renderDataPoolID);
            comp._renderDataPoolID = -1;
            comp._renderData = null;
        }
    }

    static updateRenderData(comp) {
        let frame = comp.spriteFrame;

        // TODO: Material API design and export from editor could affect the material activation process
        // need to update the logic here
        // if (frame) {
        //     if (!frame._original && dynamicAtlasManager) {
        //         dynamicAtlasManager.insertSpriteFrame(frame);
        //     }
        //     if (sprite._material._texture !== frame._texture) {
        //         sprite._activateMaterial();
        //     }
        // }

        let renderData = comp._renderData;
        if (!frame || !renderData ||
            !(renderData.uvDirty || renderData.vertDirty))
            return;

        let /*node = comp.node,*/
            // contentWidth = Math.abs(comp.width),
            // contentHeight = Math.abs(comp.height),
            contentWidth = Math.abs(comp.size.width),
            contentHeight = Math.abs(comp.size.height),
            appx = comp.anchor.x * contentWidth,
            appy = comp.anchor.y * contentHeight;

        let rect = frame._rect,
            rectWidth = rect.width,
            rectHeight = rect.height,
            hRepeat = contentWidth / rectWidth,
            vRepeat = contentHeight / rectHeight,
            row = Math.ceil(vRepeat),
            col = Math.ceil(hRepeat);

        let data = renderData._data;
        renderData.dataLength = Math.max(8, row + 1, col + 1);

        for (let i = 0; i <= col; ++i) {
            data[i].x = Math.min(rectWidth * i, contentWidth) - appx;
        }
        for (let i = 0; i <= row; ++i) {
            data[i].y = Math.min(rectHeight * i, contentHeight) - appy;
        }

        // update data property
        renderData.vertexCount = row * col * 4;
        renderData.indiceCount = row * col * 6;
        renderData.uvDirty = false;
        renderData.vertDirty = false;
    }

    static fillVertices(vbuf, vertexOffset, matrix, row, col, data) {
        let x, x1, y, y1;
        for (let yindex = 0, ylength = row; yindex < ylength; ++yindex) {
            y = data[yindex].y;
            y1 = data[yindex + 1].y;
            for (let xindex = 0, xlength = col; xindex < xlength; ++xindex) {
                x = data[xindex].x;
                x1 = data[xindex + 1].x;

                vec3.set(vec3_temps[0], x, y, 0);
                vec3.set(vec3_temps[1], x1, y, 0);
                vec3.set(vec3_temps[2], x, y1, 0);
                vec3.set(vec3_temps[3], x1, y1, 0);

                for (let i = 0; i < 4; i++) {
                    let vec3_temp = vec3_temps[i];
                    vec3.transformMat4(vec3_temp, vec3_temp, matrix);
                    let offset = i * 6;
                    vbuf[vertexOffset + offset] = vec3_temp.x;
                    vbuf[vertexOffset + offset + 1] = vec3_temp.y;
                    vbuf[vertexOffset + offset + 2] = vec3_temp.z;
                }

                vertexOffset += 24;
            }
        }
    }

    static fillBuffers(comp, buffer) {
        let node = comp.node,
            color = comp._color._val,
            renderData = comp._renderData,
            data = renderData._data;

        // buffer
        let /*buffer = renderer._buffer,*/
            vertexOffset = buffer.byteOffset >> 2,
            indiceOffset = buffer.indiceOffset,
            vertexId = buffer.vertexOffset;

        buffer.request(renderData.vertexCount, renderData.indiceCount);

        // buffer data may be realloc, need get reference after request.
        let vbuf = buffer._vData,
            uintbuf = buffer._uintVData,
            ibuf = buffer._iData;

        let rotated = comp.spriteFrame._rotated;
        let uv = comp.spriteFrame.uv;
        let rect = comp.spriteFrame._rect;
        // let contentWidth = Math.abs(comp.width);
        // let contentHeight = Math.abs(comp.height);
        let contentWidth = Math.abs(comp.size.width);
        let contentHeight = Math.abs(comp.size.height);
        let hRepeat = contentWidth / rect.width;
        let vRepeat = contentHeight / rect.height;
        let row = Math.ceil(vRepeat),
            col = Math.ceil(hRepeat);

        node.getWorldMatrix(matrix);

        this.fillVertices(vbuf, vertexOffset, matrix, row, col, data);

        let offset = this.vertexOffset, uvOffset = this.uvOffset, colorOffset = this.colorOffset;
        let offset1 = offset, offset2 = offset * 2, offset3 = offset * 3, offset4 = offset * 4;
        let coefu, coefv;
        for (let yindex = 0, ylength = row; yindex < ylength; ++yindex) {
            coefv = Math.min(1, vRepeat - yindex);
            for (let xindex = 0, xlength = col; xindex < xlength; ++xindex) {
                coefu = Math.min(1, hRepeat - xindex);

                let vertexOffsetU = vertexOffset + uvOffset;
                let vertexOffsetV = vertexOffsetU + 1;
                // UV
                if (rotated) {
                    // lb
                    vbuf[vertexOffsetU] = uv[0];
                    vbuf[vertexOffsetV] = uv[1];
                    // rb
                    vbuf[vertexOffsetU + offset1] = uv[0];
                    vbuf[vertexOffsetV + offset1] = uv[1] + (uv[7] - uv[1]) * coefu;
                    // lt
                    vbuf[vertexOffsetU + offset2] = uv[0] + (uv[6] - uv[0]) * coefv;
                    vbuf[vertexOffsetV + offset2] = uv[1];
                    // rt
                    vbuf[vertexOffsetU + offset3] = vbuf[vertexOffsetU + offset2];
                    vbuf[vertexOffsetV + offset3] = vbuf[vertexOffsetV + offset1];
                }
                else {
                    // lb
                    vbuf[vertexOffsetU] = uv[0];
                    vbuf[vertexOffsetV] = uv[1];
                    // rb
                    vbuf[vertexOffsetU + offset1] = uv[0] + (uv[6] - uv[0]) * coefu;
                    vbuf[vertexOffsetV + offset1] = uv[1];
                    // lt
                    vbuf[vertexOffsetU + offset2] = uv[0];
                    vbuf[vertexOffsetV + offset2] = uv[1] + (uv[7] - uv[1]) * coefv;
                    // rt
                    vbuf[vertexOffsetU + offset3] = vbuf[vertexOffsetU + offset1];
                    vbuf[vertexOffsetV + offset3] = vbuf[vertexOffsetV + offset2];
                }
                // color
                uintbuf[vertexOffset + colorOffset] = color;
                uintbuf[vertexOffset + colorOffset + offset1] = color;
                uintbuf[vertexOffset + colorOffset + offset2] = color;
                uintbuf[vertexOffset + colorOffset + offset3] = color;
                vertexOffset += offset4;
            }
        }

        // update indices
        let length = renderData.indiceCount;
        for (let i = 0; i < length; i += 6) {
            ibuf[indiceOffset++] = vertexId;
            ibuf[indiceOffset++] = vertexId + 1;
            ibuf[indiceOffset++] = vertexId + 2;
            ibuf[indiceOffset++] = vertexId + 1;
            ibuf[indiceOffset++] = vertexId + 3;
            ibuf[indiceOffset++] = vertexId + 2;
            vertexId += 4;
        }
    }
}

