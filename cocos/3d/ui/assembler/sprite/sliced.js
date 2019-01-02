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
// const assembler = require('../2d/sliced');
import * as js from '../../../core/utils/js';
import { vec3, mat4 } from '../../../core/vmath/index';
import RenderData from '../../../3d/ui/renderData';

let vec3_temp = vec3.create();
let matrix = mat4.create();

export default class Sliced {
    static type = 'Sliced';

    static createData(comp) {
        let renderData = RenderData.add();
        comp._renderData = renderData.data;
        comp._renderDataPoolID = renderData.pooID;
        renderData = comp._renderData;
        // 0-4 for local verts
        // 5-20 for world verts
        renderData.dataLength = 20;

        renderData.vertexCount = 16;
        renderData.indiceCount = 54;
        return renderData;
    }

    static removeData(comp) {
        if (comp._renderData) {
            RenderData.remove(comp._renderDataPoolID);
            comp._renderDataPoolID = -1;
            comp._renderData = null;
        }
    }

    static updateRenderData(comp, batchData) {
        let frame = comp.spriteFrame;

        // TODO: Material API design and export from editor could affect the material activation process
        // need to update the logic here
        // if (frame) {
        //     if (!frame._original && dynamicAtlasManager) {
        //         dynamicAtlasManager.insertSpriteFrame(frame);
        //     }
        //     if (comp._material._texture !== frame._texture) {
        //         comp._activateMaterial();
        //     }
        // }

        let renderData = comp._renderData;
        if (renderData && frame) {
            let vertDirty = renderData.vertDirty;
            if (vertDirty) {
                this.updateVerts(comp);
                this.updateWorldVerts(comp);
            }
        }
    }

    static updateVerts(comp) {
        let renderData = comp._renderData,
            data = renderData._data,
            // node = comp.node,
            // TODO: hack
            width = comp.size.width, height = comp.size.height,
            appx = comp.anchor.x * width, appy = comp.anchor.y * height;

        let frame = comp.spriteFrame;
        let leftWidth = frame.insetLeft;
        let rightWidth = frame.insetRight;
        let topHeight = frame.insetTop;
        let bottomHeight = frame.insetBottom;

        let sizableWidth = width - leftWidth - rightWidth;
        let sizableHeight = height - topHeight - bottomHeight;
        let xScale = width / (leftWidth + rightWidth);
        let yScale = height / (topHeight + bottomHeight);
        xScale = (isNaN(xScale) || xScale > 1) ? 1 : xScale;
        yScale = (isNaN(yScale) || yScale > 1) ? 1 : yScale;
        sizableWidth = sizableWidth < 0 ? 0 : sizableWidth;
        sizableHeight = sizableHeight < 0 ? 0 : sizableHeight;

        data[0].x = -appx;
        data[0].y = -appy;
        data[1].x = leftWidth * xScale - appx;
        data[1].y = bottomHeight * yScale - appy;
        data[2].x = data[1].x + sizableWidth;
        data[2].y = data[1].y + sizableHeight;
        data[3].x = width - appx;
        data[3].y = height - appy;

        renderData.vertDirty = false;
    }

    static fillBuffers(comp, buffer) {
        if (!comp.spriteFrame || !comp._renderData) {
            return
        }
        // if (renderer.worldMatDirty) {
        this.updateWorldVerts(comp);
        // }

        let renderData = comp._renderData,
            color = comp._color._val,
            data = renderData._data;

        let vertexOffset = buffer.byteOffset >> 2,
            vertexCount = renderData.vertexCount,
            indiceOffset = buffer.indiceOffset,
            vertexId = buffer.vertexOffset;

        let uvSliced = comp.spriteFrame.uvSliced;

        buffer.request(vertexCount, renderData.indiceCount);

        // buffer data may be realloc, need get reference after request.
        let vbuf = buffer._vData,
            uintbuf = buffer._uintVData,
            ibuf = buffer._iData;

        for (let i = 4; i < 20; ++i) {
            let vert = data[i];
            let uvs = uvSliced[i - 4];

            vbuf[vertexOffset++] = vert.x;
            vbuf[vertexOffset++] = vert.y;
            vbuf[vertexOffset++] = vert.z;
            vbuf[vertexOffset++] = uvs.u;
            vbuf[vertexOffset++] = uvs.v;
            uintbuf[vertexOffset++] = color;
        }

        for (let r = 0; r < 3; ++r) {
            for (let c = 0; c < 3; ++c) {
                let start = vertexId + r * 4 + c;
                ibuf[indiceOffset++] = start;
                ibuf[indiceOffset++] = start + 1;
                ibuf[indiceOffset++] = start + 4;
                ibuf[indiceOffset++] = start + 1;
                ibuf[indiceOffset++] = start + 5;
                ibuf[indiceOffset++] = start + 4;
            }
        }
    }

    static updateWorldVerts(comp) {
        let data = comp._renderData._data;

        comp.node.getWorldMatrix(matrix);
        for (let row = 0; row < 4; ++row) {
            let rowD = data[row];
            for (let col = 0; col < 4; ++col) {
                let colD = data[col];
                let world = data[4 + row * 4 + col];

                vec3.set(vec3_temp, colD.x, rowD.y, 0);
                vec3.transformMat4(world, vec3_temp, matrix);
            }
        }
    }
}
