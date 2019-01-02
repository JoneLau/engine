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

import * as js from '../../../core/utils/js';
import { vec3, mat4 } from '../../../core/vmath/index';
import RenderData from '../../../3d/ui/renderData';

let vec3_temps = [];
for (let i = 0; i < 4; i++) {
    vec3_temps.push(vec3.create());
}
let matrix = mat4.create();

export default class Simple {
    static type = 'Simple';

    static createData(comp) {
        let renderData = RenderData.add();
        comp._renderData = renderData.data;
        comp._renderDataPoolID = renderData.pooID;
        renderData = comp._renderData;

        renderData.dataLength = 4;
        renderData.vertexCount = 4;
        renderData.indiceCount = 6;
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
        let frame = comp._spriteFrame;

        // TODO: Material API design and export from editor could affect the material activation process
        // need to update the logic here
        // if (frame) {
        //     if (!frame._original && dynamicAtlasManager) {
        //         dynamicAtlasManager.insertSpriteFrame(frame);
        //     }
        //     if (comp.material._texture !== frame._texture) {
        //         sprite._activateMaterial();
        //     }
        // }

        let renderData = comp._renderData;
        if (renderData && frame) {
            if (renderData.vertDirty) {
                this.updateVerts(comp);
            }
        }
    }

    static updateVerts(comp) {
        let renderData = comp._renderData,
            node = comp.node,
            data = renderData._data,
            // TODO: hack
            cw = comp.size.width, ch = comp.size.width,
            appx = comp.anchor.x * cw, appy = comp.anchor.y * ch,
            l, b, r, t;
        if (comp.trim) {
            l = -appx;
            b = -appy;
            r = cw - appx;
            t = ch - appy;
        }
        else {
            let frame = comp.spriteFrame,
                ow = frame._originalSize.width, oh = frame._originalSize.height,
                rw = frame._rect.width, rh = frame._rect.height,
                offset = frame._offset,
                scaleX = cw / ow, scaleY = ch / oh;
            let trimLeft = offset.x + (ow - rw) / 2;
            let trimRight = offset.x - (ow - rw) / 2;
            let trimBottom = offset.y + (oh - rh) / 2;
            let trimTop = offset.y - (oh - rh) / 2;
            l = trimLeft * scaleX - appx;
            b = trimBottom * scaleY - appy;
            r = cw + trimRight * scaleX - appx;
            t = ch + trimTop * scaleY - appy;
        }

        data[0].x = l;
        data[0].y = b;
        // data[1].x = r;
        // data[1].y = b;
        // data[2].x = l;
        // data[2].y = t;
        data[3].x = r;
        data[3].y = t;

        renderData.vertDirty = false;
    }

    static fillBuffers(comp, buffer) {
        if (!comp.spriteFrame || !comp._renderData) {
            return
        }

        let data = comp._renderData._data,
            color = comp._color._val;

        let vertexOffset = buffer.byteOffset >> 2,
            indiceOffset = buffer.indiceOffset,
            vertexId = buffer.vertexOffset;

        buffer.request(4, 6);

        // buffer data may be realloc, need get reference after request.
        let vbuf = buffer._vData,
            uintbuf = buffer._uintVData,
            ibuf = buffer._iData;

        let data0 = data[0], data3 = data[3];
        vec3.set(vec3_temps[0], data0.x, data0.y, 0);
        vec3.set(vec3_temps[1], data3.x, data0.y, 0);
        vec3.set(vec3_temps[2], data0.x, data3.y, 0);
        vec3.set(vec3_temps[3], data3.x, data3.y, 0);

        comp.node.getWorldMatrix(matrix);
        // get uv from sprite frame directly
        let uv = comp._spriteFrame.uv;
        for (let i = 0; i < 4; i++) {
            // vertex
            let vertex = vec3_temps[i];
            vec3.transformMat4(vertex, vertex, matrix);

            vbuf[vertexOffset++] = vertex.x;
            vbuf[vertexOffset++] = vertex.y;
            vbuf[vertexOffset++] = vertex.z;

            // uv
            let uvOffset = i * 2;
            vbuf[vertexOffset++] = uv[0 + uvOffset];
            vbuf[vertexOffset++] = uv[1 + uvOffset];

            // color
            uintbuf[vertexOffset++] = color;
        }

        // fill indice data
        ibuf[indiceOffset++] = vertexId;
        ibuf[indiceOffset++] = vertexId + 1;
        ibuf[indiceOffset++] = vertexId + 2;
        ibuf[indiceOffset++] = vertexId + 1;
        ibuf[indiceOffset++] = vertexId + 3;
        ibuf[indiceOffset++] = vertexId + 2;
    }
}

